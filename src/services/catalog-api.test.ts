import { describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api-client';
import { renameCategory } from './catalog-api';
import type { Category } from '@/types/catalog';

vi.mock('./api-client', () => ({ apiRequest: vi.fn() }));

describe('admin category API', () => {
  it('preserves the existing public slug when renaming', async () => {
    const category: Category = { id: 'category-id', name: 'Old name', slug: 'old-name', parentId: null, nameSi: null, nameTa: null, description: null, sortOrder: 0, isActive: true };
    await renameCategory('token', category, 'New name');
    expect(apiRequest).toHaveBeenCalledWith('/admin/categories/category-id', {
      method: 'PATCH', accessToken: 'token', body: { name: 'New name', slug: 'old-name' },
    });
  });
});
