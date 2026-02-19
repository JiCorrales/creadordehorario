import { Course, CourseSession, CourseStatus } from '../types';
import { generateId, DEFAULT_COURSE_COLOR, DAYS } from '../utils';

export interface ScrapedCourse extends Omit<Course, 'id' | 'isScheduled'> {
    originalCode: string;
}

type ScrapingSource = 'student-profile' | 'matricula' | 'unknown';
type ScrapingLogLevel = 'info' | 'warn' | 'error';

export interface ScrapingLogEntry {
    timestamp: string;
    level: ScrapingLogLevel;
    event: string;
    message: string;
    metadata?: Record<string, unknown>;
}

export interface ScrapingIssue {
    code: string;
    message: string;
    metadata?: Record<string, unknown>;
}

export interface ScrapingScheduleAttempt {
    source: Exclude<ScrapingSource, 'unknown'>;
    courseCode: string;
    courseName: string;
    group: string;
    selector: string;
    rawSchedule: string;
    parsedSessions: number;
    found: boolean;
    reason?: string;
}

export interface ScrapingAttemptReport {
    attemptId: string;
    startedAt: string;
    finishedAt: string;
    source: ScrapingSource;
    selectorsMatched: string[];
    totalRows: number;
    parsedCourses: number;
    schedulesFound: number;
    schedulesMissing: number;
    scheduleAttempts: ScrapingScheduleAttempt[];
    issues: ScrapingIssue[];
    logs: ScrapingLogEntry[];
}

export interface ParseTecHtmlOptions {
    logger?: ScrapingLogger;
    onLogEntry?: (entry: ScrapingLogEntry) => void;
    throwOnStructureError?: boolean;
}

export interface ParseTecHtmlWithReportResult {
    courses: ScrapedCourse[];
    report: ScrapingAttemptReport;
}

export interface ScrapingLogger {
    info?: (entry: ScrapingLogEntry) => void;
    warn?: (entry: ScrapingLogEntry) => void;
    error?: (entry: ScrapingLogEntry) => void;
}

export class ScrapingStructureError extends Error {
    readonly code = 'SCRAPING_STRUCTURE_NOT_FOUND';

    constructor(message: string, public readonly selectorsTried: string[]) {
        super(message);
        this.name = 'ScrapingStructureError';
    }
}

export class ScrapingElementNotFoundError extends Error {
    readonly code = 'SCRAPING_ELEMENT_NOT_FOUND';

    constructor(message: string, public readonly elementType: string, public readonly selectorsTried: string[]) {
        super(message);
        this.name = 'ScrapingElementNotFoundError';
    }
}

const STATUS_MAP: Record<string, CourseStatus> = {
    presencial: 'Presencial',
    virtual: 'Virtual',
    semipresencial: 'Semipresencial',
    bimodal: 'Bimodal',
    regular: 'Regular'
};

const DAY_CODE_MAP: Record<string, string> = {
    L: DAYS[0],
    K: DAYS[1],
    M: DAYS[2],
    J: DAYS[3],
    V: DAYS[4],
    S: DAYS[5],
    D: DAYS[6]
};

const DAY_NAME_MAP: Record<string, string> = {
    lunes: DAYS[0],
    martes: DAYS[1],
    miercoles: DAYS[2],
    jueves: DAYS[3],
    viernes: DAYS[4],
    sabado: DAYS[5],
    domingo: DAYS[6]
};

const STUDENT_PROFILE_ROOT_SELECTORS = [
    '#t_guia_horario',
    '#tguiaHorario',
    '.window_pg #tguiaHorario'
];

const MATRICULA_ROOT_SELECTORS = [
    '#tBodyCursos',
    'table#tBodyCursos'
];

const STUDENT_PROFILE_TABLE_SELECTORS = [
    '#t_guia_horario table#tguiaHorario',
    '#t_guia_horario table',
    'table#tguiaHorario'
];

const STUDENT_PROFILE_ROW_SELECTORS = [
    '#t_guia_horario table tbody tr',
    '#tguiaHorario tbody tr'
];

