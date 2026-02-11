import React, { useState } from 'react';
import { Schedule } from '../types';
import { Plus, Trash, Edit2, Check, X, Loader } from 'lucide-react';
import Scrollable from './Scrollable';

interface ScheduleManagerProps {
  schedules: Schedule[];
  currentScheduleId: string | null;
  onSwitchSchedule: (id: string) => void;
  onCreateSchedule: (name: string) => void;
  onDeleteSchedule: (id: string) => void;
  onRenameSchedule: (id: string, name: string) => Promise<void> | void;
}

const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  schedules,
  currentScheduleId,
  onSwitchSchedule,
  onCreateSchedule,
  onDeleteSchedule,
  onRenameSchedule
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onCreateSchedule(newName.trim());
      setNewName('');
      setIsCreating(false);
    }
  };

  const startEditing = (e: React.MouseEvent, schedule: Schedule) => {
    e.stopPropagation();
    setEditingId(schedule.id);
    setEditName(schedule.name);
    setEditError(null);
  };

  const validateName = (name: string): string | null => {
    if (!name.trim()) return 'El nombre no puede estar vacío';
    if (name.length < 3) return 'Mínimo 3 caracteres';
    if (name.length > 50) return 'Máximo 50 caracteres';
    if (/[^a-zA-Z0-9\s-_]/.test(name)) return 'Sin caracteres especiales';
    return null;
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const error = validateName(editName);
    if (error) {
        setEditError(error);
        return;
    }

    if (editingId) {
        setIsSaving(true);
        try {
            await onRenameSchedule(editingId, editName.trim());
            const id = editingId;
            setEditingId(null);
            setEditName('');
            setEditError(null);
            setSuccessId(id);
            setTimeout(() => setSuccessId(null), 2000);
        } catch (err: any) {
            setEditError(err.message || 'Error al guardar');
        } finally {
            setIsSaving(false);
        }
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingId(null);
      setEditName('');
      setEditError(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6 flex flex-wrap gap-4 items-center transition-colors duration-200">
      <div className="flex-grow min-w-0">
        <Scrollable>
        <div className="flex gap-4 pb-2 items-center flex-wrap">
        {schedules.map(schedule => (
          <div
            key={schedule.id}
            role="button"
            tabIndex={0}
            aria-label={`Seleccionar horario ${schedule.name}`}
            aria-current={currentScheduleId === schedule.id ? 'true' : undefined}
            className={`
              relative flex items-center justify-center min-w-[100px] px-4 py-2.5 rounded-full cursor-pointer transition-all border whitespace-nowrap group select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              ${currentScheduleId === schedule.id
                ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-700 dark:border-blue-700'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:border-gray-600'}
            `}
            onClick={() => {
                if (editingId !== schedule.id) {
                    onSwitchSchedule(schedule.id);
                }
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (editingId !== schedule.id) {
                        onSwitchSchedule(schedule.id);
                    }
                }
            }}
          >
            {editingId === schedule.id ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="px-2 py-0.5 text-sm rounded text-gray-800 border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32 disabled:opacity-50"
                        autoFocus
                        disabled={isSaving}
                        onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(e);
                            if (e.key === 'Escape') cancelEdit(e as any);
                        }}
                    />
                    <button onClick={saveEdit} className="p-1 hover:text-green-300 text-white disabled:opacity-50" title="Guardar" aria-label="Guardar cambios" disabled={isSaving}>
                        {isSaving ? <Loader className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    </button>
                    <button onClick={cancelEdit} className="p-1 hover:text-red-300 text-white disabled:opacity-50" title="Cancelar" aria-label="Cancelar edición" disabled={isSaving}>
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <>
                    <span className="font-medium truncate max-w-[150px] block text-center" title={schedule.name}>{schedule.name}</span>
                    {successId === schedule.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-green-100 dark:bg-green-900/90 text-green-700 dark:text-green-200 rounded-full animate-fade-out z-20 pointer-events-none">
                            <Check className="w-4 h-4 mr-1" />
                            <span className="text-xs font-medium">Guardado</span>
                        </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-full opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 bg-inherit backdrop-blur-sm z-10">
                        <button
                            onClick={(e) => startEditing(e, schedule)}
                            className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${currentScheduleId === schedule.id ? 'text-white' : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'}`}
                            title="Renombrar"
                            aria-label={`Renombrar horario ${schedule.name}`}
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('¿Estás seguro de eliminar este horario?')) {
                                onDeleteSchedule(schedule.id);
                                }
                            }}
                            className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 ${currentScheduleId === schedule.id ? 'text-white' : 'text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400'}`}
                            title="Eliminar"
                            aria-label={`Eliminar horario ${schedule.name}`}
                        >
                            <Trash className="w-4 h-4" />
                        </button>
                    </div>
                </>
            )}

            {/* Error Message Tooltip */}
            {editingId === schedule.id && editError && (
                <div className="absolute top-full left-0 mt-1 bg-red-100 text-red-700 text-xs px-2 py-1 rounded shadow-lg z-10 whitespace-nowrap">
                    {editError}
                </div>
            )}
          </div>
        ))}
        </div>
        </Scrollable>
      </div>

      {isCreating ? (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nombre..."
            className="px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder-gray-400"
            autoFocus
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm dark:bg-green-700 dark:hover:bg-green-800"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400 text-sm dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
          >
            X
          </button>
        </form>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors whitespace-nowrap dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          <Plus className="w-4 h-4" />
          Nuevo Horario
        </button>
      )}
    </div>
  );
};

export default ScheduleManager;
