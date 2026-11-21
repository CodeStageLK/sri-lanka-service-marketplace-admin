import { useQuery } from '@tanstack/react-query';
import { searchProviders } from '@/services/discovery-api';
import { Card } from '@/components/ui/display';
import { Alert, Skeleton } from '@/components/ui/feedback';

export function ProvidersPage() {
  const providers = useQuery({
    queryKey: ['admin', 'providers'],
    queryFn: ({ signal }) => searchProviders({ page: 1, limit: 100, signal }),
  });
  return (
    <section className="space-y-6">
      <header><p className="text-sm text-foreground-secondary">Administration</p><h1 className="mt-1 text-3xl font-bold text-primary">Providers</h1></header>
      <Alert tone="info" title="Public provider view">This screen displays the public provider listing. Internal verification review and protected provider-management operations are available only through backend-admin contracts not yet represented as dedicated public-safe screens.</Alert>
      {providers.isLoading ? <Skeleton className="h-64 w-full" /> : providers.isError ? <Alert tone="danger" title="Unable to load providers">Provider data could not be retrieved.</Alert> : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.data?.items.map((provider) => (
            <Card key={provider.id} className="p-5">
              <h2 className="font-semibold text-primary">{provider.displayName}</h2>
              <p className="mt-2 text-sm text-foreground-secondary">{provider.providerType} · {provider.verificationStatus}</p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
