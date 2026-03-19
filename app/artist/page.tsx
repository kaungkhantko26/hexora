"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { formatAppError, getSupabaseBrowserClient, type ArtistProfile, type Lyric } from "@/lib/supabase";
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
        setError(formatAppError(e, "Failed to load artist songs."));
      } finally {
        setIsLoading(false);
      }
    }

    loadArtistAndSongs();
  }, [slug]);

  return (
    <main className="grain">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
        <UserNav />
        <section className="card rounded-3xl p-6 md:p-8">
          <Link href="/artist-profiles" className="btn btn-secondary btn-mono">
            Back to Artist Profiles
          </Link>

          {isLoading ? (
            <p className="body-copy mt-5">Loading artist songs...</p>
          ) : error ? (
            <p className="status-box status-error mt-5">{error}</p>
          ) : (
            <>
              <header className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="eyebrow">Artist Page</p>
                  <h1 className="display-title mt-2">{artistProfile?.name}</h1>
                  <p className="body-copy mt-2">{artistProfile?.genre || "No genre yet."}</p>
                  {artistProfile?.bio ? <p className="body-copy mt-2 max-w-3xl">{artistProfile.bio}</p> : null}
                </div>
                <div className="ui-chip">{songs.length} songs</div>
              </header>

              <h2 className="mt-8 text-xl font-semibold">Song List</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {songs.length === 0 ? (
                  <p className="body-copy md:col-span-2">No songs found for this artist.</p>
                ) : (
                  songs.map((song) => (
                    <article key={song.id} className="card rounded-2xl p-4">
                      <Link href={`/song?id=${song.id}`} className="text-lg font-semibold underline-offset-2 hover:underline">
                        {song.title}
                      </Link>
                      <p className="mono mt-1 text-xs text-[var(--muted)]">{song.artist}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {song.youtube_url ? (
                          <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-mono">
                            YouTube
                          </a>
                        ) : null}
                        {song.spotify_url ? (
                          <a href={song.spotify_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-mono">
                            Spotify
                          </a>
                        ) : null}
                        <Link href={`/song?id=${song.id}`} className="btn btn-secondary btn-mono">
                          Lyrics
                        </Link>
                      </div>
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
        <main className="grain">
          <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
            <UserNav />
            <section className="card rounded-3xl p-6">
              <p className="body-copy">Loading artist songs...</p>
            </section>
          </div>
        </main>
      }
    >
      <ArtistSongsContent />
    </Suspense>
  );
}
