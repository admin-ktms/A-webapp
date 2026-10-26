import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!data.session) {
        throw new Error(
          "No recovery session found. Open the latest password-reset email link and try again."
        );
      }

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setMessage(
        "Password updated. You can now return to the sign-in page."
      );
      setPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Password update failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-text">
      <section className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-xl sm:p-8">
        <h1 className="text-2xl font-bold">Set a new password</h1>

        <p className="mt-2 text-sm text-muted">
          Choose a new password for your KTMS account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="min-h-12 w-full rounded-lg border border-border bg-background px-4 text-text outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-medium"
            >
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
              className="min-h-12 w-full rounded-lg border border-border bg-background px-4 text-text outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-lg bg-cyan px-4 font-semibold text-background disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update password"}
          </button>

          {message && (
            <p role="status" className="rounded-lg border border-border p-3 text-sm text-muted">
              {message}
            </p>
          )}

          {errorMessage && (
            <p role="alert" className="rounded-lg border border-alert/40 bg-alert/10 p-3 text-sm text-alert">
              {errorMessage}
            </p>
          )}

          <Link
            to="/login"
            className="block text-center text-sm text-cyan hover:underline"
          >
            Return to sign in
          </Link>
        </form>
      </section>
    </main>
  );
}

export default ResetPasswordPage;
