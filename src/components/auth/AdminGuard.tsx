import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

export function AdminGuard() {
  const location = useLocation();
  const { user, isInitialized, isLoading } = useAuthStore();
  if (!isInitialized || isLoading) return <main className="grid min-h-screen place-items-center">Loading…</main>;
  if (!user?.roles.includes('ADMIN') && !user?.roles.includes('SUPER_ADMIN')) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
