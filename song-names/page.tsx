"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient, type ArtistProfile, type Lyric } from "@/lib/supabase";
import UserNav from "@/components/user-nav";

export default function SongNamesPage() {
  const [songNames, setSongNames] = useState<Array<{ id: number; title: string; artist: string }>>([]);
  const [songQuery, setSongQuery] = useState("");
  const [artistSlugByName, setArtistSlugByName] = useState<Record<string, string>>({});
  const [isSongListLoading, setIsSongListLoading] = useState(true);
  const [songListError, setSongListError] = useState("");

  const normalizedQuery = songQuery.trim().toLowerCase();
  const filteredSongNames = songNames.filter((song) => {
    if (!normalizedQuery) return true;
    return song.title.toLowerCase().includes(normalizedQuery) || song.artist.toLowerCase().includes(normalizedQuery);
  });

  useEffect(() => {
    async function loadSongNames() {
      setIsSongListLoading(true);
      setSongListError("");
      try {
        const supabase = getSupabaseBrowserClient();
        const [lyricsResult, artistsResult] = await Promise.all([
          supabase
            .from("lyrics")
            .select("id, title, artist, artist_id, youtube_url, spotify_url, lyrics, created_at")
            .order("created_at", { ascending: false }),
          supabase.from("artists").select("id, name, slug, bio, created_at"),
        ]);

        if (lyricsResult.error) throw new Error(lyricsResult.error.message);
        if (artistsResult.error) throw new Error(artistsResult.error.message);

        const list = (lyricsResult.data as Lyric[]).map((item) => ({
          id: item.id,
          title: item.title,
          artist: item.artist,
        }));
        setSongNames(list);

        const slugMap: Record<string, string> = {};
        for (const artist of (artistsResult.data ?? []) as ArtistProfile[]) {
          slugMap[artist.name.toLowerCase()] = artist.slug;
        }
        setArtistSlugByName(slugMap);
      } catch (e) {
        setSongListError(e instanceof Error ? e.message : "Failed to load song names.");
      } finally {
        setIsSongListLoading(false);
      }
    }

    loadSongNames();
  }, []);

  return (
    <main className="grain">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
        <UserNav />

        <section className="card rounded-3xl p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Song Index</p>
              <h1 className="display-title mt-2">Browse every song title in the library.</h1>
              <p className="body-copy mt-2">Use the search box to narrow by title or artist in real time.</p>
            </div>
            <div className="ui-chip">{filteredSongNames.length} shown</div>
          </div>

          <label className="ui-label mt-6">
            <span>Search Songs</span>
            <input
              value={songQuery}
              onChange={(e) => setSongQuery(e.target.value)}
              className="ui-input"
              placeholder="Search by song title or artist..."
            />
          </label>

          {songListError ? <p className="status-box status-error mt-4">{songListError}</p> : null}

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {isSongListLoading ? (
              <p className="body-copy md:col-span-2">Loading song names...</p>
            ) : filteredSongNames.length === 0 ? (
              <p className="body-copy md:col-span-2">
                {songNames.length === 0 ? "No song names yet." : "No songs match your search."}
              </p>
            ) : (
              filteredSongNames.map((song, index) => {
                const artistSlug = artistSlugByName[song.artist.toLowerCase()];
                return (
                  <article key={`${song.id}-${index}`} className="card rounded-2xl p-4">
                    <Link href={`/song?id=${song.id}`} className="text-lg font-semibold underline-offset-2 hover:underline">
                      {song.title}
                    </Link>
                    {artistSlug ? (
                      <Link
                        href={`/artist?slug=${encodeURIComponent(artistSlug)}`}
                        className="mono mt-1 block text-xs text-[var(--muted)] underline-offset-2 hover:underline"
                      >
                        {song.artist}
                      </Link>
                    ) : (
                      <p className="mono mt-1 text-xs text-[var(--muted)]">{song.artist}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Link href={`/song?id=${song.id}`} className="btn btn-secondary btn-mono">
                        View Lyrics
                      </Link>
                      {artistSlug ? (
                        <Link
                          href={`/artist?slug=${encodeURIComponent(artistSlug)}`}
                          className="btn btn-secondary btn-mono"
                        >
                          Artist Page
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
