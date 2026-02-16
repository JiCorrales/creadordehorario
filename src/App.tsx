import { useState, useEffect } from 'react'
import { useOverlayScrollbars } from 'overlayscrollbars-react';
import 'overlayscrollbars/overlayscrollbars.css';
import { Calendar, AlertCircle, Moon, Sun, Import , BookOpen } from 'lucide-react'
import CourseForm from './components/CourseForm'
import ScheduleView from './components/ScheduleView'
import ScheduleManager from './components/ScheduleManager'
import CourseTable from './components/CourseTable'
import Modal from './components/Modal'
import ImportHtmlModal from './components/ImportHtmlModal'
import UserManualModal from './components/UserManualModal'
import { useSchedule } from './hooks/useSchedule'
import { useTheme } from './hooks/useTheme'
import { Course } from './types'

function App() {
  const { theme, toggleTheme } = useTheme();

  // Initialize OverlayScrollbars for the body
  const [initBodyOverlayScrollbars] = useOverlayScrollbars({
    defer: true,
    options: {
      scrollbars: {
        theme: 'os-theme-custom',
        autoHide: 'scroll',
        clickScroll: true,
      },
    },
  });

  useEffect(() => {
    initBodyOverlayScrollbars(document.body);
  }, [initBodyOverlayScrollbars]);

  const {
    schedules,
    currentSchedule,
    currentScheduleId,
    setCurrentScheduleId,
    createSchedule,
    deleteSchedule,
    addCourse,
    updateCourse,
    removeCourses,
    toggleCourseStatus,
    importCourses,
    addCourses,
    renameSchedule
  } = useSchedule();

  const [error, setError] = useState<string | null>(null);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isHtmlImportOpen, setIsHtmlImportOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [customColors, setCustomColors] = useState<string[]>([]);

  // Auto-create initial schedule if none exists on mount
  useEffect(() => {
    if (schedules.length === 0) {
      createSchedule('Mi Horario');
    }
  }, [schedules.length, createSchedule]);

  // Handle unsaved changes warning on page reload/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (isFormDirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormDirty]);

  const handleAddCourse = (course: Course) => {
    try {
      setError(null);
      if (!currentScheduleId) {
         throw new Error('Por favor selecciona o crea un horario primero.');
      }
      addCourse(course);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleUpdateCourse = (course: Course) => {
    try {
      setError(null);
      if (!currentScheduleId) {
         throw new Error('Por favor selecciona o crea un horario primero.');
      }
      updateCourse(course);
      setCourseToEdit(null); // Exit edit mode
      setIsFormDirty(false);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEditCourse = (course: Course) => {
    setCourseToEdit(course);
    setIsFormDirty(false); // Reset dirty state when opening edit
  };

  const handleCancelEdit = () => {
    if (isFormDirty) {
        if (window.confirm("¿Está seguro de que desea salir? Los cambios no guardados se perderán")) {
            setCourseToEdit(null);
            setIsFormDirty(false);
        }
    } else {
        setCourseToEdit(null);
        setIsFormDirty(false);
    }
  };

  const handleToggleStatus = (courseId: string) => {
    try {
      setError(null);
      toggleCourseStatus(courseId);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleBulkToggleStatus = (courseIds: string[]) => {
    try {
        setError(null);
        courseIds.forEach(id => toggleCourseStatus(id));
    } catch (err: any) {
        setError(err.message);
        setTimeout(() => setError(null), 5000);
    }
  };

  const handleBulkDelete = (courseIds: string[]) => {
      try {
          setError(null);
          removeCourses(courseIds);
      } catch (err: any) {
          setError(err.message);
          setTimeout(() => setError(null), 5000);
      }
  };

  const handleUnscheduleFromView = (courseId: string) => {
      // In the view, clicking trash means "remove from schedule", so we toggle it off.
      // We don't delete the course entirely.
      handleToggleStatus(courseId);
  };

  const handleImportClick = () => {
    setIsImportModalOpen(true);
  };

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleImportConfirm = (sourceId: string) => {
    try {
      importCourses(sourceId);
      setIsImportModalOpen(false);
      setSuccessMessage("Cursos importados correctamente.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Error al importar cursos");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleHtmlImport = (courses: Course[]) => {
    try {
        addCourses(courses);
        setIsHtmlImportOpen(false);
    } catch (err: any) {
        setError("Error al importar cursos del HTML");
        setTimeout(() => setError(null), 3000);
    }
  };

  const handleAddCustomColor = (color: string) => {
    setCustomColors(prev => [...prev, color]);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1
              className="text-3xl font-bold text-gray-800 dark:text-white"
              style={{fontFamily: '"open-sans", sans-serif, font-weight: 400, font-style: normal;'}}
            >
              Creador de Horarios Universitarios
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
                onClick={() => setIsHtmlImportOpen(true)}
                className="p-2 rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700 hover:text-blue-600 dark:hover:text-blue-400"
                title="Importar cursos desde HTML (Matrícula TEC)"
            >
                <Import className="w-6 h-6" />
            </button>
            <button
                onClick={() => setIsManualOpen(true)}
                className="p-2 rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700 hover:text-blue-600 dark:hover:text-blue-400"
                title="Manual de Uso"
            >
                <BookOpen className="w-6 h-6" />
            </button>
            <button
                onClick={toggleTheme}
            className="p-2 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-yellow-300 shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
          </div>
        </header>

        {successMessage && (
          <div className="bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500 text-green-700 dark:text-green-300 p-4 mb-6 flex items-center gap-2 rounded shadow-sm animate-pulse sticky top-4 z-50" role="alert">
            <AlertCircle className="w-5 h-5" />
            <p>{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 mb-6 flex items-center gap-2 rounded shadow-sm animate-pulse sticky top-4 z-50" role="alert">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        <ScheduleManager
          schedules={schedules}
          currentScheduleId={currentScheduleId}
          onSwitchSchedule={setCurrentScheduleId}
          onCreateSchedule={createSchedule}
          onDeleteSchedule={deleteSchedule}
          onRenameSchedule={renameSchedule}
        />

        {currentSchedule ? (
          <div className="flex flex-col xl:flex-row gap-6">
            <div className="w-full xl:w-1/4 min-w-[300px] space-y-6">
              <CourseForm
                onAddCourse={handleAddCourse}
                onUpdateCourse={handleUpdateCourse}
                onCancelEdit={() => {}}
                customColors={customColors}
                onAddCustomColor={handleAddCustomColor}
              />
            </div>

            <div className="w-full xl:flex-1 min-w-0 space-y-6">
              <ScheduleView
                schedule={currentSchedule}
                onRemoveCourse={handleUnscheduleFromView}
                onEditCourse={handleEditCourse}
                theme={theme}
              />
              <CourseTable
                courses={currentSchedule.courses}
                onBulkToggleStatus={handleBulkToggleStatus}
                onBulkDelete={handleBulkDelete}
                onEdit={handleEditCourse}
                onImport={handleImportClick}
              />
            </div>
          </div>
        ) : (
           <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <p className="text-xl text-gray-500 dark:text-gray-400">Cargando o no hay horario seleccionado...</p>
          </div>
        )}

        {/* Edit Modal */}
        <Modal
          isOpen={!!courseToEdit}
          onClose={handleCancelEdit}
          title="Editar Curso"
        >
          {courseToEdit && (
            <CourseForm
              onAddCourse={() => {}} // Not used in edit mode
              onUpdateCourse={handleUpdateCourse}
              onCancelEdit={handleCancelEdit}
              courseToEdit={courseToEdit}
              setIsDirty={setIsFormDirty}
              customColors={customColors}
              onAddCustomColor={handleAddCustomColor}
            />
          )}
        </Modal>

        {/* Import Modal */}
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="Importar Cursos"
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
               Selecciona el horario del cual deseas copiar los cursos. Los cursos se añadirán como "no programados" para que puedas organizarlos en este horario.
            </p>
            <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
               {schedules.filter(s => s.id !== currentScheduleId).map(schedule => (
                  <button
                    key={schedule.id}
                    onClick={() => handleImportConfirm(schedule.id)}
                    className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all flex justify-between items-center group bg-white dark:bg-gray-800"
                  >
                     <div>
                        <span className="font-medium text-gray-800 dark:text-gray-200 block">{schedule.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Creado: {new Date(schedule.createdAt).toLocaleDateString()}
                        </span>
                     </div>
                     <span className="text-sm px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                        {schedule.courses.length} cursos
                     </span>
                  </button>
               ))}
               {schedules.filter(s => s.id !== currentScheduleId).length === 0 && (
                   <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                       <p>No hay otros horarios disponibles para importar.</p>
                       <p className="text-sm mt-2">Crea otro horario primero para poder importar sus cursos.</p>
                   </div>
               )}
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                    Cancelar
                </button>
            </div>
          </div>
        </Modal>

        {/* Html Import Modal */}
        <ImportHtmlModal
            isOpen={isHtmlImportOpen}
            onClose={() => setIsHtmlImportOpen(false)}
            onImport={handleHtmlImport}
             existingCourses={currentSchedule?.courses}
         />

         {/* User Manual Modal */}
         <UserManualModal
             isOpen={isManualOpen}
             onClose={() => setIsManualOpen(false)}
         />
       </div>
     </div>
   )
 }

export default App
