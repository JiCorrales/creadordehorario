import { useState, useEffect } from 'react';
import { Course, Schedule, CourseSession } from '../types';
import { generateId } from '../utils';

export const useSchedule = () => {

  const migrateSchedules = (data: any[]): Schedule[] => {
    if (!Array.isArray(data)) return [];

    return data.map(schedule => ({
      ...schedule,
      courses: (schedule.courses || []).map((course: any) => {
        // If sessions already exists, return as is (assuming valid)
        if (course.sessions && Array.isArray(course.sessions)) {
          return {
             ...course,
             // Ensure isScheduled exists, default to true if undefined for existing courses that might have been migrated partially or manually
             isScheduled: course.isScheduled !== undefined ? course.isScheduled : true
          };
        }

        // Migrate old course structure
        // Old structure had: day, startTime, endTime, classroom
        return {
          ...course,
          isScheduled: true, // Old courses were implicitly scheduled
          sessions: [{
            id: generateId(),
            day: course.day || 'Lunes',
            startTime: course.startTime || '00:00',
            endTime: course.endTime || '00:00',
            classroom: course.classroom || ''
          }]
        };
      })
    }));
  };

  const [schedules, setSchedules] = useState<Schedule[]>(() => {
    try {
      const saved = localStorage.getItem('schedules');
      return saved ? migrateSchedules(JSON.parse(saved)) : [];
    } catch (e) {
      console.error("Error parsing schedules:", e);
      return [];
    }
  });

  const [currentScheduleId, setCurrentScheduleId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('schedules');
      const parsed = saved ? migrateSchedules(JSON.parse(saved)) : [];
      return parsed.length > 0 ? parsed[0].id : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    localStorage.setItem('schedules', JSON.stringify(schedules));
  }, [schedules]);

  const currentSchedule = schedules.find(s => s.id === currentScheduleId) || null;

  const createSchedule = (name: string) => {
    const newSchedule: Schedule = {
      id: generateId(),
      name,
      courses: [],
      createdAt: Date.now(),
    };
    setSchedules([...schedules, newSchedule]);
    setCurrentScheduleId(newSchedule.id);
  };

  const deleteSchedule = (id: string) => {
    const newSchedules = schedules.filter(s => s.id !== id);
    setSchedules(newSchedules);
    if (currentScheduleId === id) {
      setCurrentScheduleId(newSchedules.length > 0 ? newSchedules[0].id : null);
    }
  };

  const parseTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Check if a specific session overlaps with any session in a list of courses
  const checkSessionConflict = (newSession: CourseSession, existingCourses: Course[]): boolean => {
    // Only check against scheduled courses
    const scheduledCourses = existingCourses.filter(c => c.isScheduled);

    return scheduledCourses.some(course => {
      return course.sessions.some(session => {
        if (session.day !== newSession.day) return false;

        const startA = parseTime(newSession.startTime);
        const endA = parseTime(newSession.endTime);
        const startB = parseTime(session.startTime);
        const endB = parseTime(session.endTime);

        return (startA < endB) && (endA > startB);
      });
    });
  };

  const checkCourseConflicts = (courseToCheck: Course, existingCourses: Course[]): string | null => {
    for (const session of courseToCheck.sessions) {
      if (checkSessionConflict(session, existingCourses)) {
        return `Choque de horario: ${session.day} ${session.startTime} - ${session.endTime}`;
      }
    }
    return null;
  };

  const addCourse = (course: Course) => {
    if (!currentScheduleId) return;

    setSchedules(schedules.map(s => {
      if (s.id === currentScheduleId) {
        return {
          ...s,
          courses: [...s.courses, { ...course, isScheduled: false }]
        };
      }
      return s;
    }));
  };

  const addCourses = (newCourses: Course[]) => {
    if (!currentScheduleId) return;

    setSchedules(schedules.map(s => {
      if (s.id === currentScheduleId) {
        return {
          ...s,
          courses: [...s.courses, ...newCourses]
        };
      }
      return s;
    }));
  };

  const updateCourse = (updatedCourse: Course) => {
    if (!currentScheduleId) return;

    setSchedules(schedules.map(s => {
      if (s.id === currentScheduleId) {
        if (updatedCourse.isScheduled) {
           const otherCourses = s.courses.filter(c => c.id !== updatedCourse.id);
           const conflict = checkCourseConflicts(updatedCourse, otherCourses);
           if (conflict) {
             throw new Error(conflict);
           }
        }

        return {
          ...s,
          courses: s.courses.map(c => c.id === updatedCourse.id ? updatedCourse : c)
        };
      }
      return s;
    }));
  };

  const removeCourse = (courseId: string) => {
    if (!currentScheduleId) return;
    setSchedules(schedules.map(schedule => {
      if (schedule.id === currentScheduleId) {
        return {
          ...schedule,
          courses: schedule.courses.filter(c => c.id !== courseId)
        };
      }
      return schedule;
    }));
  };

  const toggleCourseStatus = (courseId: string) => {
    if (!currentScheduleId) return;

    const schedule = schedules.find(s => s.id === currentScheduleId);
    if (!schedule) return;

    const course = schedule.courses.find(c => c.id === courseId);
    if (!course) return;

    if (!course.isScheduled) {
      // Trying to schedule it: Check conflicts
      const otherCourses = schedule.courses.filter(c => c.id !== courseId);
      const conflict = checkCourseConflicts(course, otherCourses);

      if (conflict) {
        throw new Error(conflict);
      }
    }

    setSchedules(schedules.map(s => {
      if (s.id === currentScheduleId) {
        return {
          ...s,
          courses: s.courses.map(c =>
            c.id === courseId ? { ...c, isScheduled: !c.isScheduled } : c
          )
        };
      }
      return s;
    }));
  };

  const importCourses = (sourceScheduleId: string) => {
    if (!currentScheduleId) return;

    const sourceSchedule = schedules.find(s => s.id === sourceScheduleId);
    if (!sourceSchedule) return;

    const newCourses = sourceSchedule.courses.map(c => ({
        ...c,
        id: generateId(), // Regenerate ID to avoid conflicts if we import multiple times or edit independently
        isScheduled: false, // Import as pending
        // Regenerate session IDs too
        sessions: c.sessions.map(s => ({ ...s, id: generateId() }))
    }));

    setSchedules(schedules.map(s => {
        if (s.id === currentScheduleId) {
            return {
                ...s,
                courses: [...s.courses, ...newCourses]
            };
        }
        return s;
    }));
  };

  return {
    schedules,
    currentSchedule,
    currentScheduleId,
    setCurrentScheduleId,
    createSchedule,
    deleteSchedule,
    addCourse,
    removeCourse,
    updateCourse,
    toggleCourseStatus,
    importCourses,
    addCourses
  };
};
