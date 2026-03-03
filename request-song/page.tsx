"use client";

import { FormEvent, useState } from "react";
import UserNav from "@/components/user-nav";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function RequestSongPage() {
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
      setError(e instanceof Error ? e.message : "Failed to submit request.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 md:px-8">
        <UserNav />
        <section className="card rounded-3xl p-6">
          <h1 className="text-3xl font-semibold leading-tight">Request Song</h1>
          <p className="mt-2 text-sm text-[#4e4537]">
            Send a song request and we can add it to the website later.
          </p>

          <form onSubmit={onSubmitRequest} className="mt-6 space-y-3">
            <label className="block">
              <span className="mono text-xs uppercase tracking-widest text-[#685d4d]">Song Title</span>
              <input
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-[#d7c9b2] bg-white px-3 py-2 text-sm outline-none ring-[#0f8a6f]/35 focus:ring-4"
                placeholder="Shape of You"
              />
            </label>

            <label className="block">
              <span className="mono text-xs uppercase tracking-widest text-[#685d4d]">Artist Name</span>
              <input
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-[#d7c9b2] bg-white px-3 py-2 text-sm outline-none ring-[#0f8a6f]/35 focus:ring-4"
                placeholder="Ed Sheeran"
              />
            </label>

            <label className="block">
              <span className="mono text-xs uppercase tracking-widest text-[#685d4d]">
                Note (optional)
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-y rounded-xl border border-[#d7c9b2] bg-white px-3 py-2 text-sm outline-none ring-[#0f8a6f]/35 focus:ring-4"
                placeholder="Any details for this request..."
              />
            </label>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Submitting..." : "Submit Request"}
            </button>
          </form>

          {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
          {successMessage ? <p className="mt-3 text-sm text-[var(--accent)]">{successMessage}</p> : null}
        </section>
      </div>
    </main>
  );
}
