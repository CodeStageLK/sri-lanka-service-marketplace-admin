import { Outlet } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function AuthLayout() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8">
        <div className="mb-4 flex justify-end"><ThemeToggle /></div>
        <div className="mb-6 inline-flex rounded-md bg-white p-2">
          <img src="/serve-hub-logo.png" alt="SERVE HUB" width="1665" height="410" className="h-auto w-44" />
        </div>
        <Outlet />
      </div>
    </main>
  );
}
