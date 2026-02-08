import React, { useMemo } from 'react';
import { Schedule, Course } from '../types';
import { DAYS } from '../utils';
import { Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ScheduleViewProps {
  schedule: Schedule;
  onRemoveCourse: (courseId: string) => void;
}

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 60; // px

const ScheduleView: React.FC<ScheduleViewProps> = ({ schedule, onRemoveCourse }) => {

  const parseTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getPositionStyle = (startTime: string, endTime: string) => {
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    const duration = endMinutes - startMinutes;

    const startOffset = startMinutes - (START_HOUR * 60);

    return {
      top: `${(startOffset / 60) * HOUR_HEIGHT}px`,
      height: `${(duration / 60) * HOUR_HEIGHT}px`,
    };
  };

  const hours = useMemo(() => {
    const h = [];
    for (let i = START_HOUR; i <= END_HOUR; i++) {
      h.push(i);
    }
    return h;
  }, []);

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`Horario: ${schedule.name}`, 14, 20);

    // Prepare table data: Flatten courses and sessions
    const tableData: string[][] = [];

    // Only export scheduled courses
    const scheduledCourses = schedule.courses.filter(c => c.isScheduled);

    scheduledCourses.forEach(c => {
      // Create a string summarizing all sessions
      const sessionsStr = c.sessions
        .map(s => `${s.day} ${s.startTime}-${s.endTime} (${s.classroom})`)
        .join('\n');

      tableData.push([
        c.name,
        sessionsStr,
        c.professor,
        c.group
      ]);
    });

    autoTable(doc, {
      startY: 30,
      head: [['Curso', 'Horario', 'Profesor', 'Grupo']],
      body: tableData,
    });

    doc.save(`${schedule.name}.pdf`);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Vista de Horario</h2>
        <button
          onClick={exportPDF}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
        >
          Exportar PDF
        </button>
      </div>

      <div className="min-w-[800px] relative border border-gray-300 rounded-lg overflow-hidden bg-white">
        {/* Header Days */}
        <div className="grid grid-cols-8 border-b border-gray-300 bg-gray-50 sticky top-0 z-20">
          <div className="p-2 border-r border-gray-300 text-center font-semibold text-gray-700">Hora</div>
          {DAYS.map(day => (
            <div key={day} className="p-2 border-r border-gray-300 last:border-r-0 text-center font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="relative" style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>
          {/* Horizontal Hour Lines */}
          {hours.map(hour => (
            <div 
              key={hour} 
              className="absolute w-full border-b border-gray-300 flex items-start"
              style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
            >
              <div className="w-[12.5%] text-xs text-gray-500 font-medium p-1 text-right pr-2">
                {hour}:00
              </div>
              {/* Vertical lines for days */}
              {DAYS.map((_, i) => (
                <div key={i} className="w-[12.5%] h-full border-r border-gray-300 last:border-r-0"></div>
              ))}
            </div>
          ))}

          {/* Courses */}
          {schedule.courses.filter(c => c.isScheduled).map(course => (
            <React.Fragment key={course.id}>
              {course.sessions.map(session => {
                const dayIndex = DAYS.indexOf(session.day);
                if (dayIndex === -1) return null;

                const style = getPositionStyle(session.startTime, session.endTime);
                const colWidth = 100 / 8; // 8 columns (1 time + 7 days)
                const left = (dayIndex + 1) * colWidth; // +1 to skip Time column

                return (
                  <div
                    key={session.id}
                    className="absolute bg-blue-100 border-l-4 border-blue-500 rounded p-1 overflow-hidden hover:z-10 hover:shadow-lg transition-all group"
                    style={{
                      ...style,
                      left: `${left}%`,
                      width: `${colWidth - 0.5}%`, // slightly smaller for gap
                      marginLeft: '0.25%'
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-xs text-blue-800 truncate" title={course.name}>{course.name}</div>
                      <button
                        onClick={() => onRemoveCourse(course.id)}
                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Quitar del horario"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-[10px] text-blue-700 leading-tight">
                      {session.classroom} - {course.group}
                    </div>
                    <div className="text-[10px] text-blue-600 truncate">
                      {course.professor}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;
