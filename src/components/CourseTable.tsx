import React, { useState } from 'react';
import { Course } from '../types';
import { Trash2, CalendarPlus, CalendarX, Edit, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface CourseTableProps {
  courses: Course[];
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (course: Course) => void;
}

const CourseTable: React.FC<CourseTableProps> = ({ 
  courses, 
  onToggleStatus, 
  onDelete,
  onEdit
}) => {
  const [sortField, setSortField] = useState<keyof Course>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');

  const handleSort = (field: keyof Course) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAndFilteredCourses = courses
    .filter(course => 
      course.name.toLowerCase().includes(filter.toLowerCase()) ||
      course.professor.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      return 0;
    });

  const getStatusBadge = (isScheduled: boolean) => {
    if (isScheduled) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Agendado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Pendiente
      </span>
    );
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900">Gestión de Cursos</h3>
        <input
          type="text"
          placeholder="Buscar curso..."
          className="px-3 py-1 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Curso
                  {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Horario
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Profesor
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAndFilteredCourses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No hay cursos registrados.
                </td>
              </tr>
            ) : (
              sortedAndFilteredCourses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{course.name}</span>
                      <span className="text-xs text-gray-500">Grupo: {course.group}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 space-y-1">
                      {course.sessions.map((session, idx) => (
                        <div key={idx} className="flex gap-2 text-xs">
                          <span className="font-medium w-16">{session.day}:</span>
                          <span>{session.startTime} - {session.endTime}</span>
                          <span className="text-gray-500">({session.classroom})</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {course.professor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(course.isScheduled)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onToggleStatus(course.id)}
                        className={`p-1.5 rounded transition-colors ${
                          course.isScheduled 
                            ? 'text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700' 
                            : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                        }`}
                        title={course.isScheduled ? "Quitar del horario" : "Agregar al horario"}
                      >
                        {course.isScheduled ? <CalendarX className="w-4 h-4" /> : <CalendarPlus className="w-4 h-4" />}
                      </button>
                      
                      {/* Edit button placeholder - logic can be added later */}
                      <button 
                        className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors"
                        title="Editar (Próximamente)"
                        onClick={() => onEdit && onEdit(course)}
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de eliminar permanentemente el curso "${course.name}"?`)) {
                            onDelete(course.id);
                          }
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 rounded transition-colors"
                        title="Eliminar permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CourseTable;
