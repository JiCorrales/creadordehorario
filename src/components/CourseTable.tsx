import React, { useState } from 'react';
import { Course } from '../types';
import { Trash2, CalendarPlus, Edit, ChevronDown, ChevronUp, Search, Download, Layers, ChevronRight, FileDown } from 'lucide-react';
import Scrollable from './Scrollable';
import ConfirmationModal from './ConfirmationModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CourseTableProps {
  courses: Course[];
  onToggleStatus?: (id: string) => void;
  onDelete?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkToggleStatus?: (ids: string[]) => void;
  onEdit?: (course: Course) => void;
  onImport?: () => void;
}

const CourseTable: React.FC<CourseTableProps> = ({
  courses,
  onBulkDelete,
  onBulkToggleStatus,
  onEdit,
  onImport
}) => {
  const [sortField, setSortField] = useState<keyof Course>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[] | null>(null); // New state for group deletion
  const [isGrouped, setIsGrouped] = useState(() => {
    const saved = localStorage.getItem('courseTableGrouped');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Save grouping preference whenever it changes
  React.useEffect(() => {
    localStorage.setItem('courseTableGrouped', JSON.stringify(isGrouped));
  }, [isGrouped]);

  // derived state for conflicts
  const [conflictIds] = useState<Set<string>>(new Set());

  const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

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

  // Grouping Logic
  const groupedCourses = React.useMemo(() => {
    if (!isGrouped) return null;

    const groups: Record<string, Course[]> = {};
    sortedAndFilteredCourses.forEach(course => {
      const key = course.name;
      if (!groups[key]) groups[key] = [];
      groups[key].push(course);
    });

    // Sort keys (course names) alphabetically
    const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    // Initialize all groups as expanded when grouping is first enabled or when filter changes
    // This is a side effect inside useMemo which is generally discouraged, but for this specific UX requirement
    // it's cleaner than a useEffect. However, to be React-pure, we should handle this in the toggle handler or useEffect.
    // We'll leave the state management outside.

    return { groups, sortedKeys };
  }, [sortedAndFilteredCourses, isGrouped]);

  // Effect to expand all groups by default when grouping is enabled or filter changes
  React.useEffect(() => {
    if (isGrouped && groupedCourses) {
       setExpandedGroups(new Set(groupedCourses.sortedKeys));
    }
  }, [isGrouped, filter, courses.length]); // Depend on filter/courses to re-expand when data changes

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const handleExportExcel = () => {
    const data = sortedAndFilteredCourses.map(c => ({
      Curso: c.name,
      Grupo: c.group,
      Sede: c.campus,
      Profesor: c.professor,
      Modalidad: c.status,
      Estado: c.isScheduled ? 'Agendado' : 'Pendiente',
      Horario: c.sessions.map(s => `${s.day} ${s.startTime}-${s.endTime} (${s.classroom})`).join(', ')
    }));

    // If grouped, we might want to sort by name first (which is default if sortField is name)
    // Excel doesn't support "grouping" in the same visual way as PDF/HTML easily without complex layout,
    // so a flat list sorted by the grouping key is best.

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cursos");
    XLSX.writeFile(wb, "cursos_gestion.xlsx");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Gestión de Cursos", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 22);

    const tableColumn = ["Curso", "G", "Sede", "Horario", "Profesor", "Modalidad", "Est."];
    const tableRows: any[] = [];

    if (isGrouped && groupedCourses) {
      groupedCourses.sortedKeys.forEach(key => {
        // Add a group header row
        tableRows.push([{ content: key, colSpan: 7, styles: { fillColor: [240, 240, 240], fontStyle: 'bold', halign: 'left' } }]);

        groupedCourses.groups[key].forEach(c => {
           const sessionsStr = c.sessions.map(s => `${s.day} ${s.startTime}-${s.endTime}`).join('\n');
           tableRows.push([
             c.name,
             c.group,
             c.campus,
             sessionsStr,
             c.professor,
             c.status,
             c.isScheduled ? 'Agendado' : 'Pendiente'
           ]);
        });
      });
    } else {
      sortedAndFilteredCourses.forEach(c => {
         const sessionsStr = c.sessions.map(s => `${s.day} ${s.startTime}-${s.endTime}`).join('\n');
         tableRows.push([
           c.name,
           c.group,
           c.campus,
           sessionsStr,
           c.professor,
           c.status,
           c.isScheduled ? 'Agendado' : 'Pendiente'
         ]);
      });
    }

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185] },
      columnStyles: {
        0: { cellWidth: 40 }, // Curso
        1: { cellWidth: 10 }, // Grupo
        2: { cellWidth: 20 }, // Sede
        3: { cellWidth: 40 }, // Horario
        4: { cellWidth: 30 }, // Profesor
        5: { cellWidth: 25 }, // Modalidad
        6: { cellWidth: 15 }  // Estado
      }
    });

    doc.save("cursos_gestion.pdf");
  };

  // Master checkbox logic
  const handleSelectAll = () => {
    // If any courses are selected (whether all or just some), clicking the master checkbox
    // should deselect all. This is a common pattern that prevents accidental "Select All"
    // when the user intends to clear the current selection.
    if (selectedCourseIds.size > 0) {
      setSelectedCourseIds(new Set());
    } else {
      setSelectedCourseIds(new Set(sortedAndFilteredCourses.map(c => c.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedCourseIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCourseIds(newSelected);
  };

  const selectedCount = selectedCourseIds.size;
  const isAllSelected = sortedAndFilteredCourses.length > 0 && selectedCount === sortedAndFilteredCourses.length;
  const isIndeterminate = selectedCount > 0 && selectedCount < sortedAndFilteredCourses.length;

  const handleSort = (field: keyof Course) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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

  const renderCourseRow = (course: Course) => (
    <tr
        key={course.id}
        className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${selectedCourseIds.has(course.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${conflictIds.has(course.id) ? 'border-l-4 border-red-500' : ''}`}
        onClick={() => handleSelectOne(course.id)}
    >
      <td className="px-3 py-4">
        <input
            type="checkbox"
            checked={selectedCourseIds.has(course.id)}
            onChange={() => handleSelectOne(course.id)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-offset-gray-800"
            onClick={(e) => e.stopPropagation()}
        />
      </td>
      <td className="px-3 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatTextAsList(course.name, 25)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Grupo: {course.group}</span>
        </div>
      </td>
      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
        {formatTextAsList(course.campus, 20)}
      </td>
      <td className="px-3 py-4">
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
      <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
        {formatTextAsList(course.professor, 20)}
      </td>
      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
        {formatTextAsList(course.status, 20)}
      </td>
      <td className="px-3 py-4 whitespace-nowrap">
        {getStatusBadge(course.isScheduled)}
      </td>
    </tr>
  );

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
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 dark:bg-gray-700 relative transition-colors duration-200">
        <div className="flex items-center gap-4 w-full sm:w-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white whitespace-nowrap">Gestión de Cursos</h3>

            {/* Action Buttons Section */}
            <div className="flex items-center gap-1 mx-auto">
                <span className="text-sm text-gray-500 mr-2">
                    {selectedCount > 0 ? `${selectedCount} seleccionados` : ''}
                </span>

                <button
                    onClick={() => onBulkToggleStatus && onBulkToggleStatus(Array.from(selectedCourseIds))}
                    disabled={selectedCount === 0}
                    className={`p-1.5 rounded transition-colors ${
                        selectedCount === 0
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-300'
                    }`}
                    title="Cambiar estado (Agendar/Quitar)"
                >
                    <CalendarPlus className="w-5 h-5" />
                </button>

                <button
                    onClick={() => {
                        const id = Array.from(selectedCourseIds)[0];
                        const course = courses.find(c => c.id === id);
                        if (course && onEdit) onEdit(course);
                    }}
                    disabled={selectedCount !== 1}
                    className={`p-1.5 rounded transition-colors ${
                        selectedCount !== 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300'
                    }`}
                    title="Editar Curso (Solo uno)"
                >
                    <Edit className="w-5 h-5" />
                </button>

                <button
                    onClick={() => {
                        if (selectedCount > 0) {
                            setIsDeleteModalOpen(true);
                        }
                    }}
                    disabled={selectedCount === 0}
                    className={`p-1.5 rounded transition-colors ${
                        selectedCount === 0
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300'
                    }`}
                    title="Eliminar seleccionados"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Grouping Toggle */}
          <button
            onClick={() => setIsGrouped(!isGrouped)}
            className={`p-1.5 rounded transition-colors ${
              isGrouped
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-600'
            }`}
            title={isGrouped ? "Desagrupar por curso" : "Agrupar por curso"}
          >
            <Layers className="w-5 h-5" />
          </button>

          {/* Export Options */}
          <div className="flex items-center border-l border-gray-300 dark:border-gray-600 pl-2 gap-1 mr-2">
             <button
                onClick={handleExportExcel}
                className="p-1.5 rounded text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
                title="Exportar a Excel"
             >
                <Download className="w-5 h-5" />
             </button>
             <button
                onClick={handleExportPDF}
                className="p-1.5 rounded text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                title="Exportar a PDF"
             >
                <FileDown className="w-5 h-5" />
             </button>
          </div>

          {onImport && (
              <button
                  onClick={onImport}
                  className="flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/70 transition-colors h-[34px] border border-blue-200 dark:border-blue-800"
                  title="Importar cursos de otro horario"
              >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium">Importar</span>
              </button>
          )}
          <div className="relative w-full max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 dark:text-gray-300" />
            </div>
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-9 pr-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-600 dark:text-white dark:border-gray-500 dark:placeholder-gray-300 h-[34px]"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow click
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg mt-1 max-h-60 overflow-auto left-0">
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
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
            setIsDeleteModalOpen(false);
            setIdsToDelete(null);
        }}
        onConfirm={() => {
          if (onBulkDelete) {
            const ids = idsToDelete || Array.from(selectedCourseIds);
            onBulkDelete(ids);
            if (!idsToDelete) {
                setSelectedCourseIds(new Set());
            }
          }
          setIsDeleteModalOpen(false);
          setIdsToDelete(null);
        }}
        title="Eliminar Cursos"
        message={`¿Estás seguro de que deseas eliminar ${idsToDelete ? idsToDelete.length : selectedCount} curso(s)? Esta acción no se puede deshacer.`}
      />

      <div className="w-full">
        <Scrollable className="w-full">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="w-10 px-3 py-3">
                <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-offset-gray-800 cursor-pointer"
                    title={selectedCount > 0 ? "Deseleccionar todos" : "Seleccionar todos"}
                />
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Curso
                  {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
                </div>
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Sede
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Horario
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Profesor
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Modalidad
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedAndFilteredCourses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  {filter ? 'No se encontraron cursos que coincidan con la búsqueda.' : 'No hay cursos registrados.'}
                </td>
              </tr>
            ) : (
              isGrouped && groupedCourses ? (
                groupedCourses.sortedKeys.map(groupName => (
                  <React.Fragment key={groupName}>
                    <tr
                      className="bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => toggleGroup(groupName)}
                    >
                        <td colSpan={7} className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                  {expandedGroups.has(groupName)
                                    ? <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    : <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                  }
                                  <span className="font-semibold text-gray-900 dark:text-white text-sm">{groupName}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
                                    {groupedCourses.groups[groupName].length}
                                  </span>
                              </div>

                              <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const groupIds = groupedCourses.groups[groupName].map(c => c.id);
                                    setIdsToDelete(groupIds);
                                    setIsDeleteModalOpen(true);
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="Eliminar todos los cursos de este grupo"
                              >
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                        </td>
                    </tr>
                    {expandedGroups.has(groupName) && groupedCourses.groups[groupName].map(course => (
                        renderCourseRow(course)
                    ))}
                  </React.Fragment>
                ))
              ) : (
                sortedAndFilteredCourses.map((course) => (
                  renderCourseRow(course)
                ))
              )
            )}
          </tbody>
          </table>
        </Scrollable>
      </div>
    </div>
  );
};

export default CourseTable;
