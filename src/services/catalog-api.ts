import { apiRequest } from '@/services/api-client';
import type { AdminCategoryListResponse, Category, CategoryListResponse, Service, ServiceListResponse } from '@/types/catalog';

export interface CatalogQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  signal?: AbortSignal;
}

function queryString(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.categoryId) params.set('categoryId', query.categoryId);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function listCategories(query: CatalogQuery = {}) {
  return apiRequest<CategoryListResponse>(`/categories${queryString(query)}`, { signal: query.signal });
}

export function getCategory(idOrSlug: string, signal?: AbortSignal) {
  return apiRequest<Category>(`/categories/${encodeURIComponent(idOrSlug)}`, { signal });
}

export function listServices(query: CatalogQuery = {}) {
  return apiRequest<ServiceListResponse>(`/services${queryString(query)}`, { signal: query.signal });
}

export function listAdminCategories(token: string, query: CatalogQuery = {}) {
  return apiRequest<AdminCategoryListResponse>(`/admin/categories${queryString(query)}`, { accessToken: token, signal: query.signal });
}

export function createCategory(token: string, name: string) {
  return apiRequest<Category>('/admin/categories', { method: 'POST', accessToken: token, body: { name } });
}

export function renameCategory(token: string, category: Category, name: string) {
  return apiRequest<Category>(`/admin/categories/${encodeURIComponent(category.id)}`, { method: 'PATCH', accessToken: token, body: { name, slug: category.slug } });
}

export function deleteCategory(token: string, id: string) {
  return apiRequest<void>(`/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE', accessToken: token });
}

export function getService(idOrSlug: string, signal?: AbortSignal) {
  return apiRequest<Service>(`/services/${encodeURIComponent(idOrSlug)}`, { signal });
}