const MATRICULA_ROW_SELECTORS = [
    '#tBodyCursos > tbody > tr[id]:not([id^="trH"])',
    '#tBodyCursos tr[id]:not([id^="trH"])'
];

const MATRICULA_GROUP_ROW_SELECTORS = [
    '.tableHorarios tbody tr',
    '.tableHorarios tr'
];

const MAX_REPORT_HISTORY = 25;
const scrapingReportHistory: ScrapingAttemptReport[] = [];

interface ScrapingContext {
    report: ScrapingAttemptReport;
    options: ParseTecHtmlOptions;
    log: (level: ScrapingLogLevel, event: string, message: string, metadata?: Record<string, unknown>) => void;
    addIssue: (issue: ScrapingIssue, level?: ScrapingLogLevel) => void;
    addScheduleAttempt: (attempt: ScrapingScheduleAttempt) => void;
    addSelectorMatch: (selector: string) => void;
}

interface ParsedSessionData {
    day: string;
    startTime: string;
    endTime: string;
}

interface ColumnMap {
    code?: number;
    name?: number;
    group?: number;
    credits?: number;
    schedule?: number;
    classroom?: number;
    professor?: number;
    quota?: number;
    status?: number;
    reserved?: number;
}

const createReport = (): ScrapingAttemptReport => ({
    attemptId: generateId(),
    startedAt: new Date().toISOString(),
    finishedAt: '',
    source: 'unknown',
    selectorsMatched: [],
    totalRows: 0,
    parsedCourses: 0,
    schedulesFound: 0,
    schedulesMissing: 0,
    scheduleAttempts: [],
    issues: [],
    logs: []
});

const cloneReport = (report: ScrapingAttemptReport): ScrapingAttemptReport => ({
    ...report,
    selectorsMatched: [...report.selectorsMatched],
    scheduleAttempts: report.scheduleAttempts.map(attempt => ({ ...attempt })),
    issues: report.issues.map(issue => ({
        ...issue,
        metadata: issue.metadata ? { ...issue.metadata } : undefined
    })),
    logs: report.logs.map(log => ({
        ...log,
        metadata: log.metadata ? { ...log.metadata } : undefined
    }))
});

const storeReportInHistory = (report: ScrapingAttemptReport): void => {
    scrapingReportHistory.unshift(cloneReport(report));
    if (scrapingReportHistory.length > MAX_REPORT_HISTORY) {
        scrapingReportHistory.length = MAX_REPORT_HISTORY;
    }
};

export const getScrapingReportHistory = (): ScrapingAttemptReport[] => {
    return scrapingReportHistory.map(cloneReport);
};

export const clearScrapingReportHistory = (): void => {
    scrapingReportHistory.length = 0;
};

export const createConsoleScrapingLogger = (): ScrapingLogger => ({
    info: (entry) => console.info(`[Scraping][${entry.event}] ${entry.message}`, entry.metadata || {}),
    warn: (entry) => console.warn(`[Scraping][${entry.event}] ${entry.message}`, entry.metadata || {}),
    error: (entry) => console.error(`[Scraping][${entry.event}] ${entry.message}`, entry.metadata || {})
});

const createScrapingContext = (options: ParseTecHtmlOptions): ScrapingContext => {
    const report = createReport();

    const log = (level: ScrapingLogLevel, event: string, message: string, metadata?: Record<string, unknown>): void => {
        const entry: ScrapingLogEntry = {
            timestamp: new Date().toISOString(),
            level,
            event,
            message,
            metadata
        };

        report.logs.push(entry);
        options.onLogEntry?.(entry);

        const logger = options.logger;
        if (!logger) {
            return;
        }

        if (level === 'info') {
            logger.info?.(entry);
        } else if (level === 'warn') {
            logger.warn?.(entry);
        } else {
            logger.error?.(entry);
        }
    };

    const addIssue = (issue: ScrapingIssue, level: ScrapingLogLevel = 'warn'): void => {
        report.issues.push(issue);
        log(level, issue.code, issue.message, issue.metadata);
    };

    const addScheduleAttempt = (attempt: ScrapingScheduleAttempt): void => {
        report.scheduleAttempts.push(attempt);
        if (attempt.found) {
            report.schedulesFound += 1;
        } else {
            report.schedulesMissing += 1;
        }
    };

    const addSelectorMatch = (selector: string): void => {
        if (!report.selectorsMatched.includes(selector)) {
            report.selectorsMatched.push(selector);
        }
    };

    return {
        report,
        options,
        log,
        addIssue,
        addScheduleAttempt,
        addSelectorMatch
    };
};

