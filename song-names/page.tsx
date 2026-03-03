"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient, type ArtistProfile, type Lyric } from "@/lib/supabase";
import UserNav from "@/components/user-nav";

export default function SongNamesPage() {
  const [songNames, setSongNames] = useState<Array<{ id: number; title: string; artist: string }>>(
    []
  );
  const [songQuery, setSongQuery] = useState("");
  const [artistSlugByName, setArtistSlugByName] = useState<Record<string, string>>({});
  const [isSongListLoading, setIsSongListLoading] = useState(true);
  const [songListError, setSongListError] = useState("");
  const normalizedQuery = songQuery.trim().toLowerCase();
  const filteredSongNames = songNames.filter((song) => {
    if (!normalizedQuery) return true;
    return (
      song.title.toLowerCase().includes(normalizedQuery) ||
      song.artist.toLowerCase().includes(normalizedQuery)
    );
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
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 md:px-8">
        <UserNav />
        <section className="card rounded-3xl p-6">
          <h1 className="text-3xl font-semibold leading-tight">Song Names</h1>
          <p className="mt-2 text-sm text-[#4e4537]">All song names currently in the lyrics library.</p>
          <input
            value={songQuery}
            onChange={(e) => setSongQuery(e.target.value)}
            className="mt-4 w-full rounded-xl border border-[#d7c9b2] bg-white px-3 py-2 text-sm outline-none ring-[#0f8a6f]/35 focus:ring-4"
            placeholder="Search by song title or artist..."
          />

          {songListError ? <p className="mt-3 text-sm text-[var(--danger)]">{songListError}</p> : null}

          <div className="mt-4 space-y-3">
            {isSongListLoading ? (
              <p className="text-sm text-[#6b604e]">Loading song names...</p>
            ) : filteredSongNames.length === 0 ? (
              <p className="text-sm text-[#6b604e]">
                {songNames.length === 0 ? "No song names yet." : "No songs match your search."}
              </p>
            ) : (
              filteredSongNames.map((song, index) => (
                <article
                  key={`${song.id}-${index}`}
                  className="rounded-2xl border border-[#e1d4c0] bg-[#fffcf6] p-4"
                >
                  <Link
                    href={`/song?id=${song.id}`}
                    className="text-lg font-semibold underline-offset-2 hover:underline"
                  >
                    {song.title}
                  </Link>
                  {artistSlugByName[song.artist.toLowerCase()] ? (
                    <Link
                      href={`/artist?slug=${encodeURIComponent(artistSlugByName[song.artist.toLowerCase()])}`}
                      className="mono text-xs text-[#726758] underline-offset-2 hover:underline"
                    >
                      {song.artist}
                    </Link>
                  ) : (
                    <p className="mono text-xs text-[#726758]">{song.artist}</p>
                  )}
                  <p className="mono mt-2 text-xs uppercase tracking-widest text-[#6f6454]">
                    View lyrics
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
