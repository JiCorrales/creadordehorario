export type CourseStatus = 'Presencial' | 'Virtual' | 'Semipresencial' | 'Asistido' | 'Bimodal' | 'Regular';

export interface CourseSession {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  classroom: string;
}

export interface Course {
  id: string;
  name: string;
  campus: string;
  group: string;
  professor: string;
  credits: number;
  quota: number;
  reserved: boolean;
  status: CourseStatus;
  sessions: CourseSession[]; // Changed from flat structure to sessions array
  isScheduled: boolean; // New field for pending/scheduled state
  color?: string; // Hex color for the course
}

export interface Schedule {
  id: string;
  name: string;
  courses: Course[];
  createdAt: number;
}
