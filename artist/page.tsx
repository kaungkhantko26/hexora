"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getSupabaseBrowserClient, type ArtistProfile, type Lyric } from "@/lib/supabase";
import UserNav from "@/components/user-nav";

function ArtistSongsContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");

  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [songs, setSongs] = useState<Lyric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) {
      setError("Missing artist slug.");
      setIsLoading(false);
      return;
    }
    const slugValue = slug;

    async function loadArtistAndSongs() {
      setIsLoading(true);
      setError("");
      try {
        const supabase = getSupabaseBrowserClient();
        const db = supabase as unknown as {
          from: (table: string) => {
            select: (columns: string) => {
              eq: (column: string, value: string) => {
                maybeSingle: () => Promise<{ data: ArtistProfile | null; error: { message: string } | null }>;
                order: (column: string, opts: { ascending: boolean }) => Promise<{
                  data: Lyric[] | null;
                  error: { message: string } | null;
                }>;
              };
              ilike: (column: string, value: string) => {
                order: (column: string, opts: { ascending: boolean }) => Promise<{
                  data: Lyric[] | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
        const { data: artistData, error: artistError } = await db
          .from("artists")
          .select("id, name, slug, bio, genre, created_at")
          .eq("slug", slugValue)
          .maybeSingle();

        if (artistError) throw new Error(artistError.message);
        if (!artistData) throw new Error("Artist profile not found.");

        setArtistProfile(artistData);

        const { data: linkedSongs, error: linkedError } = await db
          .from("lyrics")
          .select("id, title, artist, artist_id, youtube_url, spotify_url, lyrics, created_at")
          .eq("artist_id", String(artistData.id))
          .order("created_at", { ascending: false });

        if (linkedError) throw new Error(linkedError.message);

        if ((linkedSongs ?? []).length > 0) {
          setSongs(linkedSongs ?? []);
          return;
        }

        const { data: legacySongs, error: legacyError } = await db
          .from("lyrics")
          .select("id, title, artist, artist_id, youtube_url, spotify_url, lyrics, created_at")
          .ilike("artist", `%${artistData.name}%`)
          .order("created_at", { ascending: false });

        if (legacyError) throw new Error(legacyError.message);
        setSongs(legacySongs ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load artist songs.");
      } finally {
        setIsLoading(false);
      }
    }

    loadArtistAndSongs();
  }, [slug]);

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 md:px-8">
        <UserNav />
        <section className="card rounded-3xl p-6">
          <Link
            href="/artist-profiles"
            className="mono rounded-lg border border-[#d7c9b2] bg-[#fffcf6] px-3 py-2 text-xs uppercase tracking-widest text-[#5a503f] transition hover:bg-[#f4ecdf]"
          >
            Back to artist profiles
          </Link>

          {isLoading ? (
            <p className="mt-4 text-sm text-[#6b604e]">Loading artist songs...</p>
          ) : error ? (
            <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>
          ) : (
            <>
              <h1 className="mt-4 text-3xl font-semibold leading-tight">{artistProfile?.name}</h1>
              <p className="mt-2 text-sm text-[#4e4537]">{artistProfile?.genre || "No genre yet."}</p>

              <h2 className="mt-6 text-2xl font-semibold">Song List</h2>
              <div className="mt-3 space-y-3">
                {songs.length === 0 ? (
                  <p className="text-sm text-[#6b604e]">No songs found for this artist.</p>
                ) : (
                  songs.map((song) => (
                    <article
                      key={song.id}
                      className="rounded-2xl border border-[#e1d4c0] bg-[#fffcf6] p-4"
                    >
                      <Link
                        href={`/song?id=${song.id}`}
                        className="text-lg font-semibold underline-offset-2 hover:underline"
                      >
                        {song.title}
                      </Link>
                      <p className="mono text-xs text-[#726758]">{song.artist}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {song.youtube_url ? (
                          <a
                            href={song.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mono rounded-md border border-[#d7c9b2] bg-white px-2 py-1 text-[10px] uppercase tracking-widest text-[#5f5444]"
                          >
                            YouTube
                          </a>
                        ) : null}
                        {song.spotify_url ? (
                          <a
                            href={song.spotify_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mono rounded-md border border-[#d7c9b2] bg-white px-2 py-1 text-[10px] uppercase tracking-widest text-[#5f5444]"
                          >
                            Spotify
                          </a>
                        ) : null}
                      </div>
                      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-[#332d24]">
                        {song.lyrics}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ArtistSongsPage() {
  return (
    <Suspense
      fallback={
        <main className="grain min-h-screen">
          <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 md:px-8">
            <UserNav />
            <section className="card rounded-3xl p-6">
              <p className="text-sm text-[#6b604e]">Loading artist songs...</p>
            </section>
          </div>
        </main>
      }
    >
      <ArtistSongsContent />
    </Suspense>
  );
}
