import { useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/feedback';
import { FormField, Input } from '@/components/ui/form-controls';
import { useAuthStore } from '@/stores/auth-store';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(loginEmail: string, loginPassword: string) {
    setError(null);
    try {
      await login(loginEmail, loginPassword);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void signIn(email, password);
  }

  const demoEmail = import.meta.env.DEV ? import.meta.env.VITE_DEMO_ADMIN_EMAIL : undefined;
  const demoPassword = import.meta.env.DEV ? import.meta.env.VITE_DEMO_ADMIN_PASSWORD : undefined;

  return (
    <form className="space-y-5" onSubmit={submit}>
      <h1 className="text-2xl font-bold text-primary">Administration sign in</h1>
      <FormField label="Email" htmlFor="admin-email" required><Input id="admin-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></FormField>
      <FormField label="Password" htmlFor="admin-password" required>
        <div className="relative"><Input id="admin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="pr-11" /><button type="button" className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-md" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
      </FormField>
      {error ? <Alert tone="danger" title="Sign-in unavailable">{error}</Alert> : null}
      <Button type="submit" className="w-full" isLoading={isLoading}>Sign in</Button>
      {demoEmail && demoPassword ? (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-sm font-semibold">Development demo sign in</p>
          <p className="text-xs text-foreground-secondary">Demo credentials are visible to users of this development app.</p>
          <Button type="button" disabled={isLoading} onClick={() => void signIn(demoEmail, demoPassword)}>Administrator</Button>
        </div>
      ) : null}
    </form>
  );
}
