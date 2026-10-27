import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAdminAuth } from "../auth/AdminAuthContext";

type LoginMode = "password" | "otp" | "reset";

function LoginPage() {
  const navigate = useNavigate();
  const { status, reasonCode } = useAdminAuth();
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (status === "authorized") {
      navigate("/admin", { replace: true });
    } else if (status === "denied") {
      setErrorMessage(
        `This account does not have an active KTMS admin identity. Reference: ${
          reasonCode ?? "ADMIN_ACCESS_DENIED"
        }`,
      );
    } else if (status === "error") {
      setErrorMessage(
        "KTMS could not verify your admin identity. Protected access has been blocked.",
      );
    }
  }, [status, reasonCode, navigate]);

  function changeMode(nextMode: LoginMode) {
    setMode(nextMode);
    setOtpSent(false);
    setOtp("");
    setMessage("");
    setErrorMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (mode === "password") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) throw error;

        setMessage(
          "Authentication succeeded. Verifying KTMS admin identity…"
        );
        
      } else if (mode === "otp" && !otpSent) {
        const { error } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            shouldCreateUser: false,
          },
        });

        if (error) throw error;

        setOtpSent(true);
        setMessage("If the account is eligible, an email sign-in code has been requested.");
      } else if (mode === "otp" && otpSent) {
        const { error } = await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token: otp.trim(),
          type: "email",
        });

        if (error) throw error;

        setMessage(
          "Authentication succeeded. Verifying KTMS admin identity…"
        );
        
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );

        if (error) throw error;

        setMessage(
          "If an eligible account exists, a password-reset email will be sent."
        );
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Authentication request failed."
      );
    } finally {
      setLoading(false);
    }
  }

  const heading =
    mode === "password"
      ? "Welcome back"
      : mode === "otp"
        ? "Sign in with email"
        : "Reset password";

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

          <h1 className="mt-5 text-2xl font-bold">{heading}</h1>

          <p className="mt-2 text-sm text-muted">
            KickOff Tournament Management System
          </p>
        </div>

        {mode !== "reset" && (
          <div className="mb-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => changeMode("password")}
              className={`min-h-11 rounded-lg border px-3 text-sm font-medium ${
                mode === "password"
                  ? "border-cyan bg-cyan/10 text-cyan"
                  : "border-border text-muted"
              }`}
            >
              Password
            </button>

            <button
              type="button"
              onClick={() => changeMode("otp")}
              className={`min-h-11 rounded-lg border px-3 text-sm font-medium ${
                mode === "otp"
                  ? "border-cyan bg-cyan/10 text-cyan"
                  : "border-border text-muted"
              }`}
            >
              Email OTP
            </button>
          </div>
        )}

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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              required
              disabled={loading || (mode === "otp" && otpSent)}
              className="min-h-12 w-full rounded-lg border border-border bg-background px-4 text-base text-text outline-none placeholder:text-muted focus:border-cyan focus:ring-1 focus:ring-cyan disabled:opacity-60"
            />
          </div>

          {mode === "password" && (
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
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                className="min-h-12 w-full rounded-lg border border-border bg-background px-4 text-base text-text outline-none placeholder:text-muted focus:border-cyan focus:ring-1 focus:ring-cyan"
              />
            </div>
          )}

          {mode === "otp" && otpSent && (
            <div>
              <label
                htmlFor="otp"
                className="mb-2 block text-sm font-medium"
              >
                Email verification code
              </label>

              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="Enter the code from your email"
                required
                className="min-h-12 w-full rounded-lg border border-border bg-background px-4 text-base text-text outline-none placeholder:text-muted focus:border-cyan focus:ring-1 focus:ring-cyan"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-lg bg-cyan px-4 font-semibold text-background transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-cyan focus:ring-offset-2 focus:ring-offset-panel disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : mode === "password"
                ? "Sign in"
                : mode === "reset"
                  ? "Send reset email"
                  : otpSent
                    ? "Verify code"
                    : "Send email code"}
          </button>

          {message && (
            <p
              role="status"
              className="rounded-lg border border-border bg-surface p-3 text-sm text-muted"
            >
              {message}
            </p>
          )}

          {errorMessage && (
            <p
              role="alert"
              className="rounded-lg border border-alert/40 bg-alert/10 p-3 text-sm text-alert"
            >
              {errorMessage}
            </p>
          )}
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-sm">
          {mode !== "reset" ? (
            <button
              type="button"
              onClick={() => changeMode("reset")}
              className="text-cyan hover:underline"
            >
              Forgot your password?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => changeMode("password")}
              className="text-cyan hover:underline"
            >
              Return to sign in
            </button>
          )}

          {mode === "otp" && otpSent && (
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setMessage("");
                setErrorMessage("");
              }}
              className="text-muted hover:text-text"
            >
              Use a different email or request another code
            </button>
          )}

          <Link to="/login" className="text-muted hover:text-text">
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
