import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ScheduleView from '../ScheduleView';
import { Schedule, Course } from '../../types';
import { DEFAULT_COURSE_COLOR } from '../../utils';

const mockCourse: Course = {
  id: 'c1',
  name: 'Calculo I',
  campus: 'Cartago',
  group: '01',
  professor: 'Juan Perez',
  credits: 4,
  quota: 30,
  reserved: false,
  status: 'Presencial',
  isScheduled: true,
  color: DEFAULT_COURSE_COLOR,
  sessions: [
    { id: 's1', day: 'Lunes', startTime: '07:30', endTime: '09:20', classroom: 'K1' }
  ]
};

const mockSchedule: Schedule = {
  id: 'sch1',
  name: 'Mi Horario',
  courses: [mockCourse],
  createdAt: Date.now()
};

describe('ScheduleView Editing', () => {
  it('calls onEditCourse when clicking a course block', () => {
    const handleEdit = vi.fn();
    const handleRemove = vi.fn();

    render(
      <ScheduleView
        schedule={mockSchedule}
        onRemoveCourse={handleRemove}
        onEditCourse={handleEdit}
        theme="light"
      />
    );

    // Find the course block by name
    const courseElement = screen.getByText('Calculo I');

    // Click it
    fireEvent.click(courseElement);

    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(mockCourse);
  });

  it('does NOT call onEditCourse when clicking the remove button', () => {
    const handleEdit = vi.fn();
    const handleRemove = vi.fn();

    render(
      <ScheduleView
        schedule={mockSchedule}
        onRemoveCourse={handleRemove}
        onEditCourse={handleEdit}
        theme="light"
      />
    );

    // Find the remove button
    const removeBtn = screen.getByTitle('Quitar del horario');

    fireEvent.click(removeBtn);

    expect(handleRemove).toHaveBeenCalledTimes(1);
    expect(handleRemove).toHaveBeenCalledWith(mockCourse.id);
    expect(handleEdit).not.toHaveBeenCalled();
  });
});
