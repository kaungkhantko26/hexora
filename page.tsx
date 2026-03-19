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

  function onResetSearch() {
    setArtist("");
    setTitle("");
    setResults([]);
    setHasSearched(false);
    setSearchError("");
  }

  return (
    <main className="grain">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
        <UserNav />

        <section className="card rounded-3xl p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <p className="eyebrow">Hexora Library</p>
              <h1 className="display-title mt-3">Find lyrics by artist, song title, or both.</h1>
              <p className="body-copy mt-3 max-w-2xl">
                Search the library instantly, open full lyrics, and jump between artist and song pages without leaving the flow.
              </p>
              <div className="stat-grid mt-5">
                <article className="stat-card">
                  <p>Results</p>
                  <p>{hasSearched ? results.length : "-"}</p>
                </article>
                <article className="stat-card">
                  <p>Status</p>
                  <p>{isLoading ? "Loading" : hasSearched ? "Complete" : "Ready"}</p>
                </article>
              </div>
            </div>

            <aside className="card rounded-2xl bg-[var(--surface-soft)] p-4">
              <p className="eyebrow">Quick Routes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/song-names" className="btn btn-secondary btn-mono">
                  Browse Songs
                </Link>
                <Link href="/artist-profiles" className="btn btn-secondary btn-mono">
                  Browse Artists
                </Link>
                <Link href="/request-song" className="btn btn-secondary btn-mono">
                  Request Song
                </Link>
              </div>
            </aside>
          </div>

          <form onSubmit={onSearchLyrics} className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="ui-label">
              <span>Artist Name</span>
              <input
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="ui-input"
                placeholder="Taylor Swift"
              />
            </label>

            <label className="ui-label">
              <span>Song Name</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="ui-input"
                placeholder="Love Story"
              />
            </label>

            <div className="flex gap-2 md:col-span-2">
              <button type="submit" disabled={isLoading} className="btn btn-primary w-full">
                {isLoading ? "Searching..." : "Search Lyrics"}
              </button>
              <button type="button" onClick={onResetSearch} className="btn btn-secondary w-full md:max-w-40">
                Reset
              </button>
            </div>
          </form>

          {searchError ? <p className="status-box status-error mt-4">{searchError}</p> : null}

          <div className="mt-5 space-y-3">
            {isLoading ? (
              <p className="body-copy">Loading lyrics...</p>
            ) : hasSearched && results.length === 0 ? (
              <p className="body-copy">No lyrics found for that search.</p>
            ) : !hasSearched ? (
              <p className="body-copy">Search to see lyrics.</p>
            ) : (
              results.map((item) => (
                <article key={item.id} className="card rounded-2xl border p-4">
                  <header className="mb-2">
                    <Link href={`/song?id=${item.id}`} className="text-lg font-semibold underline-offset-2 hover:underline">
                      {item.title}
                    </Link>
                    <p className="mono mt-1 text-xs text-[var(--muted)]">{item.artist}</p>
                  </header>
                  <p className="line-clamp-2 whitespace-pre-wrap text-sm text-[var(--muted)]">{item.lyrics}</p>
                  <div className="mt-3">
                    <Link href={`/song?id=${item.id}`} className="btn btn-secondary btn-mono">
                      View Full Lyrics
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
