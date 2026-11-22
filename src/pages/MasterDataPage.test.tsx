// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MasterDataPage } from './MasterDataPage';
import { ServiceCategoriesPage } from './ServiceCategoriesPage';
import * as catalog from '@/services/catalog-api';
import { useAuthStore } from '@/stores/auth-store';
import type { AdminCategory } from '@/types/catalog';
import type { CurrentUser } from '@/types/auth';

vi.mock('@/services/catalog-api', () => ({
  listAdminCategories: vi.fn(),
  listAdminCategoryServices: vi.fn(),
  listServices: vi.fn(),
  createCategory: vi.fn(),
  createService: vi.fn(),
  renameCategory: vi.fn(),
  deleteCategory: vi.fn(),
  deleteService: vi.fn(),
}));

const initialState = useAuthStore.getState();
const admin: CurrentUser = { id: 'admin', email: 'admin@example.test', isEmailVerified: true, roles: ['ADMIN'], permissions: ['categories.manage', 'services.manage'], customerProfile: null, providerProfile: null };
const empty: AdminCategory = { id: 'empty', parentId: null, slug: 'empty', name: 'Empty', nameSi: null, nameTa: null, description: null, sortOrder: 0, isActive: true, serviceCount: 0, childCount: 0 };
const assigned: AdminCategory = { ...empty, id: 'assigned', slug: 'assigned', name: 'Assigned', serviceCount: 2 };
const parent: AdminCategory = { ...empty, id: 'parent', slug: 'parent', name: 'Parent', childCount: 1 };

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  useAuthStore.setState({ user: admin, accessToken: 'test-token' });
  vi.mocked(catalog.listAdminCategories).mockResolvedValue({ items: [empty, assigned, parent], pagination: { page: 1, limit: 20, total: 3, totalPages: 1 } });
  vi.mocked(catalog.listServices).mockResolvedValue({ items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
  vi.mocked(catalog.listAdminCategoryServices).mockResolvedValue({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
});
afterEach(() => { cleanup(); useAuthStore.setState(initialState, true); vi.resetAllMocks(); });

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ServiceCategoriesPage /></QueryClientProvider>);
}

describe('service category management', () => {
  it('links the Service Categories tile to its management page', () => {
    render(<MemoryRouter><MasterDataPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /service categories/i }).getAttribute('href')).toBe('/master-data/service-categories');
  });

  it('renders services returned by the catalog API', async () => {
    vi.mocked(catalog.listServices).mockResolvedValue({
      items: [{ id: 'service-1', categoryId: 'category-1', slug: 'ac-repairs', name: 'AC Repairs', description: null, pricingType: null, priceFrom: null, priceTo: null, currency: 'LKR', isActive: true }],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    setup();
    expect(await screen.findByRole('list', { name: 'Services' })).toBeTruthy();
    expect(screen.getByText('AC Repairs')).toBeTruthy();
    expect(screen.getByText('1 total')).toBeTruthy();
  });

  it('opens a category with descendant service mappings, listing counts and pagination', async () => {
    vi.mocked(catalog.listAdminCategoryServices)
      .mockResolvedValueOnce({
        items: [{ id: 'service-1', name: 'Plumbing', isActive: true, deletedAt: null, category: { id: 'child', name: 'Home repairs' }, listingCount: 3 }],
        pagination: { page: 1, limit: 20, total: 21, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        items: [{ id: 'service-2', name: 'Painting', isActive: false, deletedAt: null, category: { id: 'parent', name: 'Parent' }, listingCount: 0 }],
        pagination: { page: 2, limit: 20, total: 21, totalPages: 2 },
      });
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Parent' }));
    const dialog = screen.getByRole('dialog', { name: 'Parent services' });
    expect(await within(dialog).findByText('Plumbing')).toBeTruthy();
    expect(within(dialog).getByText('Category: Home repairs')).toBeTruthy();
    expect(within(dialog).getByText('3 listings')).toBeTruthy();
    expect(catalog.listAdminCategoryServices).toHaveBeenCalledWith('test-token', 'parent', expect.objectContaining({ page: 1 }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
    expect(await within(dialog).findByText('Painting · Inactive')).toBeTruthy();
    expect(within(dialog).getByText('0 listings')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Parent services' })).toBeNull();
  });

  it('shows an empty state and surfaces category service errors', async () => {
    vi.mocked(catalog.listAdminCategoryServices)
      .mockResolvedValueOnce({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })
      .mockRejectedValueOnce(new Error('Cannot load mappings.'));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Empty' }));
    let dialog = screen.getByRole('dialog', { name: 'Empty services' });
    expect(await within(dialog).findByText(/no services are assigned/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assigned' }));
    dialog = screen.getByRole('dialog', { name: 'Assigned services' });
    expect(await within(dialog).findByText('Cannot load mappings.')).toBeTruthy();
  });

  it('manages mappings inside the edit dialog and guards listed services', async () => {
    vi.mocked(catalog.listAdminCategoryServices).mockResolvedValue({
      items: [
        { id: 'service-1', name: 'Plumbing', isActive: true, deletedAt: null, category: { id: 'child', name: 'Repairs' }, listingCount: 1 },
        { id: 'service-2', name: 'Painting', isActive: true, deletedAt: null, category: { id: 'parent', name: 'Parent' }, listingCount: 0 },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });
    vi.mocked(catalog.createService).mockResolvedValue({ id: 'new', categoryId: 'parent', slug: 'cleaning', name: 'Cleaning', description: null, pricingType: null, priceFrom: null, priceTo: null, currency: 'LKR', isActive: true });
    vi.mocked(catalog.deleteService).mockResolvedValue(undefined);
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Parent' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit service category' });
    expect(await within(dialog).findByText('Category: Repairs')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Delete Plumbing' }).hasAttribute('disabled')).toBe(true);
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'New service name' }), { target: { value: ' Cleaning ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add service' }));
    await waitFor(() => expect(catalog.createService).toHaveBeenCalledWith('test-token', 'parent', 'Cleaning'));
    await waitFor(() => expect(within(dialog).getByRole('textbox', { name: 'New service name' })).toHaveProperty('value', ''));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Painting' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(catalog.deleteService).toHaveBeenCalledWith('test-token', 'service-2'));
  });

  it('shows service mutation conflicts and restricts editing without permission', async () => {
    vi.mocked(catalog.listAdminCategoryServices).mockResolvedValue({
      items: [{ id: 'service-2', name: 'Painting', isActive: true, deletedAt: null, category: { id: 'parent', name: 'Parent' }, listingCount: 0 }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    vi.mocked(catalog.deleteService).mockRejectedValue(new Error('A provider listing was added.'));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Parent' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit service category' });
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Delete Painting' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm delete' }));
    expect(await within(dialog).findByText('A provider listing was added.')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    useAuthStore.setState({ user: { ...admin, permissions: ['categories.manage'] } });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Parent' }));
    const restricted = screen.getByRole('dialog', { name: 'Edit service category' });
    expect(await within(restricted).findByText(/service management permission is required/i)).toBeTruthy();
    expect(within(restricted).queryByRole('button', { name: 'Add service' })).toBeNull();
    expect(within(restricted).queryByRole('button', { name: 'Delete Painting' })).toBeNull();
  });

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