const normalizeWhitespace = (value: string | null | undefined): string => {
    return (value || '').replace(/\s+/g, ' ').trim();
};

const normalizeComparable = (value: string | null | undefined): string => {
    return normalizeWhitespace(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

const normalizeStatus = (value: string | null | undefined): CourseStatus => {
    const normalized = normalizeComparable(value);
    return STATUS_MAP[normalized] || 'Presencial';
};

const parseInteger = (value: string | null | undefined, fallback = 0): number => {
    const parsed = Number.parseInt(normalizeWhitespace(value), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const parseReserved = (value: string | null | undefined): boolean => {
    const normalized = normalizeComparable(value);
    return ['1', 'si', 's', 'true'].includes(normalized);
};

const normalizeDay = (rawDay: string | null | undefined): string | null => {
    const clean = normalizeWhitespace(rawDay);
    if (!clean) {
        return null;
    }

    const uppercase = clean.toUpperCase();
    if (DAY_CODE_MAP[uppercase]) {
        return DAY_CODE_MAP[uppercase];
    }

    const normalized = normalizeComparable(clean);
    return DAY_NAME_MAP[normalized] || null;
};

const parseNormalizedTime = (hourText: string, minuteText: string): string | null => {
    const hour = Number.parseInt(hourText, 10);
    const minute = Number.parseInt(minuteText, 10);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        return null;
    }

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
    }

    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

const parseSessionFromLine = (line: string): ParsedSessionData | null => {
    const normalizedLine = normalizeWhitespace(line);
    if (!normalizedLine) {
        return null;
    }

    const regex = /^([A-Za-z\u00C0-\u017F]{1,15})\s*(?:-|:)?\s*(\d{1,2})\s*:\s*(\d{1,2})\s*(?:-|:|a|al|hasta)\s*(\d{1,2})\s*:\s*(\d{1,2})$/i;
    const match = normalizedLine.match(regex);

    if (!match) {
        return null;
    }

    const day = normalizeDay(match[1]);
    const startTime = parseNormalizedTime(match[2], match[3]);
    const endTime = parseNormalizedTime(match[4], match[5]);

    if (!day || !startTime || !endTime) {
        return null;
    }

    return {
        day,
        startTime,
        endTime
    };
};

const parseProfileSchedule = (rawSchedule: string): ParsedSessionData[] => {
    const normalized = normalizeWhitespace(rawSchedule);
    if (!normalized) {
        return [];
    }

    const sessions: ParsedSessionData[] = [];

    const globalRegex = /([A-Za-z\u00C0-\u017F]{1,15})\s*(?:-|:)?\s*(\d{1,2})\s*:\s*(\d{1,2})\s*(?:-|:|a|al|hasta)\s*(\d{1,2})\s*:\s*(\d{1,2})/gi;
    const matches = Array.from(normalized.matchAll(globalRegex));

    matches.forEach((match) => {
        const day = normalizeDay(match[1]);
        const startTime = parseNormalizedTime(match[2], match[3]);
        const endTime = parseNormalizedTime(match[4], match[5]);

        if (!day || !startTime || !endTime) {
            return;
        }

        sessions.push({ day, startTime, endTime });
    });

    return sessions;
};

const parseMatriculaSchedule = (rawScheduleHtml: string): CourseSession[] => {
    const htmlWithBreaks = rawScheduleHtml
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(div|p|li|tr)>/gi, '\n');

    const plainText = htmlWithBreaks.replace(/<[^>]+>/g, ' ');
    const lines = plainText
        .split('\n')
        .map(line => normalizeWhitespace(line))
        .filter(Boolean);

    const sessions: CourseSession[] = [];

    for (let i = 0; i < lines.length; i++) {
        const parsed = parseSessionFromLine(lines[i]);
        if (!parsed) {
            continue;
        }

        let classroom = 'Sin aula';

        for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j];
            if (parseSessionFromLine(nextLine)) {
                break;
            }
            classroom = nextLine;
            break;
        }

        sessions.push({
            id: generateId(),
            day: parsed.day,
            startTime: parsed.startTime,
            endTime: parsed.endTime,
            classroom
        });
    }

    return sessions;
};

