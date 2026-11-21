// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MasterDataPage } from './MasterDataPage';
import * as catalog from '@/services/catalog-api';
import { useAuthStore } from '@/stores/auth-store';
import type { AdminCategory } from '@/types/catalog';
import type { CurrentUser } from '@/types/auth';

vi.mock('@/services/catalog-api', () => ({
  listAdminCategories: vi.fn(),
  listServices: vi.fn(),
  createCategory: vi.fn(),
  renameCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

const initialState = useAuthStore.getState();
const admin: CurrentUser = { id: 'admin', email: 'admin@example.test', isEmailVerified: true, roles: ['ADMIN'], permissions: ['categories.manage'], customerProfile: null, providerProfile: null };
const empty: AdminCategory = { id: 'empty', parentId: null, slug: 'empty', name: 'Empty', nameSi: null, nameTa: null, description: null, sortOrder: 0, isActive: true, serviceCount: 0, childCount: 0 };
const assigned: AdminCategory = { ...empty, id: 'assigned', slug: 'assigned', name: 'Assigned', serviceCount: 2 };
const parent: AdminCategory = { ...empty, id: 'parent', slug: 'parent', name: 'Parent', childCount: 1 };

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  useAuthStore.setState({ user: admin, accessToken: 'test-token' });
  vi.mocked(catalog.listAdminCategories).mockResolvedValue({ items: [empty, assigned, parent], pagination: { page: 1, limit: 20, total: 3, totalPages: 1 } });
  vi.mocked(catalog.listServices).mockResolvedValue({ items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
});
afterEach(() => { cleanup(); useAuthStore.setState(initialState, true); vi.resetAllMocks(); });

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MasterDataPage /></QueryClientProvider>);
}

describe('service category management', () => {
  it('displays counts and prevents deletion when services or subcategories exist', async () => {
    setup();
    expect(await screen.findByText('2 services')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete Assigned' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Delete Parent' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Delete Empty' }).hasAttribute('disabled')).toBe(false);
  });

  it('validates, creates and renames through the popup', async () => {
    vi.mocked(catalog.createCategory).mockResolvedValue(empty);
    vi.mocked(catalog.renameCategory).mockResolvedValue(empty);
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Add category' }));
    let dialog = screen.getByRole('dialog', { name: 'Add service category' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Category name' }), { target: { value: '   ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add category' }));
    expect(within(dialog).getByText('Enter a category name.')).toBeTruthy();
    expect(catalog.createCategory).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Category name' }), { target: { value: ' Repairs ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add category' }));
    await waitFor(() => expect(catalog.createCategory).toHaveBeenCalledWith('test-token', 'Repairs'));
    expect(await screen.findByText('Service category added.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Empty' }));
    dialog = screen.getByRole('dialog', { name: 'Edit service category' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Category name' }), { target: { value: 'Changed' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(catalog.renameCategory).toHaveBeenCalledWith('test-token', empty, 'Changed'));
    expect(await screen.findByText('Service category updated.')).toBeTruthy();
  });

  it('surfaces save errors and server-side deletion conflicts', async () => {
    vi.mocked(catalog.createCategory).mockRejectedValue(new Error('Category already exists.'));
    vi.mocked(catalog.deleteCategory).mockRejectedValue(new Error('Services were assigned.'));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Add category' }));
    const dialog = screen.getByRole('dialog', { name: 'Add service category' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Category name' }), { target: { value: 'Duplicate' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add category' }));
    expect(await within(dialog).findByText('Category already exists.')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Empty' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Services were assigned.')).toBeTruthy();
    expect(catalog.deleteCategory).toHaveBeenCalledWith('test-token', 'empty');
  });

  it('confirms and deletes an empty category', async () => {
    vi.mocked(catalog.deleteCategory).mockResolvedValue(undefined);
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Empty' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Service category deleted.')).toBeTruthy();
    expect(catalog.deleteCategory).toHaveBeenCalledWith('test-token', 'empty');
  });

  it('hides management controls without permission', () => {
    useAuthStore.setState({ user: { ...admin, permissions: [] } });
    setup();
    expect(screen.getByText(/need category management permission/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add category' })).toBeNull();
    expect(catalog.listAdminCategories).not.toHaveBeenCalled();
  });
});
