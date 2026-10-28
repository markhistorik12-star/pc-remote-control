import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import Header from '../Header';

afterEach(() => cleanup());

describe('Header', () => {
  it('renders title and settings button', () => {
    const onSettingsClick = vi.fn();
    render(<Header onSettingsClick={onSettingsClick} />);

    expect(screen.getByText('PC Remote')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
  });

  it('calls onSettingsClick when settings button is clicked', () => {
    const onSettingsClick = vi.fn();
    render(<Header onSettingsClick={onSettingsClick} />);

    fireEvent.click(screen.getByLabelText('Settings'));
    expect(onSettingsClick).toHaveBeenCalledTimes(1);
  });
});
