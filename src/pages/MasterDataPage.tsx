import { ChevronRight, FolderTree } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/display';

export function MasterDataPage() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm text-foreground-secondary">Administration</p>
        <h1 className="mt-1 text-3xl font-bold text-primary">Master data</h1>
        <p className="mt-3 text-foreground-secondary">Choose a reference data area to manage.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-shadow hover:shadow-md">
          <Link
            to="/master-data/service-categories"
            className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <CardContent className="flex items-center gap-4 p-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-secondary/10 text-secondary">
                <FolderTree size={24} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <CardTitle>Service Categories</CardTitle>
                <CardDescription className="mt-2">Manage service categories and subcategories.</CardDescription>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-foreground-secondary transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </CardContent>
          </Link>
        </Card>
      </div>
    </section>
  );
}
