import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearScrapingReportHistory,
    getScrapingReportHistory,
    parseTecHtml,
    parseTecHtmlWithReport,
    ScrapingStructureError
} from '../scrapingService';
import { DAYS } from '../../utils';
import webPage2Fixture from '../../tecScraping/webPage2.html?raw';

describe('Scraping Service', () => {
    beforeEach(() => {
        clearScrapingReportHistory();
    });

    it('should parse student profile rows with single-digit minutes from webPage2 format', () => {
        const html = `
        <div id="t_guia_horario">
            <table id="tguiaHorario">
                <thead>
                    <tr>
                        <th>Codigo</th><th>Materia</th><th>Grupo</th><th>Creditos</th><th>Horario</th><th>Aula</th><th>Profesor</th><th>Cupo</th><th>Tipo Materia</th><th>Tipo Grupo</th><th>Reservados</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>AE1123</td>
                        <td>Contabilidad II</td>
                        <td>05</td>
                        <td>4</td>
                        <td class="ajuste_horario">Miercoles - 18:0:21:50</td>
                        <td>B1-07</td>
                        <td>Docente Uno</td>
                        <td>32</td>
                        <td>Curso Comun</td>
                        <td>Semipresencial</td>
                        <td>0</td>
                    </tr>
                    <tr>
                        <td>AE1123</td>
                        <td>Contabilidad II</td>
                        <td>05</td>
                        <td>4</td>
                        <td class="ajuste_horario">Martes - 18:0:21:50</td>
                        <td>B1-07</td>
                        <td>Docente Uno</td>
                        <td>32</td>
                        <td>Curso Comun</td>
                        <td>Semipresencial</td>
                        <td>0</td>
                    </tr>
                </tbody>
            </table>
        </div>
        `;

        const courses = parseTecHtml(html);

        expect(courses.length).toBe(1);
        expect(courses[0].sessions.length).toBe(2);

        const wednesdaySession = courses[0].sessions.find(s => s.day === DAYS[2]);
        const tuesdaySession = courses[0].sessions.find(s => s.day === DAYS[1]);

        expect(wednesdaySession?.startTime).toBe('18:00');
        expect(wednesdaySession?.endTime).toBe('21:50');
        expect(tuesdaySession?.startTime).toBe('18:00');
    });

    it('should parse the real webPage2 fixture without losing schedules', () => {
        const { courses, report } = parseTecHtmlWithReport(webPage2Fixture);

        expect(courses.length).toBeGreaterThan(0);
        expect(report.schedulesMissing).toBe(0);

        const sample = courses.find(course => course.originalCode === 'AE1123');
        expect(sample).toBeDefined();
        expect(sample?.sessions.length).toBeGreaterThan(0);
        expect(sample?.sessions[0].day).toBe(DAYS[2]);
        expect(sample?.sessions[0].startTime).toBe('18:00');
        expect(sample?.sessions[0].endTime).toBe('21:50');
    });

    it('should deduplicate identical sessions in student profile', () => {
        const html = `
        <div id="t_guia_horario">
            <table id="tguiaHorario">
                <tbody>
                    <tr>
                        <td>CA2125</td>
                        <td>Elementos de computacion</td>
                        <td>01</td>
                        <td>3</td>
                        <td>Martes - 9:30:11:20</td>
                        <td>B6-04</td>
                        <td>Profesor 1</td>
                        <td>24</td>
                        <td>Curso Comun</td>
                        <td>Regular</td>
                        <td>1</td>
                    </tr>
                    <tr>
                        <td>CA2125</td>
                        <td>Elementos de computacion</td>
                        <td>01</td>
                        <td>3</td>
                        <td>Martes - 9:30:11:20</td>
                        <td>B6-04</td>
                        <td>Profesor 2</td>
                        <td>24</td>
                        <td>Curso Comun</td>
                        <td>Regular</td>
                        <td>1</td>
                    </tr>
                </tbody>
            </table>
        </div>
        `;

        const courses = parseTecHtml(html);

        expect(courses.length).toBe(1);
        expect(courses[0].sessions.length).toBe(1);
    });

    it('should parse student profile with reordered columns using header mapping', () => {
        const html = `
        <div id="t_guia_horario">
            <table id="tguiaHorario">
                <thead>
                    <tr>
                        <th>Materia</th>
                        <th>Codigo</th>
                        <th>Horario</th>
                        <th>Grupo</th>
                        <th>Creditos</th>
                        <th>Aula</th>
                        <th>Profesor</th>
                        <th>Cupo</th>
                        <th>Tipo Grupo</th>
                        <th>Reservados</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Matematica Financiera</td>
                        <td>AE2125</td>
                        <td>Miercoles - 8:5:10:0</td>
                        <td>05</td>
                        <td>3</td>
                        <td>B1-10</td>
                        <td>Docente Prueba</td>
                        <td>25</td>
                        <td>Semipresencial</td>
                        <td>1</td>
                    </tr>
                </tbody>
            </table>
        </div>
        `;

        const courses = parseTecHtml(html);

        expect(courses.length).toBe(1);
        expect(courses[0].originalCode).toBe('AE2125');
        expect(courses[0].group).toBe('05');
        expect(courses[0].status).toBe('Semipresencial');
        expect(courses[0].reserved).toBe(true);
        expect(courses[0].sessions[0].day).toBe(DAYS[2]);
        expect(courses[0].sessions[0].startTime).toBe('08:05');
        expect(courses[0].sessions[0].endTime).toBe('10:00');
    });

    it('should parse matricula schedule rows with br variants and single-digit minutes', () => {
        const html = `
        <table id="tBodyCursos">
            <tbody>
                <tr id="CI1230">
                    <td class="colCodigo">CI1230</td>
                    <td class="colMateria"><span>Ingles I</span></td>
                    <td class="colCreditos">2</td>
                </tr>
                <tr id="trHCI1230">
                    <td colspan="7">
                        <table class="tableHorarios">
                            <tbody>
                                <tr>
                                    <td class="colHoSede">Cartago</td>
                                    <td class="colHoGrupo">1</td>
                                    <td class="colHoHorario">L 07:30-10:20<br/>B1-07<br/>J 11:0-12:50<br>B2-01</td>
                                    <td class="colHoProfesor">Profesor A<br/></td>
                                    <td class="colHoCupo"><span>10</span></td>
                                    <td class="colHoReservado">Si</td>
                                    <td class="colHoEstado">Virtual</td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            </tbody>
        </table>
        `;

        const courses = parseTecHtml(html);

        expect(courses.length).toBe(1);
        expect(courses[0].originalCode).toBe('CI1230');
        expect(courses[0].sessions.length).toBe(2);
        expect(courses[0].sessions[0].day).toBe(DAYS[0]);
        expect(courses[0].sessions[0].classroom).toBe('B1-07');
        expect(courses[0].sessions[1].day).toBe(DAYS[3]);
        expect(courses[0].sessions[1].startTime).toBe('11:00');
    });

    it('should report found and missing schedules with detailed attempts', () => {
        const html = `
        <div id="t_guia_horario">
            <table id="tguiaHorario">
                <tbody>
                    <tr>
                        <td>AE2705</td><td>Analisis y gestion</td><td>05</td><td>3</td><td>Lunes - 18:0:21:50</td><td>B1-10</td><td>Docente A</td><td>24</td><td>Curso Unico</td><td>Semipresencial</td><td>0</td>
                    </tr>
                    <tr>
                        <td>AE3128</td><td>Administracion financiera</td><td>05</td><td>4</td><td>Horario pendiente</td><td>B1-07</td><td>Docente B</td><td>25</td><td>Curso Comun</td><td>Semipresencial</td><td>0</td>
                    </tr>
                </tbody>
            </table>
        </div>
        `;

        const { courses, report } = parseTecHtmlWithReport(html);

        expect(courses.length).toBe(2);
        expect(report.schedulesFound).toBe(1);
        expect(report.schedulesMissing).toBe(1);
        expect(report.scheduleAttempts.length).toBe(2);

        const missingAttempt = report.scheduleAttempts.find(attempt => !attempt.found);
        expect(missingAttempt?.courseCode).toBe('AE3128');
        expect(missingAttempt?.reason).toBe('Formato no reconocido');
    });

    it('should keep a history of scraping attempts for monitoring', () => {
        const html = `
        <div id="t_guia_horario">
            <table id="tguiaHorario">
                <tbody>
                    <tr>
                        <td>AE2705</td><td>Analisis y gestion</td><td>05</td><td>3</td><td>Lunes - 18:0:21:50</td><td>B1-10</td><td>Docente A</td><td>24</td><td>Curso Unico</td><td>Semipresencial</td><td>0</td>
                    </tr>
                </tbody>
            </table>
        </div>
        `;

        parseTecHtmlWithReport(html);

        const history = getScrapingReportHistory();
        expect(history.length).toBe(1);
        expect(history[0].source).toBe('student-profile');
        expect(history[0].schedulesFound).toBe(1);
    });

    it('should throw a specific error when structure is not supported and throwOnStructureError is true', () => {
        const html = '<div><p>HTML sin tablas esperadas</p></div>';

        expect(() => parseTecHtmlWithReport(html, { throwOnStructureError: true })).toThrowError(ScrapingStructureError);
    });

    it('should return report issues when structure is not supported and throwOnStructureError is false', () => {
        const html = '<div><p>HTML sin tablas esperadas</p></div>';

        const result = parseTecHtmlWithReport(html, { throwOnStructureError: false });

        expect(result.courses.length).toBe(0);
        expect(result.report.issues.some(issue => issue.code === 'SCRAPING_STRUCTURE_NOT_FOUND')).toBe(true);
    });
});
