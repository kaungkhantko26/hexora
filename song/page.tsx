"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getSupabaseBrowserClient, type Lyric } from "@/lib/supabase";
import UserNav from "@/components/user-nav";

function getYoutubeEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();

    if (host.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (!host.includes("youtube.com")) return null;

    if (url.pathname.startsWith("/embed/")) {
      const id = url.pathname.split("/")[2];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    const v = url.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "shorts" && parts[1]) {
      return `https://www.youtube.com/embed/${parts[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}

function SongDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [song, setSong] = useState<Lyric | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const youtubeEmbedUrl = getYoutubeEmbedUrl(song?.youtube_url);

  useEffect(() => {
    if (!id) {
      setError("Missing song id.");
      setIsLoading(false);
      return;
    }
    const idValue = id;

    async function loadSong() {
      setIsLoading(true);
      setError("");
      try {
        const lyricId = Number(idValue);
        if (!Number.isFinite(lyricId)) throw new Error("Invalid song id.");

        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("lyrics")
          .select("id, title, artist, artist_id, youtube_url, spotify_url, lyrics, created_at")
          .eq("id", lyricId)
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (!data) throw new Error("Song not found.");
        setSong(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load song.");
      } finally {
        setIsLoading(false);
      }
    }

    loadSong();
  }, [id]);

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 md:px-8">
        <UserNav />
        <section className="card rounded-3xl p-6">
          <Link
            href="/song-names"
            className="mono rounded-lg border border-[#d7c9b2] bg-[#fffcf6] px-3 py-2 text-xs uppercase tracking-widest text-[#5a503f] transition hover:bg-[#f4ecdf]"
          >
            Back to song names
          </Link>

          {isLoading ? (
            <p className="mt-4 text-sm text-[#6b604e]">Loading song...</p>
          ) : error ? (
            <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>
          ) : song ? (
            <>
              <h1 className="mt-4 text-3xl font-semibold leading-tight">{song.title}</h1>
              <p className="mono mt-1 text-xs text-[#726758]">{song.artist}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {song.youtube_url ? (
                  <a
                    href={song.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono rounded-md border border-[#d7c9b2] bg-white px-3 py-2 text-[10px] uppercase tracking-widest text-[#5f5444]"
                  >
                    Listen on YouTube
                  </a>
                ) : null}
                {song.spotify_url ? (
                  <a
                    href={song.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono rounded-md border border-[#d7c9b2] bg-white px-3 py-2 text-[10px] uppercase tracking-widest text-[#5f5444]"
                  >
                    Listen on Spotify
                  </a>
                ) : null}
              </div>
              {youtubeEmbedUrl ? (
                <div className="mt-4 max-w-md overflow-hidden rounded-2xl border border-[#e1d4c0] bg-white">
                  <iframe
                    src={youtubeEmbedUrl}
                    title="YouTube player"
                    className="h-[190px] w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              ) : null}
              <p className="mt-4 whitespace-pre-wrap text-sm text-[#332d24]">{song.lyrics}</p>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default function SongDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="grain min-h-screen">
          <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 md:px-8">
            <UserNav />
            <section className="card rounded-3xl p-6">
              <p className="text-sm text-[#6b604e]">Loading song...</p>
            </section>
          </div>
        </main>
      }
    >
      <SongDetailContent />
    </Suspense>
  );
}
