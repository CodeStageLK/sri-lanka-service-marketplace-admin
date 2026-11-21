import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '@/layouts/auth-layout';
import { DashboardLayout } from '@/layouts/dashboard-layout';
import { DashboardPage } from '@/pages/dashboard-page';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { MasterDataPage } from '@/pages/MasterDataPage';
import { ProvidersPage } from '@/pages/AdminProvidersPage';
import { UsersPage } from '@/pages/AdminUsersPage';

export const router = createBrowserRouter([
  { element: <AuthLayout />, children: [{ path: '/login', element: <AdminLoginPage /> }] },
  {
    element: <AdminGuard />,
    children: [{
      element: <DashboardLayout />,
      children: [
        { path: '/', element: <DashboardPage /> },
        { path: '/dashboard', element: <DashboardPage /> },
        { path: '/master-data', element: <MasterDataPage /> },
        { path: '/providers', element: <ProvidersPage /> },
        { path: '/users', element: <UsersPage /> },
      ],
    }],
  },
]);
