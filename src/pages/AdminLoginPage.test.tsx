// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminLoginPage } from './AdminLoginPage';
import { useAuthStore } from '@/stores/auth-store';

const initialState = useAuthStore.getState();

afterEach(() => {
  cleanup();
  useAuthStore.setState(initialState, true);
  vi.unstubAllEnvs();
});

describe('admin development login', () => {
  it('uses the normal login flow for the configured demo account', async () => {
    vi.stubEnv('VITE_DEMO_ADMIN_EMAIL', 'admin@example.test');
    vi.stubEnv('VITE_DEMO_ADMIN_PASSWORD', 'demo-password');
    const login = vi.fn(async () => {});
    useAuthStore.setState({ login, isLoading: false });
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<AdminLoginPage />} />
          <Route path="/dashboard" element={<h1>Dashboard</h1>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Administrator' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeTruthy());
    expect(login).toHaveBeenCalledWith('admin@example.test', 'demo-password');
  });
});
