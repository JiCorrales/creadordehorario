import React, { useMemo, useState } from 'react';
import { Schedule } from '../types';
import { DAYS } from '../utils';
import { Trash2, FileDown, Table, LayoutGrid } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ScheduleViewProps {
  schedule: Schedule;
  onRemoveCourse: (courseId: string) => void;
}

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 60; // px

// Pastel colors for courses
const COURSE_COLORS = [
  [255, 200, 200], // Red
  [200, 255, 200], // Green
  [200, 200, 255], // Blue
  [255, 255, 200], // Yellow
  [255, 200, 255], // Magenta
  [200, 255, 255], // Cyan
  [255, 220, 200], // Orange
  [220, 200, 255], // Purple
  [255, 218, 185], // Peach
  [152, 251, 152], // PaleGreen
  [135, 206, 250], // LightSkyBlue
  [255, 240, 245], // LavenderBlush
];

const ScheduleView: React.FC<ScheduleViewProps> = ({ schedule, onRemoveCourse }) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

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

  const totalCredits = useMemo(() => {
    return schedule.courses
      .filter(c => c.isScheduled)
      .reduce((sum, c) => sum + (c.credits || 0), 0);
  }, [schedule.courses]);

  // Export 1: Tabular Format (Current)
  const exportPDFTabular = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`Horario: ${schedule.name}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Total de Créditos: ${totalCredits}`, 14, 28);

    const tableData: string[][] = [];
    const scheduledCourses = schedule.courses.filter(c => c.isScheduled);

    scheduledCourses.forEach(c => {
      const sessionsStr = c.sessions
        .map(s => `${s.day} ${s.startTime}-${s.endTime} (${s.classroom})`)
        .join('\n');

      tableData.push([
        c.name,
        sessionsStr,
        c.professor,
        c.group,
        (c.credits || 0).toString()
      ]);
    });

    autoTable(doc, {
      startY: 35,
      head: [['Curso', 'Horario', 'Profesor', 'Grupo', 'Créditos']],
      body: tableData,
    });

    doc.save(`${schedule.name}_Tabla.pdf`);
    setShowExportMenu(false);
  };

  // Export 3: Visual Grid (Classic Schedule)
  const exportPDFVisual = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4'); // Landscape for better fit
    const pageWidth = doc.internal.pageSize.getWidth();
    // const pageHeight = doc.internal.pageSize.getHeight();

    // Layout Config
    const margin = 10;
    const headerHeight = 30;
    const gridTop = headerHeight + 10;
    const timeColWidth = 20;
    const dayColWidth = (pageWidth - margin * 2 - timeColWidth) / 7;
    const hourHeight = 12; // Height per hour row

    // Header
    doc.setFontSize(18);
    doc.text(`Horario: ${schedule.name}`, margin, 15);
    doc.setFontSize(12);
    doc.text(`Créditos Totales: ${totalCredits}`, margin, 25);

    // Draw Grid Headers (Days)
    doc.setFillColor(240, 240, 240);
    doc.rect(margin + timeColWidth, headerHeight, pageWidth - margin * 2 - timeColWidth, 10, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    DAYS.forEach((day, i) => {
        const x = margin + timeColWidth + (i * dayColWidth);
        doc.text(day, x + dayColWidth/2, headerHeight + 7, { align: 'center' });
        // Vertical lines
        doc.line(x, headerHeight, x, gridTop + ((END_HOUR - START_HOUR + 1) * hourHeight));
    });
    // Last vertical line
    doc.line(pageWidth - margin, headerHeight, pageWidth - margin, gridTop + ((END_HOUR - START_HOUR + 1) * hourHeight));

    // Draw Grid Rows (Hours)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    for (let h = START_HOUR; h <= END_HOUR; h++) {
        const y = gridTop + ((h - START_HOUR) * hourHeight);

        // Horizontal line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);

        // Hour label
        doc.text(`${h}:00`, margin + 2, y + hourHeight/2 + 2);
        doc.text(`${h+1}:00`, margin + 18, y + hourHeight/2 + 2, { align: 'right' }); // End time hint? Or just interval
    }
    // Final bottom line
    const finalY = gridTop + ((END_HOUR - START_HOUR + 1) * hourHeight);
    doc.line(margin, finalY, pageWidth - margin, finalY);

    // Draw Border around grid
    doc.setDrawColor(0, 0, 0);
    doc.rect(margin, headerHeight, pageWidth - margin * 2, finalY - headerHeight);

    // Draw Courses
    const scheduledCourses = schedule.courses.filter(c => c.isScheduled);

    scheduledCourses.forEach((course, index) => {
        // Assign color based on index
        const color = COURSE_COLORS[index % COURSE_COLORS.length];
        // Ensure color is valid, fallback to light gray if undefined (should not happen with modulo)
        if (color) {
             doc.setFillColor(color[0], color[1], color[2]);
        } else {
             doc.setFillColor(230, 230, 230);
        }

        course.sessions.forEach(session => {
            const dayIndex = DAYS.indexOf(session.day);
            if (dayIndex === -1) return;

            const startMinutes = parseTime(session.startTime);
            const endMinutes = parseTime(session.endTime);
            const durationMinutes = endMinutes - startMinutes;

            const startOffsetMinutes = startMinutes - (START_HOUR * 60);

            // Coordinates
            const x = margin + timeColWidth + (dayIndex * dayColWidth);
            const y = gridTop + (startOffsetMinutes / 60) * hourHeight;
            const height = (durationMinutes / 60) * hourHeight;
            const width = dayColWidth;

            // Check for valid dimensions before drawing rect
            if (!isNaN(x) && !isNaN(y) && !isNaN(width) && !isNaN(height) && height > 0 && width > 0) {
                // Draw Box
                doc.rect(x, y, width, height, 'F');

                // Draw Text (Course Name, Room, etc.)
                // Clip text logic simplistic:
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');

                // Multi-line text logic
                const textX = x + 2;
                let textY = y + 4;

                doc.text(course.name, textX, textY, { maxWidth: width - 4 });
                textY += 4;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.text(`${session.startTime}-${session.endTime}`, textX, textY);
                textY += 3;
                doc.text(session.classroom || '', textX, textY);
                textY += 3;
                doc.text((course.professor || '').split(' ')[0], textX, textY); // First name only to save space
            }
        });
    });

    doc.save(`${schedule.name}_Grafico.pdf`);
    setShowExportMenu(false);
  };

  // Export Excel: Tabular
  const exportExcel = () => {
    const scheduledCourses = schedule.courses.filter(c => c.isScheduled);

    // Flatten data for Excel
    const data = scheduledCourses.map(c => ({
        'Curso': c.name,
        'Profesor': c.professor,
        'Grupo': c.group,
        'Créditos': c.credits || 0,
        'Sede': c.campus,
        'Horario': c.sessions.map(s => `${s.day} ${s.startTime}-${s.endTime} (${s.classroom})`).join('; '),
        'Estado': c.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Horario");
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(dataBlob, `${schedule.name}.xlsx`);
    setShowExportMenu(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md overflow-x-auto transition-colors duration-200">
      <div className="flex justify-between items-center mb-4">
        <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Vista de Horario</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Créditos Totales: <span className="font-bold text-blue-600 dark:text-blue-400">{totalCredits}</span></p>
        </div>

        <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Exportar
            </button>

            {showExportMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-md shadow-lg z-50 border border-gray-100 dark:border-gray-600 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Formatos PDF
                    </div>
                    <button onClick={exportPDFTabular} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm flex items-center gap-2 text-gray-700 dark:text-gray-200">
                        <Table className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                        Tabla Resumen
                    </button>
                    <button onClick={exportPDFVisual} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm flex items-center gap-2 text-gray-700 dark:text-gray-200">
                        <LayoutGrid className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                        Horario Gráfico
                    </button>

                    <div className="p-2 border-b border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border-t dark:border-t-gray-600">
                        Excel
                    </div>
                    <button onClick={exportExcel} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm flex items-center gap-2 text-gray-700 dark:text-gray-200">
                        <FileDown className="w-4 h-4 text-green-600 dark:text-green-500" />
                        Descargar Excel
                    </button>
                </div>
            )}
        </div>
      </div>

      <div className="min-w-[800px] relative border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
        {/* Header Days */}
        <div className="grid grid-cols-8 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 sticky top-0 z-20">
          <div className="p-2 border-r border-gray-300 dark:border-gray-600 text-center font-semibold text-gray-700 dark:text-gray-200">Hora</div>
          {DAYS.map(day => (
            <div key={day} className="p-2 border-r border-gray-300 dark:border-gray-600 last:border-r-0 text-center font-semibold text-gray-700 dark:text-gray-200">
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
              className="absolute w-full border-b border-gray-300 dark:border-gray-600 flex items-start"
              style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
            >
              <div className="w-[12.5%] text-xs text-gray-500 dark:text-gray-400 font-medium p-1 flex items-center justify-center h-full border-r border-gray-300 dark:border-gray-600">
                {hour}:00
              </div>
              {/* Vertical lines for days */}
              {DAYS.map((_, i) => (
                <div key={i} className="w-[12.5%] h-full border-r border-gray-300 dark:border-gray-600 last:border-r-0"></div>
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
                    className="absolute bg-blue-100 dark:bg-blue-900/50 border-l-4 border-blue-500 dark:border-blue-400 rounded p-1 overflow-hidden hover:z-10 hover:shadow-lg transition-all group"
                    style={{
                      ...style,
                      left: `${left}%`,
                      width: `${colWidth - 0.5}%`, // slightly smaller for gap
                      marginLeft: '0.25%'
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-xs text-blue-800 dark:text-blue-200 truncate" title={course.name}>{course.name}</div>
                      <button
                        onClick={() => onRemoveCourse(course.id)}
                        className="text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Quitar del horario"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-[10px] font-semibold text-blue-900 dark:text-blue-100 leading-tight">
                      {session.startTime} - {session.endTime}
                    </div>
                    <div className="text-[10px] text-blue-700 dark:text-blue-300 leading-tight">
                      {session.classroom} - {course.group}
                    </div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 truncate">
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
