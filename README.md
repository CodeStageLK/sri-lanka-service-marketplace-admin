# SERV HUB Administration

Independent React, Vite and TypeScript administration application for users,
providers, reference data and platform operations.

## Setup

Requires Node.js 22 and pnpm 10.

```powershell
pnpm install
Copy-Item .env.example .env
pnpm dev
```

Production builds use `VITE_API_BASE_URL` for the backend's versioned HTTP(S)
API. Local development uses Vite's same-origin `/api` proxy to
`http://localhost:3000`; set `VITE_API_PROXY_TARGET` to override that target.
Vite variables are public and must never contain secrets. The development
server uses port 5175.

## Commands

- `pnpm dev` — development server
- `pnpm build` — type-check and create production build
- `pnpm preview` — preview the production build
- `pnpm lint`, `pnpm typecheck`, `pnpm test` — independent checks

The stack includes React Router, TanStack Query, Zustand, React Hook Form, Zod,
Tailwind CSS and shadcn/ui conventions. No sibling source imports or direct
database access are used.

## Administration responsibilities

- Light/dark mode is available on sign-in and dashboard pages; the choice is
  saved in this application's browser storage.
- Master categories and service data
- Location and provider reference data
- Provider tracking and verification review
- User listing, account updates and soft deletion through the admin users API

The Master data page manages service categories through the protected admin
catalog API. It displays the number of directly assigned services (including
inactive and soft-deleted services). Categories with assigned services or
non-deleted subcategories cannot be deleted. Deletion is a soft delete; category
history and URLs are retained, so a deleted category's URL cannot be reused.
Renaming a category from this page preserves its existing public URL.
Click a category name to see services assigned to it and its subcategories,
their category mapping, and the number of provider listings. Editing a category
also shows these mappings. Users with `services.manage` can add a service to
the selected category or soft-delete a service that has no provider listings;
inactive and unapproved listings also prevent deletion.

The users page can update email, status, customer name and roles supported by
the user's existing profiles. Changing an email requires re-verification.
Deleting a user deactivates the account and revokes sessions. An administrator
cannot edit or delete their own account; only super-administrators can manage
administrator accounts. Super-administrator accounts cannot be changed here.
Removing a provider role deactivates its provider profile; the provider must
reactivate it after the role is restored.

For an isolated development database only, set `VITE_DEMO_ADMIN_EMAIL` and
`VITE_DEMO_ADMIN_PASSWORD` in an ignored `.env.local` to show a one-click demo
login in the development server. These values are exposed to the browser:
never use production credentials or deploy these settings. The button is not
included in production builds. This does not create an account.

Use separate browser profiles when simultaneously testing the admin and portal
with different accounts; both applications use the same backend refresh cookies.
