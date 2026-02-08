import { useState, useEffect } from 'react'
import { Calendar, AlertCircle } from 'lucide-react'
import CourseForm from './components/CourseForm'
import ScheduleView from './components/ScheduleView'
import ScheduleManager from './components/ScheduleManager'
import CourseTable from './components/CourseTable'
import { useSchedule } from './hooks/useSchedule'
import { Course } from './types'

function App() {
  const {
    schedules,
    currentSchedule,
    currentScheduleId,
    setCurrentScheduleId,
    createSchedule,
    deleteSchedule,
    addCourse,
    removeCourse,
    toggleCourseStatus
  } = useSchedule();

  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-center gap-3">
          <Calendar className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">
            Creador de Horarios Universitarios
          </h1>
        </header>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 flex items-center gap-2 rounded shadow-sm animate-pulse sticky top-4 z-50" role="alert">
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
              <CourseForm onAddCourse={handleAddCourse} />
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
              />
            </div>
          </div>
        ) : (
           <div className="text-center py-20 bg-white rounded-lg shadow">
            <p className="text-xl text-gray-500">Cargando o no hay horario seleccionado...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
