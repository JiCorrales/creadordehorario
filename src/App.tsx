import { useState, useEffect } from 'react'
import { Calendar, AlertCircle, Moon, Sun, FileText, BookOpen } from 'lucide-react'
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
  const {
    schedules,
    currentSchedule,
    currentScheduleId,
    setCurrentScheduleId,
    createSchedule,
    deleteSchedule,
    addCourse,
    updateCourse,
    removeCourse,
    toggleCourseStatus,
    importCourses,
    addCourses
  } = useSchedule();

  const [error, setError] = useState<string | null>(null);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isHtmlImportOpen, setIsHtmlImportOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);

  // Auto-create initial schedule if none exists on mount
  useEffect(() => {
    if (schedules.length === 0) {
      createSchedule('Mi Horario');
    }
  }, [schedules.length, createSchedule]);

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
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEditCourse = (course: Course) => {
    setCourseToEdit(course);
  };

  const handleCancelEdit = () => {
    setCourseToEdit(null);
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

  const handleUnscheduleFromView = (courseId: string) => {
      // In the view, clicking trash means "remove from schedule", so we toggle it off.
      // We don't delete the course entirely.
      handleToggleStatus(courseId);
  };

  const handleImportClick = () => {
    setIsImportModalOpen(true);
  };

  const handleImportConfirm = (sourceId: string) => {
    try {
      importCourses(sourceId);
      setIsImportModalOpen(false);
    } catch (err: any) {
      setError("Error al importar cursos");
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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              Creador de Horarios Universitarios
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
                onClick={() => setIsHtmlImportOpen(true)}
                className="p-2 rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700 hover:text-blue-600 dark:hover:text-blue-400"
                title="Importar cursos desde HTML (Matrícula TEC)"
            >
                <FileText className="w-6 h-6" />
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
        />

        {currentSchedule ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left Column: Form */}
            <div className="xl:col-span-4 space-y-6">
              <CourseForm
                onAddCourse={handleAddCourse}
                onUpdateCourse={handleUpdateCourse}
                onCancelEdit={() => {}} // Not used in add mode
              />
            </div>

            {/* Right Column: Schedule View & Table */}
            <div className="xl:col-span-8 space-y-8">
              <ScheduleView
                schedule={currentSchedule}
                onRemoveCourse={handleUnscheduleFromView}
              />

              <CourseTable
                courses={currentSchedule.courses}
                onToggleStatus={handleToggleStatus}
                onDelete={removeCourse}
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
