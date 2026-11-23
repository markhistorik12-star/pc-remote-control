import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders header, power buttons, and app list', () => {
    render(<App />);
    expect(screen.getByText('PC Remote')).not.toBeNull();
    expect(screen.getByText('Apagar')).not.toBeNull();
    expect(screen.getByText('Reiniciar')).not.toBeNull();
    expect(screen.getByText('Bloquear')).not.toBeNull();
    expect(screen.getByText('Aplicaciones')).not.toBeNull();
  });
});
