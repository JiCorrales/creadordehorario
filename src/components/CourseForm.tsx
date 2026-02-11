import React, { useState, useEffect } from 'react';
import { Course, CourseStatus, CourseSession } from '../types';
import { generateId, DAYS, STATUSES, PREDEFINED_COLORS, DEFAULT_COURSE_COLOR, isValidHex, hexToRgb } from '../utils';
import { PlusCircle, Clock, MapPin, Save, X, Edit, Palette, ChevronDown, ChevronUp, Check } from 'lucide-react';
import TimeInput from './TimeInput';

interface CourseFormProps {
  onAddCourse: (course: Course) => void;
  onUpdateCourse: (course: Course) => void;
  onCancelEdit: () => void;
  courseToEdit?: Course | null;
}

const CourseForm: React.FC<CourseFormProps> = ({
  onAddCourse,
  onUpdateCourse,
  onCancelEdit,
  courseToEdit
}) => {
  const [name, setName] = useState('');
  const [campus, setCampus] = useState('');
  const [group, setGroup] = useState('');
  const [professor, setProfessor] = useState('');
  const [credits, setCredits] = useState(0);
  const [quota, setQuota] = useState(0);
  const [reserved, setReserved] = useState(false);
  const [status, setStatus] = useState<CourseStatus>('Presencial');
  const [color, setColor] = useState(DEFAULT_COURSE_COLOR);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [rgb, setRgb] = useState({ r: 0, g: 102, b: 204 }); // Default blue RGB

  const [frequency, setFrequency] = useState<number>(1);
  const [sessions, setSessions] = useState<Omit<CourseSession, 'id'>[]>([
    { day: 'Lunes', startTime: '', endTime: '', classroom: '' }
  ]);

  // Load course data when editing
  useEffect(() => {
    if (courseToEdit) {
      setName(courseToEdit.name);
      setCampus(courseToEdit.campus);
      setGroup(courseToEdit.group);
      setProfessor(courseToEdit.professor);
      setCredits(courseToEdit.credits || 0);
      setQuota(courseToEdit.quota);
      setReserved(courseToEdit.reserved);
      setStatus(courseToEdit.status);

      const courseColor = courseToEdit.color || DEFAULT_COURSE_COLOR;
      setColor(courseColor);
      const rgbVal = hexToRgb(courseColor);
      if (rgbVal) setRgb(rgbVal);

      const sessionCount = courseToEdit.sessions.length;
      setFrequency(sessionCount);

      // Clean up session IDs for the form state
      setSessions(courseToEdit.sessions.map(({ day, startTime, endTime, classroom }) => ({
        day, startTime, endTime, classroom
      })));
    } else {
      resetForm();
    }
  }, [courseToEdit]);

  // Update RGB when color changes (only if it's a valid hex)
  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    if (isValidHex(newColor)) {
      const rgbVal = hexToRgb(newColor);
      if (rgbVal) setRgb(rgbVal);
    }
  };

  // Update Hex when RGB changes
  const handleRgbChange = (field: 'r' | 'g' | 'b', value: string) => {
    const numValue = Math.min(255, Math.max(0, parseInt(value) || 0));
    const newRgb = { ...rgb, [field]: numValue };
    setRgb(newRgb);

    const toHex = (n: number) => {
      const hex = n.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    setColor(`#${toHex(newRgb.r)}${toHex(newRgb.g)}${toHex(newRgb.b)}`.toUpperCase());
  };

  // Adjust sessions when frequency changes
  useEffect(() => {
    setSessions(prev => {
        if (prev.length === frequency) return prev;

        if (prev.length < frequency) {
            // Add needed sessions
            const countToAdd = frequency - prev.length;
            const newSessions = [...prev];
            for (let i = 0; i < countToAdd; i++) {
                newSessions.push({ day: 'Lunes', startTime: '', endTime: '', classroom: '' });
            }
            return newSessions;
        } else {
            // Remove extra sessions
            return prev.slice(0, frequency);
        }
    });
  }, [frequency]);

  const resetForm = () => {
    setName('');
    setCampus('');
    setGroup('');
    setProfessor('');
    setCredits(0);
    setQuota(0);
    setReserved(false);
    setStatus('Presencial');
    setColor(DEFAULT_COURSE_COLOR);
    const rgbVal = hexToRgb(DEFAULT_COURSE_COLOR);
    if (rgbVal) setRgb(rgbVal);
    setShowColorPicker(false);
    setFrequency(1);
    setSessions([{ day: 'Lunes', startTime: '', endTime: '', classroom: '' }]);
  };

  const handleSessionChange = (index: number, field: keyof Omit<CourseSession, 'id'>, value: string) => {
    const newSessions = [...sessions];
    newSessions[index] = { ...newSessions[index], [field]: value };

    // If start time changes, validate end time
    if (field === 'startTime') {
        const currentEnd = newSessions[index].endTime;
        if (currentEnd) {
            const startMinutes = parseInt(value.split(':')[0]) * 60 + parseInt(value.split(':')[1]);
            const endMinutes = parseInt(currentEnd.split(':')[0]) * 60 + parseInt(currentEnd.split(':')[1]);

            if (startMinutes >= endMinutes) {
                // If new start time is after end time, we could reset end time or just let validation show error
                // Let's let the validation show error, as auto-changing might be annoying if user is about to change end time too
            }
        }
    }

    setSessions(newSessions);
  };

  const getSessionError = (index: number) => {
      const session = sessions[index];
      if (!session.startTime || !session.endTime) return undefined;

      const start = parseInt(session.startTime.replace(':', ''));
      const end = parseInt(session.endTime.replace(':', ''));

      if (start >= end) {
          return "La hora de fin debe ser mayor a la de inicio";
      }
      return undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Create new sessions with IDs (reuse existing IDs if editing? better to regenerate or keep?)
    // If editing, we should try to keep IDs if possible, but sessions structure might have changed.
    // For simplicity, let's regenerate session IDs or map them.

    let finalSessions: CourseSession[];

    if (courseToEdit) {
        // Try to preserve IDs for existing indices
        finalSessions = sessions.map((s, i) => ({
            ...s,
            id: courseToEdit.sessions[i]?.id || generateId()
        }));
    } else {
        finalSessions = sessions.map(s => ({ ...s, id: generateId() }));
    }

    const courseData: Course = {
      id: courseToEdit ? courseToEdit.id : generateId(),
      name,
      campus,
      group,
      professor,
      credits,
      quota,
      reserved,
      status,
      color: isValidHex(color) ? color : DEFAULT_COURSE_COLOR,
      isScheduled: courseToEdit ? courseToEdit.isScheduled : false, // Keep scheduled status if editing
      sessions: finalSessions
    };

    if (courseToEdit) {
        onUpdateCourse(courseData);
    } else {
        onAddCourse(courseData);
        resetForm();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6 border-t-4 border-blue-600 dark:border-blue-500 transition-colors duration-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          {courseToEdit ? <Edit className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
          {courseToEdit ? 'Editar Curso' : 'Agregar Nuevo Curso'}
        </h2>
        {courseToEdit && (
            <button
                type="button"
                onClick={onCancelEdit}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Cancelar Edición"
            >
                <X className="w-5 h-5" />
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* General Info */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Curso</label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Ej. Cálculo I"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sede</label>
          <input
            type="text"
            value={campus}
            onChange={e => setCampus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Ej. Cartago"
          />
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profesor(es)</label>
          <input
            type="text"
            value={professor}
            onChange={e => setProfessor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Nombre del profesor"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grupo</label>
          <input
            type="text"
            value={group}
            onChange={e => setGroup(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Ej. 01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cupo</label>
          <input
            type="number"
            value={quota}
            onChange={e => setQuota(parseInt(e.target.value) || 0)}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Créditos</label>
          <input
            type="number"
            value={credits}
            onChange={e => setCredits(parseInt(e.target.value) || 0)}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as CourseStatus)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white custom-select"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center mt-6">
          <input
            type="checkbox"
            id="reserved"
            checked={reserved}
            onChange={e => setReserved(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-offset-gray-800"
          />
          <label htmlFor="reserved" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
            Reservado
          </label>
        </div>
      </div>

      {/* Color Selection */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
        <button
          type="button"
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none"
        >
          <Palette className="w-4 h-4" />
          Cambiar color del curso
          {showColorPicker ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <div
            className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 ml-2"
            style={{ backgroundColor: color }}
            title="Color actual"
          ></div>
        </button>

        {showColorPicker && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Palette */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                  Paleta de Colores
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {PREDEFINED_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleColorChange(c)}
                      className={`w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform hover:scale-110 flex items-center justify-center ${
                        color === c ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' : ''
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    >
                      {color === c && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Color Inputs & Preview */}
              <div className="space-y-4">
                <div>
                   <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                    Personalizar
                  </label>
                  <div className="flex gap-4 items-center">
                    {/* Preview */}
                    <div
                        className="w-16 h-16 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 flex-shrink-0 transition-colors duration-300"
                        style={{ backgroundColor: color }}
                    ></div>

                    <div className="flex-1 space-y-2">
                        {/* Hex Input */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 w-8">HEX</span>
                            <div className="relative flex-1">
                                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500">#</span>
                                <input
                                    type="text"
                                    value={color.replace('#', '')}
                                    onChange={(e) => handleColorChange(`#${e.target.value}`)}
                                    maxLength={6}
                                    className="w-full pl-6 pr-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white uppercase font-mono"
                                />
                            </div>
                        </div>

                        {/* RGB Inputs */}
                        <div className="flex items-center gap-2">
                             <span className="text-xs text-gray-500 dark:text-gray-400 w-8">RGB</span>
                             <div className="grid grid-cols-3 gap-2 flex-1">
                                <input
                                    type="number"
                                    value={rgb.r}
                                    onChange={(e) => handleRgbChange('r', e.target.value)}
                                    min="0"
                                    max="255"
                                    className="w-full px-1 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white text-center"
                                    title="Red"
                                />
                                <input
                                    type="number"
                                    value={rgb.g}
                                    onChange={(e) => handleRgbChange('g', e.target.value)}
                                    min="0"
                                    max="255"
                                    className="w-full px-1 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white text-center"
                                    title="Green"
                                />
                                <input
                                    type="number"
                                    value={rgb.b}
                                    onChange={(e) => handleRgbChange('b', e.target.value)}
                                    min="0"
                                    max="255"
                                    className="w-full px-1 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white text-center"
                                    title="Blue"
                                />
                             </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Frequency and Sessions */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="mb-4">
          <label htmlFor="frequency-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Frecuencia Semanal
          </label>
          <div className="flex items-center gap-3">
             <select
                id="frequency-select"
                value={frequency}
                onChange={(e) => setFrequency(parseInt(e.target.value))}
                className="w-24 h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
             >
                {Array.from({ length: 7 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>
                        {num}
                    </option>
                ))}
             </select>
             <span className="text-sm text-gray-600 dark:text-gray-400">veces por semana</span>
          </div>
        </div>

        <div className="space-y-4">
          {sessions.map((session, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded border border-gray-200 dark:border-gray-600">
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Sesión {index + 1}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-12 xl:grid-cols-2 gap-3">
                <div className="col-span-1 md:col-span-2 xl:col-span-1 order-1 md:order-1 xl:order-1">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Día</label>
                  <select
                    required
                    value={session.day}
                    onChange={e => handleSessionChange(index, 'day', e.target.value)}
                    className="w-full h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                  >
                    {DAYS.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1 md:col-span-2 xl:col-span-1 order-2 md:order-4 xl:order-2">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Aula
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={session.classroom}
                      onChange={e => handleSessionChange(index, 'classroom', e.target.value)}
                      className="w-full h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      placeholder="Aula"
                    />
                  </div>
                </div>
                <div className="col-span-1 md:col-span-4 xl:col-span-1 order-3 md:order-2 xl:order-3">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hora Inicio</label>
                  <TimeInput
                    required
                    value={session.startTime}
                    onChange={val => handleSessionChange(index, 'startTime', val)}
                    minHour={7}
                    maxHour={23}
                  />
                </div>
                <div className="col-span-1 md:col-span-4 xl:col-span-1 order-4 md:order-3 xl:order-4">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hora Fin</label>
                  <TimeInput
                    required
                    value={session.endTime}
                    onChange={val => handleSessionChange(index, 'endTime', val)}
                    minHour={7}
                    maxHour={23}
                    minTime={session.startTime}
                    error={getSessionError(index)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        {courseToEdit && (
            <button
                type="button"
                onClick={onCancelEdit}
                className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
                Cancelar
            </button>
        )}
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
        >
          {courseToEdit ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          {courseToEdit ? 'Guardar Cambios' : 'Agregar Curso'}
        </button>
      </div>
    </form>
  );
};

export default CourseForm;
