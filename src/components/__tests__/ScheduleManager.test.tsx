import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScheduleManager from '../ScheduleManager';
import { Schedule } from '../../types';

describe('ScheduleManager', () => {
    const mockSchedules: Schedule[] = [
        { id: '1', name: 'Horario 1', courses: [], createdAt: Date.now() },
        { id: '2', name: 'Horario 2', courses: [], createdAt: Date.now() }
    ];

    const mockProps = {
        schedules: mockSchedules,
        currentScheduleId: '1',
        onSwitchSchedule: vi.fn(),
        onCreateSchedule: vi.fn(),
        onDeleteSchedule: vi.fn(),
        onRenameSchedule: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders schedules', () => {
        render(<ScheduleManager {...mockProps} />);
        expect(screen.getByText('Horario 1')).toBeInTheDocument();
        expect(screen.getByText('Horario 2')).toBeInTheDocument();
    });

    it('enters edit mode when clicking edit button', async () => {
        render(<ScheduleManager {...mockProps} />);
        
        const editButtons = screen.getAllByTitle('Renombrar');
        fireEvent.click(editButtons[0]);

        const input = screen.getByDisplayValue('Horario 1');
        expect(input).toBeInTheDocument();
        expect(input).toHaveFocus();
    });

    it('validates min length', async () => {
        render(<ScheduleManager {...mockProps} />);
        const editButtons = screen.getAllByTitle('Renombrar');
        fireEvent.click(editButtons[0]);

        const input = screen.getByDisplayValue('Horario 1');
        fireEvent.change(input, { target: { value: 'AB' } });
        
        const saveButton = screen.getByTitle('Guardar');
        fireEvent.click(saveButton);

        expect(screen.getByText('Mínimo 3 caracteres')).toBeInTheDocument();
        expect(mockProps.onRenameSchedule).not.toHaveBeenCalled();
    });

    it('validates special characters', async () => {
        render(<ScheduleManager {...mockProps} />);
        const editButtons = screen.getAllByTitle('Renombrar');
        fireEvent.click(editButtons[0]);

        const input = screen.getByDisplayValue('Horario 1');
        fireEvent.change(input, { target: { value: 'Horario@' } });
        
        const saveButton = screen.getByTitle('Guardar');
        fireEvent.click(saveButton);

        expect(screen.getByText('Sin caracteres especiales')).toBeInTheDocument();
        expect(mockProps.onRenameSchedule).not.toHaveBeenCalled();
    });

    it('calls onRenameSchedule with valid name', async () => {
        render(<ScheduleManager {...mockProps} />);
        const editButtons = screen.getAllByTitle('Renombrar');
        fireEvent.click(editButtons[0]);

        const input = screen.getByDisplayValue('Horario 1');
        fireEvent.change(input, { target: { value: 'Nuevo Nombre' } });
        
        const saveButton = screen.getByTitle('Guardar');
        fireEvent.click(saveButton);

        expect(mockProps.onRenameSchedule).toHaveBeenCalledWith('1', 'Nuevo Nombre');
    });

    it('handles server errors', async () => {
        const errorMock = { ...mockProps, onRenameSchedule: vi.fn().mockRejectedValue(new Error('Error del servidor')) };
        render(<ScheduleManager {...errorMock} />);
        
        const editButtons = screen.getAllByTitle('Renombrar');
        fireEvent.click(editButtons[0]);

        const input = screen.getByDisplayValue('Horario 1');
        fireEvent.change(input, { target: { value: 'Nuevo Nombre' } });
        
        const saveButton = screen.getByTitle('Guardar');
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText('Error del servidor')).toBeInTheDocument();
        });
    });

    it('cancels edit on escape', async () => {
        render(<ScheduleManager {...mockProps} />);
        const editButtons = screen.getAllByTitle('Renombrar');
        fireEvent.click(editButtons[0]);

        const input = screen.getByDisplayValue('Horario 1');
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(screen.queryByDisplayValue('Horario 1')).not.toBeInTheDocument();
        expect(screen.getByText('Horario 1')).toBeInTheDocument();
    });
});
