"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  formatAppError,
  getBrowserRedirectUrl,
  getSupabaseBrowserClient,
} from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;
    let subscription: { unsubscribe: () => void } | null = null;

    async function initRecoveryState() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.auth.getSession();
        if (!isActive) return;
        if (error) throw new Error(error.message);
        if (data.session) {
          setMode("update");
        }

        const authListener = supabase.auth.onAuthStateChange((event, session) => {
          if (!isActive) return;
          if (event === "PASSWORD_RECOVERY" || session) {
            setMode("update");
          }
        });

        subscription = authListener.data.subscription;
      } catch (e) {
        if (!isActive) return;
        setError(formatAppError(e, "Unable to open password reset."));
      }
    }

    initRecoveryState();

    return () => {
      isActive = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function onSendResetLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      const value = email.trim();
      if (!value) throw new Error("Email is required.");

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(value, {
        redirectTo: getBrowserRedirectUrl("/auth/callback?next=/reset-password"),
      });
      if (error) throw new Error(error.message);

      setSuccessMessage("Password reset email sent. Check your inbox.");
    } catch (e) {
      setError(formatAppError(e, "Failed to send password reset email."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      if (!password || !confirmPassword) throw new Error("Enter your new password twice.");
      if (password.length < 8) throw new Error("New password must be at least 8 characters.");
      if (password !== confirmPassword) throw new Error("Passwords do not match.");

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);

      setSuccessMessage("Password updated. You can now continue to the admin login.");
      setPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(formatAppError(e, "Failed to update password."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grain">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:px-8">
        <section className="card rounded-3xl p-6 md:p-8">
          <p className="eyebrow">Admin Access</p>
          <h1 className="display-title mt-2">
            {mode === "update" ? "Set a new admin password." : "Reset the admin password."}
          </h1>
          <p className="body-copy mt-2">
            {mode === "update"
              ? "Your recovery link was accepted. Save a new password for the admin account."
              : "Enter the admin email to receive a Supabase password reset link."}
          </p>

          {mode === "request" ? (
            <form onSubmit={onSendResetLink} className="mt-6 space-y-4">
              <label className="ui-label">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ui-input"
                  placeholder="admin@example.com"
                  required
                  autoComplete="email"
                />
              </label>

              <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
                {isSubmitting ? "Sending..." : "Send Reset Email"}
              </button>
            </form>
          ) : (
            <form onSubmit={onUpdatePassword} className="mt-6 space-y-4">
              <label className="ui-label">
                <span>New Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ui-input"
                  placeholder="At least 8 characters"
                  required
                  autoComplete="new-password"
                />
              </label>

              <label className="ui-label">
                <span>Confirm Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="ui-input"
                  placeholder="Repeat new password"
                  required
                  autoComplete="new-password"
                />
              </label>

              <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
                {isSubmitting ? "Saving..." : "Update Password"}
              </button>
            </form>
          )}

          <div aria-live="polite" className="mt-4 space-y-2">
            {error ? <p className="status-box status-error">{error}</p> : null}
            {successMessage ? <p className="status-box status-success">{successMessage}</p> : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin" className="btn btn-secondary btn-mono">
              Back to Admin
            </Link>
            <Link href="/" className="btn btn-secondary btn-mono">
              Back to Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
