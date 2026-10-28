import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from '../Header';

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
