import { describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api-client';
import { createService, deleteService, listAdminCategoryServices, renameCategory } from './catalog-api';
import type { Category } from '@/types/catalog';

vi.mock('./api-client', () => ({ apiRequest: vi.fn() }));

describe('admin category API', () => {
  it('creates and deletes services through authenticated admin endpoints', async () => {
    await createService('token', 'category-id', 'Cleaning');
    expect(apiRequest).toHaveBeenCalledWith('/admin/services', {
      method: 'POST', accessToken: 'token', body: { categoryId: 'category-id', name: 'Cleaning' },
    });
    await deleteService('token', 'service/id');
    expect(apiRequest).toHaveBeenCalledWith('/admin/services/service%2Fid', {
      method: 'DELETE', accessToken: 'token',
    });
  });

  it('requests the selected category services with authentication and pagination', async () => {
    await listAdminCategoryServices('token', 'category/id', { page: 2, limit: 20 });
    expect(apiRequest).toHaveBeenCalledWith('/admin/categories/category%2Fid/services?page=2&limit=20', {
      accessToken: 'token', signal: undefined,
    });
  });

  it('preserves the existing public slug when renaming', async () => {
    const category: Category = { id: 'category-id', name: 'Old name', slug: 'old-name', parentId: null, nameSi: null, nameTa: null, description: null, sortOrder: 0, isActive: true };
    await renameCategory('token', category, 'New name');
    expect(apiRequest).toHaveBeenCalledWith('/admin/categories/category-id', {
      method: 'PATCH', accessToken: 'token', body: { name: 'New name', slug: 'old-name' },
    });
  });
});
