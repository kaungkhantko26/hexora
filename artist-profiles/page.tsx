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
    <main className="grain">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
        <UserNav />

        <section className="card rounded-3xl p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Artist Directory</p>
              <h1 className="display-title mt-2">Find artists and open their song collections.</h1>
              <p className="body-copy mt-2">Search by artist name or genre.</p>
            </div>
            <div className="ui-chip">{artistProfiles.length} artists</div>
          </div>

          <form onSubmit={onSearchArtists} className="mt-6 flex flex-col gap-2 md:flex-row">
            <input
              value={artistQuery}
              onChange={(e) => setArtistQuery(e.target.value)}
              className="ui-input"
              placeholder="Search artist profiles..."
            />
            <button type="submit" className="btn btn-primary md:min-w-32">
              Search
            </button>
          </form>

          {artistError ? <p className="status-box status-error mt-4">{artistError}</p> : null}

          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {isArtistLoading ? (
              <p className="body-copy md:col-span-2 lg:col-span-3">Loading artist profiles...</p>
            ) : artistProfiles.length === 0 ? (
              <p className="body-copy md:col-span-2 lg:col-span-3">No artist profiles found.</p>
            ) : (
              artistProfiles.map((profile) => (
                <Link
                  key={profile.id}
                  href={`/artist?slug=${encodeURIComponent(profile.slug)}`}
                  className="card rounded-2xl p-4 transition hover:-translate-y-0.5"
                >
                  <h3 className="text-lg font-semibold">{profile.name}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{profile.genre || "No genre yet."}</p>
                  {profile.bio ? <p className="mt-2 line-clamp-3 text-sm text-[var(--muted)]">{profile.bio}</p> : null}
                  <p className="eyebrow mt-3">View Songs</p>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
