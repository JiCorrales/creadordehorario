import React, { useState } from 'react';
import { Course } from '../types';
import { Trash2, CalendarPlus, CalendarX, Edit, ChevronDown, ChevronUp, Search, Download } from 'lucide-react';

interface CourseTableProps {
  courses: Course[];
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (course: Course) => void;
  onImport?: () => void;
}

const CourseTable: React.FC<CourseTableProps> = ({
  courses,
  onToggleStatus,
  onDelete,
  onEdit,
  onImport
}) => {
  const [sortField, setSortField] = useState<keyof Course>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSort = (field: keyof Course) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const formatTextAsList = (text: string, maxLength: number = 30) => {
      if (text.length <= maxLength) return <span className="whitespace-normal">{text}</span>;

      const words = text.split(' ');
      // If single word is too long, force wrap
      if (words.length === 1) return <span className="break-all whitespace-normal">{text}</span>;

      return (
          <div className="flex flex-col">
              {words.map((word, i) => (
                  <span key={i} className="block">{word}</span>
              ))}
          </div>
      );
  };

  // Get unique suggestions based on filter
  const suggestions = React.useMemo(() => {
    if (!filter || filter.length < 2) return [];

    const search = normalizeString(filter);
    const uniqueValues = new Set<string>();

    courses.forEach(course => {
      if (normalizeString(course.name).includes(search)) {
        uniqueValues.add(course.name);
      }
      if (normalizeString(course.professor).includes(search)) {
        uniqueValues.add(course.professor);
      }
    });

    return Array.from(uniqueValues).slice(0, 5); // Limit to 5 suggestions
  }, [courses, filter]);

  const sortedAndFilteredCourses = courses
    .filter(course => {
      const search = normalizeString(filter);
      return normalizeString(course.name).includes(search) ||
             normalizeString(course.professor).includes(search);
    })
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
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden mb-6 transition-colors duration-200">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700 relative transition-colors duration-200">
        <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Gestión de Cursos</h3>
            {onImport && (
                <button
                    onClick={onImport}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/70 text-sm transition-colors"
                    title="Importar cursos de otro horario"
                >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Importar</span>
                </button>
            )}
        </div>
        <div className="relative w-full max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400 dark:text-gray-300" />
          </div>
          <input
            type="text"
            placeholder="Buscar cursos por nombre, profesor, sede..."
            className="w-full pl-10 pr-3 py-1 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-600 dark:text-white dark:border-gray-500 dark:placeholder-gray-300"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow click
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                  onClick={() => {
                    setFilter(suggestion);
                    setShowSuggestions(false);
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Curso
                  {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Sede
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Créditos
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Horario
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Profesor
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedAndFilteredCourses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  {filter ? 'No se encontraron cursos que coincidan con la búsqueda.' : 'No hay cursos registrados.'}
                </td>
              </tr>
            ) : (
              sortedAndFilteredCourses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatTextAsList(course.name, 25)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Grupo: {course.group}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {course.campus}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center">
                    {course.credits}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-300 space-y-1">
                      {course.sessions.map((session, idx) => (
                        <div key={idx} className="flex gap-2 text-xs whitespace-nowrap">
                          <span className="font-medium w-16 text-gray-700 dark:text-gray-300">{session.day}:</span>
                          <span className="text-gray-600 dark:text-gray-400">{session.startTime} - {session.endTime}</span>
                          <span className="text-gray-500 dark:text-gray-500">({session.classroom})</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                    {formatTextAsList(course.professor, 20)}
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
                            ? 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 hover:text-yellow-700 dark:hover:text-yellow-300'
                            : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-300'
                        }`}
                        title={course.isScheduled ? "Quitar del horario" : "Agregar al horario"}
                      >
                        {course.isScheduled ? <CalendarX className="w-4 h-4" /> : <CalendarPlus className="w-4 h-4" />}
                      </button>

                      <button
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 rounded transition-colors"
                        title="Editar Curso"
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
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 rounded transition-colors"
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
