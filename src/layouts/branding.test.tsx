// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthLayout } from './auth-layout';
import { DashboardLayout } from './dashboard-layout';
import { useThemeStore } from '@/stores/theme-store';

afterEach(() => { cleanup(); useThemeStore.getState().setTheme('light'); localStorage.removeItem('servhub-theme'); });

describe('admin branding', () => {
  it('displays the logo on authentication and dashboard layouts', () => {
    render(<MemoryRouter><AuthLayout /></MemoryRouter>);
    expect(screen.getByRole('img', { name: 'SERVE HUB' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeTruthy();
    cleanup();
    render(<MemoryRouter><DashboardLayout /></MemoryRouter>);
    expect(screen.getByRole('img', { name: 'SERVE HUB' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('servhub-theme')).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
