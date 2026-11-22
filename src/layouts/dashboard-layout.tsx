import { Database, LayoutDashboard, Users, Building2, LogOut } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function DashboardLayout() {
  const logout = useAuthStore((state) => state.logout);
  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="bg-card-featured-bg p-6 text-card-featured-text md:min-h-screen md:w-64">
        <div className="inline-flex rounded-md bg-white p-2">
          <img src="/serve-hub-logo.png" alt="SERVE HUB" width="1665" height="410" className="h-auto w-40" />
        </div>
        <p className="mt-1 text-sm">Administration</p>
        <div className="mt-4"><ThemeToggle /></div>
        <nav aria-label="Admin navigation" className="mt-8 space-y-2">
          <NavLink to="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-3 font-semibold hover:bg-card-featured-text/10">
            <LayoutDashboard aria-hidden="true" size={18} /> Dashboard
          </NavLink>
          <NavLink to="/master-data" className="flex items-center gap-3 rounded-md px-3 py-3 hover:bg-card-featured-text/10">
            <Database aria-hidden="true" size={18} /> Master data
          </NavLink>
          <NavLink to="/providers" className="flex items-center gap-3 rounded-md px-3 py-3 hover:bg-card-featured-text/10">
            <Building2 aria-hidden="true" size={18} /> Providers
          </NavLink>
          <NavLink to="/users" className="flex items-center gap-3 rounded-md px-3 py-3 hover:bg-card-featured-text/10">
            <Users aria-hidden="true" size={18} /> Users
          </NavLink>
          <button type="button" className="mt-6 flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-3 text-left hover:bg-card-featured-text/10" onClick={() => void logout()}>
            <LogOut aria-hidden="true" size={18} /> Log out
          </button>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-6 md:p-10"><Outlet /></main>
    </div>
  );
}