const addUniqueSession = (sessions: CourseSession[], session: CourseSession): void => {
    const alreadyExists = sessions.some(existing =>
        existing.day === session.day &&
        existing.startTime === session.startTime &&
        existing.endTime === session.endTime
    );

    if (!alreadyExists) {
        sessions.push(session);
    }
};

const findFirstMatchingSelector = (
    root: Pick<Document, 'querySelector'> | Pick<Element, 'querySelector'>,
    selectors: string[]
): { selector: string; element: Element } | null => {
    for (const selector of selectors) {
        const element = root.querySelector(selector);
        if (element) {
            return { selector, element };
        }
    }
    return null;
};

const findRowsBySelectors = (
    root: Pick<Document, 'querySelectorAll'> | Pick<Element, 'querySelectorAll'>,
    selectors: string[]
): { selector: string; rows: Element[] } | null => {
    for (const selector of selectors) {
        const rows = Array.from(root.querySelectorAll(selector));
        if (rows.length > 0) {
            return { selector, rows };
        }
    }
    return null;
};

const HEADER_ALIASES: Record<keyof ColumnMap, string[]> = {
    code: ['codigo'],
    name: ['materia', 'curso'],
    group: ['grupo'],
    credits: ['creditos'],
    schedule: ['horario'],
    classroom: ['aula'],
    professor: ['profesor'],
    quota: ['cupo'],
    status: ['tipo grupo', 'estado'],
    reserved: ['reservados', 'reservado']
};

const buildColumnMap = (table: HTMLTableElement | null): ColumnMap => {
    if (!table) {
        return {};
    }

    const headers = Array.from(table.querySelectorAll('thead th, thead td'));
    if (headers.length === 0) {
        return {};
    }

    const columnMap: ColumnMap = {};

    headers.forEach((header, index) => {
        const normalizedHeader = normalizeComparable(header.textContent);

        (Object.keys(HEADER_ALIASES) as Array<keyof ColumnMap>).forEach((key) => {
            if (columnMap[key] !== undefined) {
                return;
            }

            const hasAlias = HEADER_ALIASES[key].some(alias => normalizedHeader.includes(alias));
            if (hasAlias) {
                columnMap[key] = index;
            }
        });
    });

    return columnMap;
};

const getCellFromRow = (
    row: Element,
    cells: HTMLTableCellElement[],
    columnIndex: number | undefined,
    fallbackIndex: number,
    fallbackSelectors: string[] = []
): HTMLTableCellElement | null => {
    if (columnIndex !== undefined && cells[columnIndex]) {
        return cells[columnIndex];
    }

    if (cells[fallbackIndex]) {
        return cells[fallbackIndex];
    }

    for (const selector of fallbackSelectors) {
        const found = row.querySelector(selector);
        if (found instanceof HTMLTableCellElement) {
            return found;
        }
    }

    return null;
};

