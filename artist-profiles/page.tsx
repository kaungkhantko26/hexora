"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient, type ArtistProfile } from "@/lib/supabase";
import UserNav from "@/components/user-nav";

export default function ArtistProfilesPage() {
  const [artistProfiles, setArtistProfiles] = useState<ArtistProfile[]>([]);
  const [artistQuery, setArtistQuery] = useState("");
  const [isArtistLoading, setIsArtistLoading] = useState(true);
  const [artistError, setArtistError] = useState("");

  async function loadArtists(q?: string) {
    setIsArtistLoading(true);
    setArtistError("");
    try {
      const supabase = getSupabaseBrowserClient();
      let query = supabase
        .from("artists")
        .select("id, name, slug, bio, genre, created_at")
        .order("name", { ascending: true });

      if (q?.trim()) {
        query = query.or(`name.ilike.%${q.trim()}%,genre.ilike.%${q.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const sorted = [...((data ?? []) as ArtistProfile[])].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
      setArtistProfiles(sorted);
    } catch (e) {
      setArtistError(e instanceof Error ? e.message : "Failed to load artist profiles.");
    } finally {
      setIsArtistLoading(false);
    }
  }

  useEffect(() => {
    loadArtists();
  }, []);

  async function onSearchArtists(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadArtists(artistQuery);
  }

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 md:px-8">
        <UserNav />
        <section className="card rounded-3xl p-6">
          <h1 className="text-3xl font-semibold leading-tight">Artist Profile List</h1>
          <p className="mt-2 text-sm text-[#4e4537]">
            Browse artist profiles before searching for songs.
          </p>

          <form onSubmit={onSearchArtists} className="mt-4 flex gap-2">
            <input
              value={artistQuery}
              onChange={(e) => setArtistQuery(e.target.value)}
              className="w-full rounded-xl border border-[#d7c9b2] bg-white px-3 py-2 text-sm outline-none ring-[#0f8a6f]/35 focus:ring-4"
              placeholder="Search artist profiles..."
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
            >
              Find
            </button>
          </form>

          {artistError ? <p className="mt-3 text-sm text-[var(--danger)]">{artistError}</p> : null}

          <div className="mt-4 space-y-3">
            {isArtistLoading ? (
              <p className="text-sm text-[#6b604e]">Loading artist profiles...</p>
            ) : artistProfiles.length === 0 ? (
              <p className="text-sm text-[#6b604e]">No artist profiles found.</p>
            ) : (
              artistProfiles.map((profile) => (
                <Link
                  key={profile.id}
                  href={`/artist?slug=${encodeURIComponent(profile.slug)}`}
                  className="block rounded-2xl border border-[#e1d4c0] bg-[#fffcf6] p-4"
                >
                  <h3 className="text-lg font-semibold">{profile.name}</h3>
                  <p className="mt-1 text-sm text-[#4d4538]">{profile.genre || "No genre yet."}</p>
                  <p className="mono mt-2 text-xs uppercase tracking-widest text-[#6f6454]">
                    View songs
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
