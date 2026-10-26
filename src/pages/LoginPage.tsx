import { useState, type FormEvent } from "react";

function LoginPage() {
const [message, setMessage] = useState("");

function handleSubmit(event: FormEvent<HTMLFormElement>) {
event.preventDefault();
setMessage(
"Authentication is not configured yet. Your details have not been submitted."
);
}

return (
<main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-text">
<section className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-xl sm:p-8">
<div className="mb-8 text-center">
<div
className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-2xl font-bold text-cyan"
aria-hidden="true"
>
K
</div>

      <h1 className="mt-5 text-2xl font-bold">
        Welcome back
      </h1>

      <p className="mt-2 text-sm text-muted">
        Sign in to the KickOff admin portal
      </p>
    </div>

    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="admin@example.com"
          required
          className="min-h-12 w-full rounded-lg border border-border bg-background px-4 text-base text-text outline-none placeholder:text-muted focus:border-cyan focus:ring-1 focus:ring-cyan"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          className="min-h-12 w-full rounded-lg border border-border bg-background px-4 text-base text-text outline-none placeholder:text-muted focus:border-cyan focus:ring-1 focus:ring-cyan"
        />
      </div>

      <button
        type="submit"
        className="min-h-12 w-full rounded-lg bg-cyan px-4 font-semibold text-background transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-cyan focus:ring-offset-2 focus:ring-offset-panel"
      >
        Sign in
      </button>

      {message && (
        <p
          role="status"
          className="rounded-lg border border-border bg-surface p-3 text-sm text-muted"
        >
          {message}
        </p>
      )}
    </form>

    <p className="mt-6 text-center text-xs text-muted">
      KickOff Tournament Management System
    </p>
  </section>
</main>

);
}

export default LoginPage;