const parseStudentProfile = (doc: Document, context: ScrapingContext): ScrapedCourse[] => {
    const tableMatch = findFirstMatchingSelector(doc, STUDENT_PROFILE_TABLE_SELECTORS);

    if (!tableMatch || !(tableMatch.element instanceof HTMLTableElement)) {
        throw new ScrapingElementNotFoundError(
            'No se encontro la tabla de guia de horario para expediente.',
            'student_profile_table',
            STUDENT_PROFILE_TABLE_SELECTORS
        );
    }

    context.addSelectorMatch(tableMatch.selector);

    const rowsMatch = findRowsBySelectors(doc, STUDENT_PROFILE_ROW_SELECTORS);
    if (!rowsMatch) {
        throw new ScrapingElementNotFoundError(
            'No se encontraron filas de cursos en la guia de horario.',
            'student_profile_rows',
            STUDENT_PROFILE_ROW_SELECTORS
        );
    }

    context.addSelectorMatch(rowsMatch.selector);

    const rows = rowsMatch.rows;
    context.report.totalRows = rows.length;

    const columnMap = buildColumnMap(tableMatch.element);
    const courseMap = new Map<string, ScrapedCourse>();

    rows.forEach((row, rowIndex) => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 5) {
            context.addIssue({
                code: 'SCRAPING_ROW_SKIPPED',
                message: 'Fila de expediente omitida por estructura incompleta.',
                metadata: { rowIndex, cellCount: cells.length }
            });
            return;
        }

        const codeCell = getCellFromRow(row, cells, columnMap.code, 0, ['td.c1', 'td:nth-child(1)']);
        const nameCell = getCellFromRow(row, cells, columnMap.name, 1, ['td.ajuste_materia', 'td:nth-child(2)']);
        const groupCell = getCellFromRow(row, cells, columnMap.group, 2, ['td:nth-child(3)']);
        const creditsCell = getCellFromRow(row, cells, columnMap.credits, 3, ['td:nth-child(4)']);
        const scheduleCell = getCellFromRow(row, cells, columnMap.schedule, 4, ['td.ajuste_horario', 'td:nth-child(5)']);
        const classroomCell = getCellFromRow(row, cells, columnMap.classroom, 5, ['td:nth-child(6)']);
        const professorCell = getCellFromRow(row, cells, columnMap.professor, 6, ['td:nth-child(7)']);
        const quotaCell = getCellFromRow(row, cells, columnMap.quota, 7, ['td:nth-child(8)']);
        const statusCell = getCellFromRow(row, cells, columnMap.status, 9, ['td.c7', 'td:nth-child(10)']);
        const reservedCell = getCellFromRow(row, cells, columnMap.reserved, 10, ['td:nth-child(11)']);

        const code = normalizeWhitespace(codeCell?.textContent) || 'Desconocido';
        const name = normalizeWhitespace(nameCell?.textContent) || 'Desconocido';
        const group = normalizeWhitespace(groupCell?.textContent) || '0';
        const credits = parseInteger(creditsCell?.textContent, 0);
        const scheduleText = normalizeWhitespace(scheduleCell?.textContent);
        const classroom = normalizeWhitespace(classroomCell?.textContent) || 'Sin aula';
        const professor = normalizeWhitespace(professorCell?.textContent) || 'Por asignar';
        const quota = parseInteger(quotaCell?.textContent, 0);
        const status = normalizeStatus(statusCell?.textContent);
        const reserved = parseReserved(reservedCell?.textContent);

        const courseKey = `${code}-${group}`;

        let course = courseMap.get(courseKey);
        if (!course) {
            course = {
                originalCode: code,
                name,
                campus: 'Cartago',
                group,
                professor,
                credits,
                quota,
                reserved,
                status,
                sessions: [],
                color: DEFAULT_COURSE_COLOR
            };
            courseMap.set(courseKey, course);
        } else if (course.professor !== professor && professor !== 'Por asignar') {
            const currentProfs = course.professor.split(',').map(p => normalizeWhitespace(p));
            if (!currentProfs.includes(professor)) {
                course.professor = `${course.professor}, ${professor}`;
            }
        }

        const parsedSessions = parseProfileSchedule(scheduleText);

        context.addScheduleAttempt({
            source: 'student-profile',
            courseCode: code,
            courseName: name,
            group,
            selector: scheduleCell ? 'profile.schedule.column' : 'profile.schedule.missing-cell',
            rawSchedule: scheduleText,
            parsedSessions: parsedSessions.length,
            found: parsedSessions.length > 0,
            reason: parsedSessions.length > 0 ? undefined : (scheduleText ? 'Formato no reconocido' : 'Horario vacio')
        });

        if (parsedSessions.length === 0) {
            return;
        }

        parsedSessions.forEach(parsed => {
            addUniqueSession(course.sessions, {
                id: generateId(),
                day: parsed.day,
                startTime: parsed.startTime,
                endTime: parsed.endTime,
                classroom
            });
        });
    });

    return Array.from(courseMap.values());
};

