import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCategory, deleteCategory, listAdminCategories, listServices, renameCategory } from '@/services/catalog-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/display';
import { Alert, ConfirmationDialog, Skeleton } from '@/components/ui/feedback';
import { FormField, Input } from '@/components/ui/form-controls';
import { useAuthStore } from '@/stores/auth-store';
import type { AdminCategory } from '@/types/catalog';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Please try again.';
}

export function MasterDataPage() {
  const { accessToken, user } = useAuthStore();
  const canManage = Boolean(user?.permissions.includes('categories.manage'));
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);
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
      <header><p className="text-sm text-foreground-secondary">Administration</p><h1 className="mt-1 text-3xl font-bold text-primary">Master data</h1></header>
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
                <div><h3 className="font-medium">{category.name}</h3><p className="text-sm text-foreground-secondary">{category.serviceCount} {category.serviceCount === 1 ? 'service' : 'services'}{!category.isActive ? ' · Inactive' : ''}</p>{reason ? <p className="text-xs text-foreground-secondary">{reason}</p> : null}</div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" aria-label={`Edit ${category.name}`} disabled={mutation.isPending} onClick={() => openEditor(category)}>Edit</Button>
                  <Button type="button" variant="destructive" size="sm" aria-label={`Delete ${category.name}`} disabled={Boolean(reason) || mutation.isPending} onClick={() => { mutation.reset(); setMessage(null); setDeleting(category); }}>Delete</Button>
                </div>
              </li>;
            })}
          </ul>
          {categories.data && categories.data.pagination.totalPages > 1 ? <div className="mt-4 flex items-center gap-3"><Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm">Page {page} of {categories.data.pagination.totalPages}</span><Button type="button" variant="outline" size="sm" disabled={page >= categories.data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div> : null}
        </Card>
        <Card className="p-5"><h2 className="font-semibold text-primary">Services</h2>{services.isLoading ? <Skeleton className="mt-4 h-32 w-full" /> : services.isError ? <p className="mt-4 text-sm text-danger">Unable to load services.</p> : <ul className="mt-4 space-y-2">{services.data?.items.map((service) => <li key={service.id} className="rounded-md border border-border px-3 py-2 text-sm">{service.name}</li>)}</ul>}</Card>
      </div>
      {editing ? <CategoryDialog key={editing === 'new' ? 'new' : editing.id} category={editing} pending={mutation.isPending} error={mutation.error} onClose={() => { setEditing(null); mutation.reset(); }} onSave={(name) => mutation.mutate(editing === 'new' ? { type: 'create', name } : { type: 'edit', category: editing, name })} /> : null}
      <ConfirmationDialog open={Boolean(deleting)} title="Delete service category?" description={`Delete ${deleting?.name ?? 'this category'}? It will no longer appear in the catalog.`} confirmLabel="Delete" destructive pending={mutation.isPending} onClose={() => setDeleting(null)} onConfirm={() => { if (deleting && !mutation.isPending) mutation.mutate({ type: 'delete', category: deleting }); }} />
    </section>
  );
}

function CategoryDialog({ category, pending, error, onClose, onSave }: {
  category: AdminCategory | 'new'; pending: boolean; error: unknown; onClose: () => void; onSave: (name: string) => void;
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
  return <dialog ref={dialogRef} aria-labelledby="category-dialog-title" onCancel={(event) => { event.preventDefault(); if (!pending) onClose(); }} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-border bg-card p-6 text-foreground shadow-lg backdrop:bg-black/50">
    <h2 id="category-dialog-title" className="text-lg font-semibold text-primary">{category === 'new' ? 'Add service category' : 'Edit service category'}</h2>
    <form className="mt-4 space-y-4" onSubmit={submit}>
      {error ? <Alert tone="danger" title="Could not save service category">{errorMessage(error)}</Alert> : null}
      <FormField label="Category name" htmlFor="category-name" required error={validationError}>
        <Input id="category-name" value={name} onChange={(event) => { setName(event.target.value); setValidationError(''); }} maxLength={160} autoFocus disabled={pending} aria-required="true" aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'category-name-error' : undefined} />
      </FormField>
      {category === 'new' ? <p className="text-xs text-foreground-secondary">The category URL is generated from its name and must include English letters or numbers.</p> : <p className="text-xs text-foreground-secondary">The existing category URL will stay the same.</p>}
      <div className="flex justify-end gap-3"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button><Button type="submit" isLoading={pending}>{category === 'new' ? 'Add category' : 'Save changes'}</Button></div>
    </form>
  </dialog>;
}
