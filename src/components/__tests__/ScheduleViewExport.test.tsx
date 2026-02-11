import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ScheduleView from '../ScheduleView';
import { Schedule, Course } from '../../types';

// Mock jsPDF
const mockSetFillColor = vi.fn();
const mockSetTextColor = vi.fn();
const mockRect = vi.fn();
const mockText = vi.fn();
const mockSave = vi.fn();
const mockLine = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetFont = vi.fn();
const mockSetDrawColor = vi.fn();

vi.mock('jspdf', () => {
  return {
    default: class jsPDF {
      internal = {
        pageSize: {
          getWidth: () => 297,
          getHeight: () => 210
        }
      };
      setFillColor = mockSetFillColor;
      setTextColor = mockSetTextColor;
      rect = mockRect;
      text = mockText;
      save = mockSave;
      line = mockLine;
      setFontSize = mockSetFontSize;
      setFont = mockSetFont;
      setDrawColor = mockSetDrawColor;
    }
  };
});

vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

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
  color: '#0066CC', // Blue: R=0, G=102, B=204
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

describe('ScheduleView Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports visual PDF with correct colors in Light Mode', async () => {
    render(
      <ScheduleView
        schedule={mockSchedule}
        onRemoveCourse={() => {}}
        onEditCourse={() => {}}
        theme="light"
      />
    );

    // Open export menu
    fireEvent.click(screen.getByText('Exportar'));

    // Click Visual Export
    fireEvent.click(screen.getByText('Horario Gráfico'));

    await waitFor(() => {
        expect(mockSave).toHaveBeenCalledWith('Mi Horario_Grafico.pdf');
    });

    // Verify Light Mode Colors
    // Course Color: #0066CC -> R=0, G=102, B=204
    // Background Formula (Light): C_out = C_in * 0.25 + 255 * 0.75
    // R: 0 * 0.25 + 255 * 0.75 = 191
    // G: 102 * 0.25 + 255 * 0.75 = 217
    // B: 204 * 0.25 + 255 * 0.75 = 242

    expect(mockSetFillColor).toHaveBeenCalledWith(191, 217, 242);
    expect(mockSetTextColor).toHaveBeenCalledWith(50, 50, 50); // Dark Gray Text
  });

  it('exports visual PDF with correct colors in Dark Mode', async () => {
    render(
      <ScheduleView
        schedule={mockSchedule}
        onRemoveCourse={() => {}}
        onEditCourse={() => {}}
        theme="dark"
      />
    );

    // Open export menu
    fireEvent.click(screen.getByText('Exportar'));

    // Click Visual Export
    fireEvent.click(screen.getByText('Horario Gráfico'));

    await waitFor(() => {
        expect(mockSave).toHaveBeenCalledWith('Mi Horario_Grafico.pdf');
    });

    // Verify Dark Mode Colors
    // Background: Dark Gray [31, 41, 55]
    expect(mockSetFillColor).toHaveBeenCalledWith(31, 41, 55);

    // Text: White [255, 255, 255]
    expect(mockSetTextColor).toHaveBeenCalledWith(255, 255, 255);

    // Course Background Formula (Dark): C_out = C_in * 0.25 + BG * 0.75
    // BG = [31, 41, 55]
    // R: 0 * 0.25 + 31 * 0.75 = 0 + 23.25 = 23
    // G: 102 * 0.25 + 41 * 0.75 = 25.5 + 30.75 = 56.25 -> 56
    // B: 204 * 0.25 + 55 * 0.75 = 51 + 41.25 = 92.25 -> 92

    expect(mockSetFillColor).toHaveBeenCalledWith(23, 56, 92);
    expect(mockSetTextColor).toHaveBeenCalledWith(200, 200, 200); // Light Gray Text
  });
});