const parseMatricula = (doc: Document, context: ScrapingContext): ScrapedCourse[] => {
    const rowsMatch = findRowsBySelectors(doc, MATRICULA_ROW_SELECTORS);

    if (!rowsMatch) {
        throw new ScrapingElementNotFoundError(
            'No se encontraron filas principales de cursos en matricula.',
            'matricula_rows',
            MATRICULA_ROW_SELECTORS
        );
    }

    context.addSelectorMatch(rowsMatch.selector);

    const rows = rowsMatch.rows;
    context.report.totalRows = rows.length;
    const courses: ScrapedCourse[] = [];

    rows.forEach((row, rowIndex) => {
        if (!(row instanceof HTMLTableRowElement)) {
            return;
        }

        const rowId = normalizeWhitespace(row.id);
        if (!rowId) {
            return;
        }

        const code = normalizeWhitespace(row.querySelector('.colCodigo')?.textContent) || rowId;
        const rawName = normalizeWhitespace(row.querySelector('.colMateria span, .colMateria')?.textContent) || 'Desconocido';
        const name = `${code} ${rawName}`;
        const credits = parseInteger(row.querySelector('.colCreditos')?.textContent, 0);

        const detailRow = doc.getElementById(`trH${rowId}`) || row.nextElementSibling;

        if (!detailRow) {
            context.addIssue({
                code: 'SCRAPING_DETAIL_ROW_NOT_FOUND',
                message: 'No se encontro fila de detalle para un curso de matricula.',
                metadata: { rowIndex, courseCode: code, detailRowId: `trH${rowId}` }
            });
            return;
        }

        const groupRowsMatch = findRowsBySelectors(detailRow, MATRICULA_GROUP_ROW_SELECTORS);
        const groupRows = groupRowsMatch?.rows;

        if (!groupRows || groupRows.length === 0) {
            context.addIssue({
                code: 'SCRAPING_GROUP_ROWS_NOT_FOUND',
                message: 'No se encontraron filas de grupos en el detalle de matricula.',
                metadata: { rowIndex, courseCode: code }
            });
            return;
        }

        if (groupRowsMatch) {
            context.addSelectorMatch(`detail:${groupRowsMatch.selector}`);
        }

        groupRows.forEach((groupRow) => {
            const campus = normalizeWhitespace(groupRow.querySelector('.colHoSede, td:nth-child(1)')?.textContent);
            const group = normalizeWhitespace(groupRow.querySelector('.colHoGrupo, td:nth-child(2)')?.textContent);

            const professorHtml = groupRow.querySelector('.colHoProfesor, td:nth-child(4)')?.innerHTML || '';
            const professor = normalizeWhitespace(
                professorHtml
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<[^>]+>/g, ' ')
                    .split('\n')[0]
            ) || 'Por asignar';

            const quota = parseInteger(groupRow.querySelector('.colHoCupo span, .colHoCupo, td:nth-child(5)')?.textContent, 0);
            const reserved = parseReserved(groupRow.querySelector('.colHoReservado, td:nth-child(6)')?.textContent);
            const status = normalizeStatus(groupRow.querySelector('.colHoEstado, td:nth-child(7)')?.textContent);

            const scheduleCell = groupRow.querySelector('.colHoHorario, td:nth-child(3)');
            const rawScheduleHtml = scheduleCell?.innerHTML || '';
            const rawScheduleText = normalizeWhitespace(rawScheduleHtml.replace(/<[^>]+>/g, ' '));
            const sessions = parseMatriculaSchedule(rawScheduleHtml);

            context.addScheduleAttempt({
                source: 'matricula',
                courseCode: code,
                courseName: name,
                group,
                selector: scheduleCell ? 'matricula.colHoHorario' : 'matricula.missing-schedule-cell',
                rawSchedule: rawScheduleText,
                parsedSessions: sessions.length,
                found: sessions.length > 0,
                reason: sessions.length > 0 ? undefined : (rawScheduleText ? 'Formato no reconocido' : 'Horario vacio')
            });

            courses.push({
                originalCode: code,
                name,
                campus,
                group,
                professor,
                credits,
                quota,
                reserved,
                status,
                sessions,
                color: DEFAULT_COURSE_COLOR
            });
        });
    });

    return courses;
};

