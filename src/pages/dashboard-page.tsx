import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/display';

export function DashboardPage() {
  return (
    <>
      <p className="text-sm font-semibold text-primary">SERV HUB ADMIN</p>
      <h1 className="mt-2 text-3xl font-bold text-primary">Administration dashboard</h1>
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Card className="p-5"><h2 className="font-semibold">Master data</h2><p className="mt-2 text-sm text-foreground-secondary">Manage catalog, locations and reference data.</p><Link className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline" to="/master-data">Open master data</Link></Card>
        <Card className="p-5"><h2 className="font-semibold">Providers</h2><p className="mt-2 text-sm text-foreground-secondary">Review provider profiles and public listings.</p><Link className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline" to="/providers">Open providers</Link></Card>
        <Card className="p-5"><h2 className="font-semibold">Users</h2><p className="mt-2 text-sm text-foreground-secondary">View and manage customer and provider accounts.</p><Link className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline" to="/users">Manage users</Link></Card>
      </section>
    </>
  );
}
