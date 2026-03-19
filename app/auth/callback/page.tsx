"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  formatAppError,
  getSupabaseBrowserClient,
} from "@/lib/supabase";

type SupportedOtpType = "email" | "signup" | "recovery" | "invite" | "email_change";

function isSupportedOtpType(value: string): value is SupportedOtpType {
  return value === "email" || value === "signup" || value === "recovery" || value === "invite" || value === "email_change";
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Checking the Supabase auth link...");

  const nextPath = useMemo(() => {
    const raw = searchParams.get("next") || "/admin";
    return raw.startsWith("/") ? raw : "/admin";
  }, [searchParams]);

  useEffect(() => {
    let isActive = true;
    let timer: number | null = null;

    async function handleCallback() {
      try {
        const supabase = getSupabaseBrowserClient();
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const code = searchParams.get("code") || hashParams.get("code");
        const tokenHash = searchParams.get("token_hash") || hashParams.get("token_hash");
        const rawType = searchParams.get("type") || hashParams.get("type");
        const errorDescription = searchParams.get("error_description") || hashParams.get("error_description");

        if (errorDescription) {
          throw new Error(errorDescription);
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw new Error(error.message);
        } else if (tokenHash && rawType && isSupportedOtpType(rawType)) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: rawType,
          });
          if (error) throw new Error(error.message);
        } else {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw new Error(error.message);
          if (!data.session) {
            throw new Error("This confirmation link is invalid or expired.");
          }
        }

        if (!isActive) return;

        if (rawType === "recovery") {
          setStatus("success");
          setMessage("Reset link accepted. Redirecting to the password update page...");
          timer = window.setTimeout(() => {
            router.replace("/reset-password");
          }, 900);
          return;
        }

        setStatus("success");
        setMessage("Email confirmed. Redirecting to the admin page...");
        timer = window.setTimeout(() => {
          router.replace(nextPath);
        }, 1200);
      } catch (e) {
        if (!isActive) return;
        setStatus("error");
        setMessage(formatAppError(e, "Unable to confirm this auth link."));
      }
    }

    handleCallback();

    return () => {
      isActive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [nextPath, router, searchParams]);

  return (
    <main className="grain">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:px-8">
        <section className="card rounded-3xl p-6 md:p-8">
          <p className="eyebrow">Admin Access</p>
          <h1 className="display-title mt-2">
            {status === "loading" ? "Validating link..." : status === "success" ? "Link accepted." : "Link failed."}
          </h1>

          <p className={`mt-4 status-box ${status === "error" ? "status-error" : "status-success"}`}>
            {message}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin" className="btn btn-secondary btn-mono">
              Admin Login
            </Link>
            <Link href="/reset-password" className="btn btn-secondary btn-mono">
              Reset Password
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="grain">
          <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
            <section className="card rounded-3xl p-6">
              <p className="body-copy">Checking the auth link...</p>
            </section>
          </div>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
