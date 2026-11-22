import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCategory, createService, deleteCategory, deleteService, listAdminCategories, listAdminCategoryServices, listServices, renameCategory } from '@/services/catalog-api';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/display';
import { Alert, ConfirmationDialog, Skeleton } from '@/components/ui/feedback';
import { FormField, Input } from '@/components/ui/form-controls';
import { useAuthStore } from '@/stores/auth-store';
import type { AdminCategory } from '@/types/catalog';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Please try again.';
}

export function ServiceCategoriesPage() {
  const { accessToken, user } = useAuthStore();
  const canManage = Boolean(user?.permissions.includes('categories.manage'));
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);
  const [viewing, setViewing] = useState<AdminCategory | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const categories = useQuery({
    queryKey: ['admin', 'categories', user?.id, page],
    queryFn: ({ signal }) => {
      if (!accessToken) throw new Error('Your session has expired. Please sign in again.');
      return listAdminCategories(accessToken, { page, limit: 20, signal });
    },
    enabled: Boolean(accessToken && canManage),
  });
  const services = useQuery({
    queryKey: ['admin', 'services'],
    queryFn: ({ signal }) => listServices({ page: 1, limit: 100, signal }),
  });
  const mutation = useMutation({
    mutationFn: async (action: { type: 'create'; name: string } | { type: 'edit'; category: AdminCategory; name: string } | { type: 'delete'; category: AdminCategory }) => {
      if (!accessToken) throw new Error('Your session has expired. Please sign in again.');
      if (action.type === 'create') return createCategory(accessToken, action.name);
      if (action.type === 'edit') return renameCategory(accessToken, action.category, action.name);
      return deleteCategory(accessToken, action.category.id);
    },
    onSuccess: async (_result, action) => {
      setEditing(null);
      setDeleting(null);
      setMessage(action.type === 'create' ? 'Service category added.' : action.type === 'edit' ? 'Service category updated.' : 'Service category deleted.');
      if (action.type === 'delete' && categories.data?.items.length === 1 && page > 1) setPage(page - 1);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
    onError: async (_error, action) => {
      if (action.type === 'delete') {
        setDeleting(null);
        await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      }
    },
  });
  function openEditor(category: AdminCategory | 'new') {
    mutation.reset();
    setMessage(null);
    setEditing(category);
  }
  return (
    <section className="space-y-6">
      <header><p className="text-sm text-foreground-secondary">Administration</p><h1 className="mt-1 text-3xl font-bold text-primary">Service Categories</h1></header>
      {message ? <Alert tone="success" title="Saved">{message}</Alert> : null}
      {mutation.error && !editing ? <Alert tone="danger" title="Could not delete service category">{errorMessage(mutation.error)}</Alert> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-primary">Service Categories</h2>
            {canManage ? <Button type="button" onClick={() => openEditor('new')}>Add category</Button> : null}
          </div>
          {canManage ? <p className="mt-2 text-xs text-foreground-secondary">Counts include directly assigned services, including inactive or deleted services.</p> : null}
          {!canManage ? <p className="mt-4 text-sm text-foreground-secondary">You need category management permission to view and manage service categories.</p> : null}
          {canManage && categories.isLoading ? <Skeleton className="mt-4 h-32 w-full" /> : null}
          {categories.isError ? <Alert tone="danger" title="Unable to load service categories">{errorMessage(categories.error)}</Alert> : null}
          {categories.data?.items.length === 0 ? <p className="mt-4 text-sm text-foreground-secondary">No service categories found.</p> : null}
          <ul className="mt-4 space-y-2">
            {categories.data?.items.map((category) => {
              const reason = category.serviceCount > 0 ? 'Categories with services cannot be deleted.' : category.childCount > 0 ? 'Remove subcategories before deleting this category.' : undefined;
              return <li key={category.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-3">
                <button type="button" className="min-w-0 flex-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => setViewing(category)} aria-label={category.name}>
                  <span className="block font-medium text-primary underline-offset-4 hover:underline">{category.name}</span>
                  <span className="block text-sm text-foreground-secondary">{category.serviceCount} {category.serviceCount === 1 ? 'service' : 'services'}{!category.isActive ? ' · Inactive' : ''}</span>
                  {reason ? <span className="block text-xs text-foreground-secondary">{reason}</span> : null}
                </button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" aria-label={`Edit ${category.name}`} disabled={mutation.isPending} onClick={() => openEditor(category)}>Edit</Button>
                  <Button type="button" variant="destructive" size="sm" aria-label={`Delete ${category.name}`} disabled={Boolean(reason) || mutation.isPending} onClick={() => { mutation.reset(); setMessage(null); setDeleting(category); }}>Delete</Button>
                </div>
              </li>;
            })}
          </ul>
          {categories.data && categories.data.pagination.totalPages > 1 ? <div className="mt-4 flex items-center gap-3"><Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm">Page {page} of {categories.data.pagination.totalPages}</span><Button type="button" variant="outline" size="sm" disabled={page >= categories.data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div> : null}
        </Card>
        <Card className="p-5">
          <CardHeader className="flex-row items-start justify-between space-y-0 p-0">
            <div className="space-y-1">
              <CardTitle>Services</CardTitle>
              <CardDescription>Services currently available in the catalog.</CardDescription>
            </div>
            {services.data ? <Badge>{services.data.pagination.total} total</Badge> : null}
          </CardHeader>
          <CardContent className="mt-4 p-0">
            {services.isLoading ? <Skeleton className="h-32 w-full" /> : null}
            {services.isError ? <Alert tone="danger" title="Unable to load services">{errorMessage(services.error)}</Alert> : null}
            {services.isSuccess && services.data.items.length === 0 ? <p className="text-sm text-foreground-secondary">No services found.</p> : null}
            {services.isSuccess && services.data.items.length > 0 ? (
              <ul aria-label="Services" className="grid max-h-96 gap-2 overflow-y-auto rounded-md border border-border bg-background p-3 sm:grid-cols-2">
                {services.data.items.map((service) => <li key={service.id} className="rounded-md border border-border bg-card px-3 py-2 text-sm">{service.name}</li>)}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </div>
      {viewing && accessToken ? <CategoryServicesDialog key={viewing.id} category={viewing} token={accessToken} onClose={() => setViewing(null)} /> : null}
      {editing && accessToken ? <CategoryDialog key={editing === 'new' ? 'new' : editing.id} category={editing} token={accessToken} canManageServices={Boolean(user?.permissions.includes('services.manage'))} pending={mutation.isPending} error={mutation.error} onClose={() => { setEditing(null); mutation.reset(); }} onSave={(name) => mutation.mutate(editing === 'new' ? { type: 'create', name } : { type: 'edit', category: editing, name })} /> : null}
      <ConfirmationDialog open={Boolean(deleting)} title="Delete service category?" description={`Delete ${deleting?.name ?? 'this category'}? It will no longer appear in the catalog.`} confirmLabel="Delete" destructive pending={mutation.isPending} onClose={() => setDeleting(null)} onConfirm={() => { if (deleting && !mutation.isPending) mutation.mutate({ type: 'delete', category: deleting }); }} />
    </section>
  );
}

function CategoryServicesDialog({ category, token, onClose }: {
  category: AdminCategory; token: string; onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  return (
    <dialog ref={dialogRef} aria-labelledby="category-services-title" onCancel={(event) => { event.preventDefault(); onClose(); }} className="m-auto max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-6 text-foreground shadow-lg backdrop:bg-black/50">
      <h2 id="category-services-title" className="text-lg font-semibold text-primary">{category.name} services</h2>
      <CategoryServicesPanel category={category} token={token} canManage={false} />
      <div className="mt-6 flex justify-end"><Button type="button" variant="outline" onClick={onClose}>Close</Button></div>
    </dialog>
  );
}

function CategoryServicesPanel({ category, token, canManage, editable = false }: {
  category: AdminCategory; token: string; canManage: boolean; editable?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [name, setName] = useState('');
  const [validationError, setValidationError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const services = useQuery({
    queryKey: ['admin', 'category-services', category.id, page],
    queryFn: ({ signal }) => listAdminCategoryServices(token, category.id, { page, limit: 20, signal }),
  });
  const mutation = useMutation({
    mutationFn: async (action: { type: 'create'; name: string } | { type: 'delete'; id: string }) => {
      if (action.type === 'create') await createService(token, category.id, action.name);
      else await deleteService(token, action.id);
    },
    onSuccess: async (_result, action) => {
      if (action.type === 'create') { setName(''); setPage(1); }
      if (action.type === 'delete' && services.data?.items.length === 1 && page > 1) setPage(page - 1);
      setConfirming(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'category-services'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'services'] }),
      ]);
    },
    onError: async (_error, action) => {
      if (action.type === 'delete') {
        setConfirming(null);
        await queryClient.invalidateQueries({ queryKey: ['admin', 'category-services'] });
      }
    },
  });
  function addService(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setValidationError('Enter a service name.'); return; }
    setValidationError('');
    mutation.mutate({ type: 'create', name: trimmed });
  }
  return (
    <section className="mt-5" aria-label="Service mappings">
      <h3 className="font-semibold text-primary">Service mappings</h3>
      <p className="mt-2 text-sm text-foreground-secondary">Services assigned to this category and its subcategories. Listings include all provider assignments, even inactive or unapproved ones.</p>
      {canManage ? <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={addService}>
        <div className="min-w-0 flex-1"><FormField label="New service name" htmlFor="new-service-name" error={validationError}><Input id="new-service-name" value={name} onChange={(event) => { setName(event.target.value); setValidationError(''); }} maxLength={180} disabled={mutation.isPending} aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'new-service-name-error' : undefined} /></FormField></div>
        <Button type="submit" disabled={mutation.isPending}>Add service</Button>
        <p className="w-full text-xs text-foreground-secondary">New services are assigned directly to {category.name}.</p>
      </form> : editable ? <p className="mt-3 text-sm text-foreground-secondary">Service management permission is required to add or delete services.</p> : null}
      {mutation.error ? <div className="mt-4"><Alert tone="danger" title="Could not update services">{errorMessage(mutation.error)}</Alert></div> : null}
      {services.isLoading ? <Skeleton className="mt-4 h-32 w-full" /> : null}
      {services.isError ? <div className="mt-4"><Alert tone="danger" title="Unable to load category services">{errorMessage(services.error)}</Alert><Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void services.refetch()}>Try again</Button></div> : null}
      {services.isSuccess && services.data.items.length === 0 ? <p className="mt-4 text-sm text-foreground-secondary">No services are assigned to this category or its subcategories.</p> : null}
      {services.isSuccess && services.data.items.length > 0 ? (
        <ul className="mt-4 space-y-2" aria-label="Category services">
          {services.data.items.map((service) => (
            <li key={service.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-3">
              <div>
                <p className="font-medium">{service.name}{service.deletedAt ? ' · Deleted' : !service.isActive ? ' · Inactive' : ''}</p>
                <p className="text-sm text-foreground-secondary">Category: {service.category.name}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{service.listingCount} {service.listingCount === 1 ? 'listing' : 'listings'}</Badge>
                {canManage && confirming !== service.id ? <Button type="button" variant="destructive" size="sm" aria-label={`Delete ${service.name}`} disabled={service.listingCount > 0 || mutation.isPending} onClick={() => { mutation.reset(); setConfirming(service.id); }}>Delete</Button> : null}
                {canManage && confirming === service.id ? <div className="flex flex-wrap items-center gap-2"><span className="text-sm">Delete {service.name}?</span><Button type="button" variant="outline" size="sm" disabled={mutation.isPending} onClick={() => setConfirming(null)}>Cancel</Button><Button type="button" variant="destructive" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ type: 'delete', id: service.id })}>Confirm delete</Button></div> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {services.data && services.data.pagination.totalPages > 1 ? <div className="mt-4 flex items-center gap-3"><Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm" aria-live="polite">Page {page} of {services.data.pagination.totalPages}</span><Button type="button" variant="outline" size="sm" disabled={page >= services.data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div> : null}
    </section>
  );
}

function CategoryDialog({ category, token, canManageServices, pending, error, onClose, onSave }: {
  category: AdminCategory | 'new'; token: string; canManageServices: boolean; pending: boolean; error: unknown; onClose: () => void; onSave: (name: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(category === 'new' ? '' : category.name);
  const [validationError, setValidationError] = useState('');
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    const value = name.trim();
    if (!value) { setValidationError('Enter a category name.'); return; }
    setValidationError('');
    if (!pending) onSave(value);
  }
  return <dialog ref={dialogRef} aria-labelledby="category-dialog-title" onCancel={(event) => { event.preventDefault(); if (!pending) onClose(); }} className="m-auto max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-6 text-foreground shadow-lg backdrop:bg-black/50">
    <h2 id="category-dialog-title" className="text-lg font-semibold text-primary">{category === 'new' ? 'Add service category' : 'Edit service category'}</h2>
    <form className="mt-4 space-y-4" onSubmit={submit}>
      {error ? <Alert tone="danger" title="Could not save service category">{errorMessage(error)}</Alert> : null}
      <FormField label="Category name" htmlFor="category-name" required error={validationError}>
        <Input id="category-name" value={name} onChange={(event) => { setName(event.target.value); setValidationError(''); }} maxLength={160} autoFocus disabled={pending} aria-required="true" aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'category-name-error' : undefined} />
      </FormField>
      {category === 'new' ? <p className="text-xs text-foreground-secondary">The category URL is generated from its name and must include English letters or numbers.</p> : <p className="text-xs text-foreground-secondary">The existing category URL will stay the same.</p>}
      <div className="flex justify-end gap-3"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button><Button type="submit" isLoading={pending}>{category === 'new' ? 'Add category' : 'Save changes'}</Button></div>
    </form>
    {category !== 'new' ? <CategoryServicesPanel category={category} token={token} canManage={canManageServices} editable /> : null}
  </dialog>;
}
