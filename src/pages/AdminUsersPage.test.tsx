// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UsersPage } from './AdminUsersPage';
import * as usersApi from '@/services/admin-users-api';
import { useAuthStore } from '@/stores/auth-store';
import type { CurrentUser } from '@/types/auth';

vi.mock('@/services/admin-users-api', () => ({
  listUsers: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}));

const initialState = useAuthStore.getState();
const actor: CurrentUser = { id: 'admin', email: 'admin@example.test', isEmailVerified: true, roles: ['ADMIN'], permissions: ['users.manage'], customerProfile: null, providerProfile: null };
const customer: usersApi.AdminUser = { id: 'customer', email: 'user@example.test', status: 'ACTIVE', isEmailVerified: true, createdAt: '2026-01-01', roles: ['CUSTOMER'], customerProfile: { firstName: 'First', lastName: 'Last' }, providerProfile: null };

function setup() {
  useAuthStore.setState({ user: actor, accessToken: 'test-token' });
  vi.mocked(usersApi.listUsers).mockResolvedValue({ items: [customer], page: 1, limit: 20, total: 1 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><UsersPage /></QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  useAuthStore.setState(initialState, true);
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('admin user management', () => {
  it('loads users and submits edits through the API', async () => {
    vi.mocked(usersApi.updateUser).mockResolvedValue(customer);
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(usersApi.updateUser).toHaveBeenCalledWith('test-token', 'customer', { firstName: 'Updated' }));
    expect(await screen.findByText('User updated.')).toBeTruthy();
  });

  it('confirms deletion and reports backend errors', async () => {
    vi.mocked(usersApi.deleteUser).mockRejectedValue(new Error('Deletion denied'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Deletion denied')).toBeTruthy();
    expect(usersApi.deleteUser).toHaveBeenCalledWith('test-token', 'customer');
  });
});
