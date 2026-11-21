import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/display';
import { Alert } from '@/components/ui/feedback';
import { Checkbox, FormField, Input, Select } from '@/components/ui/form-controls';
import { deleteUser, listUsers, updateUser, type AdminUser, type UserRole, type UserStatus, type UserUpdate } from '@/services/admin-users-api';
import { useAuthStore } from '@/stores/auth-store';

const statuses: UserStatus[] = ['ACTIVE', 'PENDING', 'SUSPENDED', 'DEACTIVATED'];

export function UsersPage() {
  const { accessToken, user: actor } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-users', actor?.id, page, search],
    queryFn: ({ signal }) => {
      if (!accessToken) throw new Error('Your session has expired. Please sign in again.');
      return listUsers(accessToken, page, search, signal);
    },
    enabled: Boolean(accessToken),
  });
  const mutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input?: UserUpdate }) => {
      if (!accessToken) throw new Error('Your session has expired. Please sign in again.');
      if (input) await updateUser(accessToken, id, input);
      else await deleteUser(accessToken, id);
    },
    onSuccess: async (_result, variables) => {
      setEditing(null);
      setMessage(variables.input ? 'User updated.' : 'User deleted and sessions revoked.');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
  const isSuperAdmin = Boolean(actor?.roles.includes('SUPER_ADMIN'));

  return (
    <section className="space-y-6">
      <header><p className="text-sm text-foreground-secondary">Administration</p><h1 className="mt-1 text-3xl font-bold text-primary">Users</h1></header>
      {message ? <Alert tone="success" title="Saved">{message}</Alert> : null}
      {mutation.error ? <Alert tone="danger" title="Could not update user">{mutation.error instanceof Error ? mutation.error.message : 'Please try again.'}</Alert> : null}
      <FormField label="Search by email" htmlFor="user-search"><Input id="user-search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></FormField>
      {query.isLoading ? <p>Loading users…</p> : null}
      {query.error ? <Alert tone="danger" title="Could not load users">{query.error instanceof Error ? query.error.message : 'Please try again.'}</Alert> : null}
      {query.data?.items.length === 0 ? <p>No users found.</p> : null}
      <div className="space-y-3">
        {query.data?.items.map((item) => {
          const canManage = item.id !== actor?.id && !item.roles.includes('SUPER_ADMIN') && (isSuperAdmin || !item.roles.includes('ADMIN'));
          return <Card className="p-5" key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h2 className="font-semibold">{item.email ?? 'No email'}</h2><p className="text-sm text-foreground-secondary">{item.roles.join(', ')} · {item.status} · Email {item.isEmailVerified ? 'verified' : 'unverified'}</p></div>
              {canManage ? <div className="flex gap-2">
                <Button type="button" disabled={mutation.isPending} onClick={() => { mutation.reset(); setMessage(null); setEditing(item); }}>Edit</Button>
                <Button type="button" disabled={mutation.isPending} onClick={() => { if (window.confirm(`Soft-delete ${item.email ?? 'this user'} and revoke their sessions?`)) { setMessage(null); mutation.mutate({ id: item.id }); } }}>Delete</Button>
              </div> : null}
            </div>
          </Card>;
        })}
      </div>
      {query.data ? <div className="flex items-center gap-3"><Button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span>Page {page} · {query.data.total} users</span><Button type="button" disabled={page * query.data.limit >= query.data.total} onClick={() => setPage((value) => value + 1)}>Next</Button></div> : null}
      {editing ? <EditUserForm key={editing.id} user={editing} isSuperAdmin={isSuperAdmin} isPending={mutation.isPending} onCancel={() => setEditing(null)} onSave={(input) => mutation.mutate({ id: editing.id, input })} /> : null}
    </section>
  );
}

function EditUserForm({ user, isSuperAdmin, isPending, onCancel, onSave }: {
  user: AdminUser; isSuperAdmin: boolean; isPending: boolean; onCancel: () => void; onSave: (input: UserUpdate) => void;
}) {
  const [email, setEmail] = useState(user.email ?? '');
  const [status, setStatus] = useState(user.status);
  const [firstName, setFirstName] = useState(user.customerProfile?.firstName ?? '');
  const [lastName, setLastName] = useState(user.customerProfile?.lastName ?? '');
  const [roles, setRoles] = useState(user.roles);
  const options: UserRole[] = [
    ...(user.customerProfile ? ['CUSTOMER' as const] : []),
    ...(user.providerProfile ? [user.providerProfile.providerType === 'BUSINESS' ? 'BUSINESS_PROVIDER' as const : 'INDIVIDUAL_PROVIDER' as const] : []),
    ...(isSuperAdmin ? ['ADMIN' as const] : []),
  ];
  function submit(event: FormEvent) {
    event.preventDefault();
    const changed: UserUpdate = {};
    if (email !== (user.email ?? '')) changed.email = email;
    if (status !== user.status) changed.status = status;
    if (user.customerProfile && firstName !== user.customerProfile.firstName) changed.firstName = firstName;
    if (user.customerProfile && lastName !== user.customerProfile.lastName) changed.lastName = lastName;
    if (roles.length !== user.roles.length || roles.some((role) => !user.roles.includes(role))) changed.roles = roles;
    onSave(changed);
  }
  return <Card className="p-5">
    <h2 className="text-xl font-semibold">Edit user</h2>
    <form className="mt-4 space-y-4" onSubmit={submit}>
      <FormField label="Email" htmlFor="edit-email"><Input id="edit-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></FormField>
      <p className="text-sm text-foreground-secondary">Changing email requires the user to verify their new address and revokes their sessions.</p>
      <FormField label="Account status" htmlFor="edit-status"><Select id="edit-status" value={status} onChange={(event) => setStatus(event.target.value as UserStatus)}>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</Select></FormField>
      {user.customerProfile ? <><FormField label="First name" htmlFor="edit-first"><Input id="edit-first" required value={firstName} onChange={(event) => setFirstName(event.target.value)} /></FormField><FormField label="Last name" htmlFor="edit-last"><Input id="edit-last" required value={lastName} onChange={(event) => setLastName(event.target.value)} /></FormField></> : null}
      <fieldset><legend className="font-semibold">Roles</legend><p className="text-sm text-foreground-secondary">Customer and provider roles require their matching profiles.</p><div className="mt-2 space-y-2">{options.map((role) => <label key={role} className="flex items-center gap-2"><Checkbox checked={roles.includes(role)} onChange={(event) => setRoles((current) => event.target.checked ? [...current, role] : current.filter((value) => value !== role))} />{role}</label>)}</div></fieldset>
      <div className="flex gap-2"><Button type="submit" disabled={isPending || roles.length === 0}>Save</Button><Button type="button" disabled={isPending} onClick={onCancel}>Cancel</Button></div>
    </form>
  </Card>;
}
