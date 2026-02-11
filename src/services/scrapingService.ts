import { Course, CourseSession, CourseStatus } from '../types';
import { generateId, DEFAULT_COURSE_COLOR } from '../utils';

export interface ScrapedCourse extends Omit<Course, 'id' | 'isScheduled'> {
    originalCode: string; // To help grouping
}

const DAYS_MAP: Record<string, string> = {
    'L': 'Lunes',
    'K': 'Martes',
    'M': 'Miércoles',
    'J': 'Jueves',
    'V': 'Viernes',
    'S': 'Sábado',
    'D': 'Domingo'
};

const STATUS_MAP: Record<string, CourseStatus> = {
    'Presencial': 'Presencial',
    'Virtual': 'Virtual',
    'Semipresencial': 'Semipresencial',
    'Bimodal': 'Bimodal',
    'Regular': 'Regular'
};

export const parseTecHtml = (htmlContent: string): ScrapedCourse[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Detect if it is the Student Profile (Expediente) or Matricula
    // The profile has div elements with class 'window_pg' for courses
    const isStudentProfile = doc.querySelectorAll('.window_pg').length > 0;

    if (isStudentProfile) {
        return parseStudentProfile(doc);
    } else {
        return parseMatricula(doc);
    }
};

const parseMatricula = (doc: Document): ScrapedCourse[] => {
    const courses: ScrapedCourse[] = [];

    // Find all main course rows (they have an id but are not accordion details)
    const rows = Array.from(doc.querySelectorAll('#tBodyCursos > tbody > tr'));

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const id = row.id;

        // Skip if it's a detail row or has no ID
        if (!id || id.startsWith('trH')) continue;

        const codeCell = row.querySelector('.colCodigo');
        if (!codeCell) continue;
        const code = codeCell.textContent?.trim() || id;

        const nameCell = row.querySelector('.colMateria span');
        const rawName = nameCell?.textContent?.trim() || 'Desconocido';
        const name = `${code} ${rawName}`;

        const creditsCell = row.querySelector('.colCreditos');
        const credits = parseInt(creditsCell?.textContent?.trim() || '0');

        // Now look for the detail row
        const detailRowId = `trH${id}`;
        const detailRow = doc.getElementById(detailRowId);

        if (detailRow) {
            // Parse groups from the detail row
            const groupRows = Array.from(detailRow.querySelectorAll('.tableHorarios tbody tr'));

            groupRows.forEach(gRow => {
                const campus = gRow.querySelector('.colHoSede')?.textContent?.trim() || '';
                const group = gRow.querySelector('.colHoGrupo')?.textContent?.trim() || '';
                const professorRaw = gRow.querySelector('.colHoProfesor')?.innerHTML || '';
                const professor = professorRaw.split('<br>')[0].trim(); // Take first line or clean up

                const quotaCell = gRow.querySelector('.colHoCupo span');
                const quota = parseInt(quotaCell?.textContent?.trim() || '0');

                const reservedCell = gRow.querySelector('.colHoReservado');
                const reserved = reservedCell?.textContent?.trim().toLowerCase() === 'sí';

                const statusCell = gRow.querySelector('.colHoEstado');
                const statusText = statusCell?.textContent?.trim() || 'Presencial';
                const status: CourseStatus = STATUS_MAP[statusText] || 'Presencial';

                // Parse Schedule
                const scheduleCell = gRow.querySelector('.colHoHorario');
                const sessions: CourseSession[] = [];

                if (scheduleCell) {
                    const html = scheduleCell.innerHTML;
                    const parts = html.split('<br>').map(p => p.trim()).filter(p => p);

                    // Pattern: "L 07:30-10:20"
                    const timeRegex = /([LKMJVSD])\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/;

                    for (let j = 0; j < parts.length; j++) {
                        const match = parts[j].match(timeRegex);
                        if (match) {
                            const [_, dayCode, start, end] = match;
                            let classroom = 'Sin aula';
                            if (j + 1 < parts.length && !parts[j+1].match(timeRegex)) {
                                classroom = parts[j+1];
                            }

                            sessions.push({
                                id: generateId(),
                                day: DAYS_MAP[dayCode] || dayCode,
                                startTime: start.padStart(5, '0'),
                                endTime: end.padStart(5, '0'),
                                classroom: classroom
                            });
                        }
                    }
                }

                courses.push({
                    originalCode: code,
                    name: name,
                    campus: campus,
                    group: group,
                    professor: professor,
                    credits: credits,
                    quota: quota,
                    reserved: reserved,
                    status: status,
                    sessions: sessions,
                    color: DEFAULT_COURSE_COLOR
                });
            });
        }
    }
    return courses;
};

const parseStudentProfile = (doc: Document): ScrapedCourse[] => {
    const courses: ScrapedCourse[] = [];
    const rows = Array.from(doc.querySelectorAll('#t_guia_horario table tbody tr'));

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 7) return;

        const code = cells[0].textContent?.trim() || 'Desconocido';
        const name = cells[1].textContent?.trim() || 'Desconocido';
        const group = cells[2].textContent?.trim() || '0';
        const credits = parseInt(cells[3].textContent?.trim() || '0');
        const scheduleText = cells[4].textContent?.trim() || '';
        const classroom = cells[5].textContent?.trim() || 'Sin aula';
        const professor = cells[6].textContent?.trim() || 'Por asignar';
        const quota = parseInt(cells[7]?.textContent?.trim() || '0');
        const statusText = cells[9]?.textContent?.trim() || 'Presencial';
        const status: CourseStatus = STATUS_MAP[statusText] || 'Presencial';
        const reserved = cells[10]?.textContent?.trim() === '1';

        // Parse Schedule
        // Format example: "Martes - 9:30:11:20"
        const sessions: CourseSession[] = [];
        if (scheduleText) {
            const parts = scheduleText.split('-').map(p => p.trim());
            if (parts.length >= 2) {
                const dayName = parts[0]; // e.g., "Martes"
                // The time part might be "9:30:11:20"
                const timePart = parts[1];

                // Regex to match H:MM:H:MM or HH:MM:HH:MM
                const timeMatch = timePart.match(/(\d{1,2}):(\d{2}):(\d{1,2}):(\d{2})/);

                if (timeMatch) {
                    const [_, startH, startM, endH, endM] = timeMatch;
                    const startTime = `${startH.padStart(2, '0')}:${startM}`;
                    const endTime = `${endH.padStart(2, '0')}:${endM}`;

                    sessions.push({
                        id: generateId(),
                        day: dayName,
                        startTime: startTime,
                        endTime: endTime,
                        classroom: classroom
                    });
                }
            }
        }

        courses.push({
            originalCode: code,
            name: name,
            campus: 'Cartago', // Default fallback
            group: group,
            professor: professor,
            credits: credits,
            quota: quota,
            reserved: reserved,
            status: status,
            sessions: sessions,
            color: DEFAULT_COURSE_COLOR
        });
    });

    return courses;
};
