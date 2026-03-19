"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import UserNav from "@/components/user-nav";
import { formatAppError, getSupabaseBrowserClient } from "@/lib/supabase";

const NOTE_MAX = 280;

export default function RequestSongPage() {
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const canSubmit = Boolean(songTitle.trim() && artistName.trim()) && !isSaving;

  async function onSubmitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    setError("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const titleValue = songTitle.trim();
      const artistValue = artistName.trim();
      const noteValue = note.trim();

      if (!titleValue || !artistValue) {
        throw new Error("Song title and artist name are required.");
      }

      const supabase = getSupabaseBrowserClient();
      const db = supabase as unknown as {
        from: (table: string) => {
          insert: (values: Array<{ title: string; artist: string; note: string | null }>) => Promise<{
            error: { message: string } | null;
          }>;
        };
      };
      const { error } = await db.from("song_requests").insert([
        {
          title: titleValue,
          artist: artistValue,
          note: noteValue || null,
        },
      ]);

      if (error) throw new Error(error.message);

      setSongTitle("");
      setArtistName("");
      setNote("");
      setSuccessMessage("Request submitted.");
    } catch (e) {
      setError(formatAppError(e, "Failed to submit request."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="grain">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
        <UserNav />
        <section className="card overflow-hidden rounded-3xl">
          <div className="grid grid-cols-1 lg:grid-cols-[0.92fr_1.08fr]">
            <aside className="border-b border-[var(--line)] bg-[var(--surface-soft)] p-6 lg:border-r lg:border-b-0">
              <p className="eyebrow">Request Queue</p>
              <h1 className="display-title mt-3">Request a song for Hexora.</h1>
              <p className="body-copy mt-3">
                Share exact song and artist names so we can verify and add lyrics faster.
              </p>

              <div className="mt-6 space-y-3">
                <article className="card rounded-2xl p-4">
                  <p className="eyebrow">Tip 01</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Use official song titles from streaming platforms.</p>
                </article>
                <article className="card rounded-2xl p-4">
                  <p className="eyebrow">Tip 02</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Add version details in notes, such as live, remix, or language.</p>
                </article>
              </div>

              <Link href="/" className="btn btn-secondary btn-mono mt-6">
                Back to Search
              </Link>
            </aside>

            <div className="p-6">
              <p className="eyebrow">Request Form</p>
              <p className="body-copy mt-2">Fields marked with * are required before submit.</p>

              <form onSubmit={onSubmitRequest} className="mt-6 space-y-4">
                <label className="ui-label">
                  <span>
                    Song Title <span aria-hidden="true">*</span>
                  </span>
                  <input
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    required
                    autoComplete="off"
                    aria-invalid={Boolean(error && !songTitle.trim())}
                    className="ui-input"
                    placeholder="Shape of You"
                  />
                </label>

                <label className="ui-label">
                  <span>
                    Artist Name <span aria-hidden="true">*</span>
                  </span>
                  <input
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    required
                    autoComplete="off"
                    aria-invalid={Boolean(error && !artistName.trim())}
                    className="ui-input"
                    placeholder="Ed Sheeran"
                  />
                </label>

                <label className="ui-label">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">Note (Optional)</span>
                    <span className="mono text-[10px] uppercase tracking-widest text-[var(--muted)]">
                      {note.length}/{NOTE_MAX}
                    </span>
                  </div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    maxLength={NOTE_MAX}
                    className="ui-textarea"
                    placeholder="Any details for this request..."
                  />
                </label>

                <button type="submit" disabled={!canSubmit} className="btn btn-primary w-full">
                  {isSaving ? "Submitting..." : "Submit Request"}
                </button>
              </form>

              <div aria-live="polite" className="mt-4 space-y-2">
                {error ? <p className="status-box status-error">{error}</p> : null}
                {successMessage ? <p className="status-box status-success">{successMessage}</p> : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
