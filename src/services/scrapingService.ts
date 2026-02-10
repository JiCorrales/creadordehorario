import { Course, CourseSession, CourseStatus } from '../types';
import { generateId } from '../utils';

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
    'Bimodal': 'Semipresencial', // Map unknown to closest
    'Regular': 'Presencial' // Assuming Regular = Presencial
};

export const parseTecHtml = (htmlContent: string): ScrapedCourse[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const courses: ScrapedCourse[] = [];

    // Find all main course rows (they have an id but are not accordion details)
    // The structure is: <tr id="CODE">...</tr> followed by <tr id="trHCODE">...</tr>
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
        const name = nameCell?.textContent?.trim() || 'Desconocido';

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
                    
                    // Iterate parts to find time patterns
                    // Pattern: "L 07:30-10:20"
                    const timeRegex = /([LKMJVSD])\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/;
                    
                    for (let j = 0; j < parts.length; j++) {
                        const match = parts[j].match(timeRegex);
                        if (match) {
                            const [_, dayCode, start, end] = match;
                            // The next part is usually the classroom, unless it's another time
                            let classroom = 'Sin aula';
                            if (j + 1 < parts.length && !parts[j+1].match(timeRegex)) {
                                classroom = parts[j+1];
                                // Skip the classroom part in next iteration? 
                                // Actually the loop will just check it and fail regex, which is fine.
                                // But if we consume it, we should maybe increment j. 
                                // However, simple iteration is safer.
                            }

                            sessions.push({
                                id: generateId(),
                                day: DAYS_MAP[dayCode] || dayCode,
                                startTime: start.padStart(5, '0'), // Ensure 07:30 format
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
                    sessions: sessions
                });
            });
        }
    }

    return courses;
};
