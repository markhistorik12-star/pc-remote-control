import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import NotepadControls from '../NotepadControls';
import type { AppItem } from '../../services/api';

afterEach(() => cleanup());

const mockNotepad: AppItem = {
  id: 'notepad123',
  name: 'Bloc de notas',
  exePath: 'C:\\Windows\\System32\\notepad.exe',
  arguments: '',
  kind: 'notepad',
  selected: true,
};

describe('NotepadControls', () => {
  it('writes content, selects location, and saves file', async () => {
    const onSave = vi.fn().mockResolvedValue(true);

    render(
      <NotepadControls
        isOpen
        notepadApp={mockNotepad}
        ip="192.168.0.10"
        port={5050}
        token="ABC123"
        onClose={vi.fn()}
        onSave={onSave}
        onPreview={vi.fn().mockResolvedValue(true)}
        onDiscard={vi.fn().mockResolvedValue(true)}
      />
    );

    fireEvent.change(screen.getByLabelText(/Nombre del archivo/i), {
      target: { value: 'recordatorio' },
    });
    fireEvent.click(screen.getByText('Documentos'));
    fireEvent.change(screen.getByLabelText(/Contenido de la nota/i), {
      target: { value: 'Comprar pan y leche' },
    });

    fireEvent.click(screen.getByText('Guardar archivo'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        fileName: 'recordatorio',
        content: 'Comprar pan y leche',
        location: 'documents',
        openInNotepad: true,
      });
    });
  });

  it('asks for confirmation before discarding non-empty text and calls onDiscard', async () => {
    const onDiscard = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <NotepadControls
        isOpen
        notepadApp={mockNotepad}
        ip="192.168.0.10"
        port={5050}
        token="ABC123"
        onClose={onClose}
        onSave={vi.fn().mockResolvedValue(true)}
        onPreview={vi.fn().mockResolvedValue(true)}
        onDiscard={onDiscard}
      />
    );

    fireEvent.change(screen.getByLabelText(/Contenido de la nota/i), {
      target: { value: 'Texto temporal' },
    });

    fireEvent.click(screen.getByText('Descartar'));
    expect(screen.getByText(/¿Descartar el texto sin guardar\?/i)).toBeTruthy();

    fireEvent.click(screen.getByText('Sí, descartar'));

    await waitFor(() => {
      expect(onDiscard).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