export const parseTecHtmlWithReport = (htmlContent: string, options: ParseTecHtmlOptions = {}): ParseTecHtmlWithReportResult => {
    const context = createScrapingContext(options);
    context.log('info', 'SCRAPING_ATTEMPT_STARTED', 'Inicio de intento de scraping.', {
        inputLength: htmlContent.length
    });

    let courses: ScrapedCourse[] = [];

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        const studentProfileRoot = findFirstMatchingSelector(doc, STUDENT_PROFILE_ROOT_SELECTORS);
        const matriculaRoot = findFirstMatchingSelector(doc, MATRICULA_ROOT_SELECTORS);

        if (studentProfileRoot) {
            context.report.source = 'student-profile';
            context.addSelectorMatch(studentProfileRoot.selector);
            courses = parseStudentProfile(doc, context);
        } else if (matriculaRoot) {
            context.report.source = 'matricula';
            context.addSelectorMatch(matriculaRoot.selector);
            courses = parseMatricula(doc, context);
        } else {
            throw new ScrapingStructureError(
                'No se encontro estructura compatible para scraping (ni expediente ni matricula).',
                [...STUDENT_PROFILE_ROOT_SELECTORS, ...MATRICULA_ROOT_SELECTORS]
            );
        }
    } catch (error) {
        if (error instanceof ScrapingStructureError) {
            context.addIssue({
                code: error.code,
                message: error.message,
                metadata: { selectorsTried: error.selectorsTried }
            }, 'error');

            if (options.throwOnStructureError) {
                throw error;
            }
        } else if (error instanceof ScrapingElementNotFoundError) {
            context.addIssue({
                code: error.code,
                message: error.message,
                metadata: {
                    elementType: error.elementType,
                    selectorsTried: error.selectorsTried
                }
            }, 'warn');
        } else {
            const unknownError = error as Error;
            context.addIssue({
                code: 'SCRAPING_UNEXPECTED_ERROR',
                message: unknownError?.message || 'Error inesperado durante el scraping.',
                metadata: {
                    name: unknownError?.name || 'Error'
                }
            }, 'error');
        }
    }

    context.report.parsedCourses = courses.length;
    context.report.finishedAt = new Date().toISOString();

    context.log('info', 'SCRAPING_ATTEMPT_FINISHED', 'Fin de intento de scraping.', {
        source: context.report.source,
        totalRows: context.report.totalRows,
        parsedCourses: context.report.parsedCourses,
        schedulesFound: context.report.schedulesFound,
        schedulesMissing: context.report.schedulesMissing
    });

    storeReportInHistory(context.report);

    return {
        courses,
        report: cloneReport(context.report)
    };
};

export const parseTecHtml = (htmlContent: string, options: ParseTecHtmlOptions = {}): ScrapedCourse[] => {
    return parseTecHtmlWithReport(htmlContent, options).courses;
};
