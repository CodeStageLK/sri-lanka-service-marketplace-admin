import { apiRequest } from '@/services/api-client';

export type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DEACTIVATED';
export type UserRole = 'CUSTOMER' | 'INDIVIDUAL_PROVIDER' | 'BUSINESS_PROVIDER' | 'ADMIN' | 'SUPER_ADMIN';

export interface AdminUser {
  id: string;
  email: string | null;
  status: UserStatus;
  isEmailVerified: boolean;
  createdAt: string;
  roles: UserRole[];
  customerProfile: { firstName: string; lastName: string } | null;
  providerProfile: { providerType: 'INDIVIDUAL' | 'BUSINESS'; displayName: string } | null;
}

export interface UserUpdate {
  email?: string;
  status?: UserStatus;
  firstName?: string;
  lastName?: string;
  roles?: UserRole[];
}

export function listUsers(token: string, page: number, search: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ page: String(page), limit: '20' });
  if (search.trim()) query.set('search', search.trim());
  return apiRequest<{ items: AdminUser[]; total: number; page: number; limit: number }>(`/admin/users?${query}`, { accessToken: token, signal });
}

export function updateUser(token: string, id: string, input: UserUpdate) {
  return apiRequest<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', accessToken: token, body: input });
}

export function deleteUser(token: string, id: string) {
  return apiRequest<void>(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE', accessToken: token });
}
