"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient, type Lyric } from "@/lib/supabase";
import UserNav from "@/components/user-nav";

export default function Home() {
  const [results, setResults] = useState<Lyric[]>([]);
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  async function onSearchLyrics(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSearched(true);
    setSearchError("");

    if (!artist.trim() && !title.trim()) {
      setResults([]);
      setSearchError("Type an artist name or song name.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      let query = supabase
        .from("lyrics")
        .select("id, title, artist, artist_id, youtube_url, spotify_url, lyrics, created_at")
        .order("created_at", { ascending: false });

      if (artist.trim()) {
        query = query.ilike("artist", `%${artist.trim()}%`);
      }

      if (title.trim()) {
        query = query.ilike("title", `%${title.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      setResults(data ?? []);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Failed to search lyrics.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 md:px-8">
        <UserNav />

        <section className="card rounded-3xl p-6">
          <h1 className="text-3xl font-semibold leading-tight">Find Song Lyrics</h1>
          <p className="mt-2 text-sm text-[#4e4537]">
            Search by artist name, song name, or both.
          </p>
          <Link
            href="/request-song"
            className="mono mt-4 inline-block rounded-lg border border-[#d7c9b2] bg-[#fffcf6] px-3 py-2 text-xs uppercase tracking-widest text-[#5a503f] transition hover:bg-[#f4ecdf]"
          >
            Request a song
          </Link>

          <form onSubmit={onSearchLyrics} className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mono text-xs uppercase tracking-widest text-[#685d4d]">
                Artist Name
              </span>
              <input
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#d7c9b2] bg-white px-3 py-2 text-sm outline-none ring-[#0f8a6f]/35 focus:ring-4"
                placeholder="Taylor Swift"
              />
            </label>

            <label className="block">
              <span className="mono text-xs uppercase tracking-widest text-[#685d4d]">
                Song Name
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#d7c9b2] bg-white px-3 py-2 text-sm outline-none ring-[#0f8a6f]/35 focus:ring-4"
                placeholder="Love Story"
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="md:col-span-2 w-full rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Searching..." : "Search Lyrics"}
            </button>
          </form>

          {searchError ? <p className="mt-3 text-sm text-[var(--danger)]">{searchError}</p> : null}

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <p className="text-sm text-[#6b604e]">Loading lyrics...</p>
            ) : hasSearched && results.length === 0 ? (
              <p className="text-sm text-[#6b604e]">No lyrics found for that search.</p>
            ) : !hasSearched ? (
              <p className="text-sm text-[#6b604e]">Search to see lyrics.</p>
            ) : (
              results.map((item) => (
                <article key={item.id} className="rounded-2xl border border-[#e1d4c0] bg-[#fffcf6] p-4">
                  <header className="mb-2">
                    <Link
                      href={`/song?id=${item.id}`}
                      className="text-lg font-semibold underline-offset-2 hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="mono text-xs text-[#726758]">{item.artist}</p>
                  </header>
                  <p className="mono text-[10px] uppercase tracking-widest text-[#6f6454]">
                    Click title to view lyrics
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
