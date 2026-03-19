"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { formatAppError, getSupabaseBrowserClient, type Lyric } from "@/lib/supabase";
import UserNav from "@/components/user-nav";

type YouTubePlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
};

type YouTubeApi = {
  Player: new (
    target: string | HTMLElement,
    options: {
      host?: string;
      videoId?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
      };
    }
  ) => YouTubePlayer;
  PlayerState: {
    PLAYING: number;
  };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type LineCue = {
  start: number;
  end: number;
};

const YOUTUBE_PLAYER_ID = "hexora-youtube-player";
let youtubeApiReadyPromise: Promise<void> | null = null;

function ensureYoutubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiReadyPromise) return youtubeApiReadyPromise;

  youtubeApiReadyPromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      youtubeApiReadyPromise = null;
      reject(new Error("YouTube player could not load."));
    }, 10000);

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      window.clearTimeout(timeout);
      resolve();
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    const onScriptError = () => {
      window.clearTimeout(timeout);
      youtubeApiReadyPromise = null;
      reject(new Error("YouTube player could not load."));
    };

    if (existingScript) {
      existingScript.addEventListener("error", onScriptError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.addEventListener("error", onScriptError, { once: true });
    document.head.appendChild(script);
  });

  return youtubeApiReadyPromise;
}

function getYoutubeVideoId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();

    if (host.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }

    if (!host.includes("youtube.com") && !host.includes("youtube-nocookie.com")) return null;

    if (url.pathname.startsWith("/embed/")) {
      const id = url.pathname.split("/")[2];
      return id || null;
    }

    const v = url.searchParams.get("v");
    if (v) return v;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "shorts" && parts[1]) {
      return parts[1];
    }
  } catch {
    return null;
  }
  return null;
}

function buildEstimatedLineCues(lines: string[], durationSeconds: number): LineCue[] {
  if (lines.length === 0 || durationSeconds <= 0) return [];

  const weights = lines.map((line) => {
    const compactLength = line.replace(/\s+/g, "").length;
    return Math.max(1, Math.min(36, compactLength));
  });
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);

  let cursor = 0;
  return weights.map((weight, index) => {
    const start = cursor;
    const slice = (weight / totalWeight) * durationSeconds;
    cursor += slice;
    const end = index === weights.length - 1 ? durationSeconds : cursor;
    return { start, end };
  });
}

function formatSeconds(rawSeconds: number): string {
  const safe = Math.max(0, Math.floor(rawSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function SongDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [song, setSong] = useState<Lyric | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [youtubeLoadError, setYoutubeLoadError] = useState("");
  const [useNoCookiePlayer, setUseNoCookiePlayer] = useState(false);

  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isLivePlaying, setIsLivePlaying] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [liveSpeed, setLiveSpeed] = useState<"0.75" | "1" | "1.25" | "1.5">("1");
  const [syncPace, setSyncPace] = useState<"0.75" | "0.9" | "1" | "1.1">("0.9");
  const [syncDelaySeconds, setSyncDelaySeconds] = useState(2);

  const [youtubePlayerReady, setYoutubePlayerReady] = useState(false);
  const [youtubePlaybackTime, setYoutubePlaybackTime] = useState(0);
  const [youtubeDuration, setYoutubeDuration] = useState(0);

  const lineRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);

  const youtubeVideoId = getYoutubeVideoId(song?.youtube_url);

  const lyricsLines = useMemo(() => {
    if (!song?.lyrics) return [];
    return song.lyrics
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [song?.lyrics]);

  const lyricCues = useMemo(
    () => buildEstimatedLineCues(lyricsLines, youtubeDuration),
    [lyricsLines, youtubeDuration]
  );

  const hasYouTubeSync = Boolean(youtubeVideoId && youtubePlayerReady && youtubeDuration > 0 && lyricCues.length > 0);

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
        setError(formatAppError(e, "Failed to load song."));
      } finally {
        setIsLoading(false);
      }
    }

    loadSong();
  }, [id]);

  useEffect(() => {
    setIsLiveMode(false);
    setIsLivePlaying(false);
    setActiveLineIndex(0);
    setLiveSpeed("1");
    setSyncPace("0.9");
    setSyncDelaySeconds(2);
    setYoutubeLoadError("");
    setYoutubePlayerReady(false);
    setYoutubePlaybackTime(0);
    setYoutubeDuration(0);
    lineRefs.current = [];
  }, [song?.id]);

  useEffect(() => {
    if (!youtubeVideoId) {
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = null;
      setYoutubePlayerReady(false);
      setYoutubePlaybackTime(0);
      setYoutubeDuration(0);
      return;
    }

    let isCancelled = false;
    const videoId = youtubeVideoId;

    async function setupPlayer() {
      try {
        setYoutubeLoadError("");
        await ensureYoutubeIframeApi();
        if (isCancelled || !window.YT?.Player) return;

        youtubePlayerRef.current?.destroy();
        youtubePlayerRef.current = new window.YT.Player(YOUTUBE_PLAYER_ID, {
          host: useNoCookiePlayer ? "https://www.youtube-nocookie.com" : "https://www.youtube.com",
          videoId,
          playerVars: {
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
          },
          events: {
            onReady: () => {
              if (!youtubePlayerRef.current) return;
              setYoutubePlayerReady(true);
              setYoutubeLoadError("");
              const duration = youtubePlayerRef.current.getDuration();
              if (Number.isFinite(duration) && duration > 0) {
                setYoutubeDuration(duration);
              }
            },
            onStateChange: ({ data }) => {
              const playingState = window.YT?.PlayerState.PLAYING ?? 1;
              setIsLivePlaying(data === playingState);
            },
          },
        });
      } catch (e) {
        if (isCancelled) return;
        setYoutubeLoadError(formatAppError(e, "Unable to load the YouTube player."));
      }
    }

    setupPlayer();

    return () => {
      isCancelled = true;
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = null;
      setYoutubePlayerReady(false);
    };
  }, [youtubeVideoId, useNoCookiePlayer]);

  useEffect(() => {
    if (!youtubePlayerReady || !youtubeVideoId) return;

    const timer = window.setInterval(() => {
      const player = youtubePlayerRef.current;
      if (!player) return;

      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      const playingState = window.YT?.PlayerState.PLAYING ?? 1;
      const state = player.getPlayerState();

      if (Number.isFinite(currentTime)) {
        setYoutubePlaybackTime(currentTime);
      }

      if (Number.isFinite(duration) && duration > 0) {
        setYoutubeDuration(duration);
      }

      setIsLivePlaying(state === playingState);
    }, 220);

    return () => window.clearInterval(timer);
  }, [youtubePlayerReady, youtubeVideoId]);

  useEffect(() => {
    if (!isLiveMode || !hasYouTubeSync || lyricCues.length === 0) return;

    const pace = Number(syncPace);
    const effectiveTime = Math.max(0, (youtubePlaybackTime - syncDelaySeconds) * pace);
    const index = lyricCues.findIndex(
      (cue) => effectiveTime >= cue.start && effectiveTime < cue.end
    );

    if (index >= 0) {
      setActiveLineIndex((prev) => (prev === index ? prev : index));
      return;
    }

    if (effectiveTime >= youtubeDuration && lyricCues.length > 0) {
      setActiveLineIndex(lyricCues.length - 1);
    }
  }, [isLiveMode, hasYouTubeSync, lyricCues, youtubePlaybackTime, youtubeDuration, syncPace, syncDelaySeconds]);

  useEffect(() => {
    if (!isLiveMode || hasYouTubeSync || !isLivePlaying || lyricsLines.length === 0) return;

    const speed = Number(liveSpeed);
    const stepMs = Math.max(500, Math.floor(2200 / speed));

    const timer = window.setInterval(() => {
      setActiveLineIndex((prev) => {
        if (prev >= lyricsLines.length - 1) {
          setIsLivePlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [isLiveMode, hasYouTubeSync, isLivePlaying, lyricsLines.length, liveSpeed]);

  useEffect(() => {
    if (!isLiveMode) return;
    lineRefs.current[activeLineIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeLineIndex, isLiveMode]);

  function onToggleLiveLyrics() {
    setIsLiveMode((prev) => {
      if (prev) setIsLivePlaying(false);
      return !prev;
    });
  }

  function onToggleLivePlayback() {
    if (lyricsLines.length === 0) return;

    if (hasYouTubeSync && youtubePlayerRef.current) {
      if (!isLiveMode) setIsLiveMode(true);
      if (isLivePlaying) {
        youtubePlayerRef.current.pauseVideo();
      } else {
        youtubePlayerRef.current.playVideo();
      }
      return;
    }

    if (!isLiveMode) setIsLiveMode(true);

    if (!isLivePlaying && activeLineIndex >= lyricsLines.length - 1) {
      setActiveLineIndex(0);
    }

    setIsLivePlaying((prev) => !prev);
  }

  function onRestartLiveLyrics() {
    if (hasYouTubeSync && youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(0, true);
      youtubePlayerRef.current.playVideo();
      setActiveLineIndex(0);
      if (!isLiveMode) setIsLiveMode(true);
      return;
    }

    setActiveLineIndex(0);
    if (!isLiveMode) setIsLiveMode(true);
    setIsLivePlaying(true);
  }

  function onJumpToLine(index: number) {
    setActiveLineIndex(index);

    if (hasYouTubeSync && youtubePlayerRef.current && lyricCues[index]) {
      const pace = Number(syncPace);
      const seekSeconds = pace > 0 ? lyricCues[index].start / pace + syncDelaySeconds : lyricCues[index].start;
      youtubePlayerRef.current.seekTo(Math.max(0, seekSeconds), true);
    }
  }

  return (
    <main className="grain">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
        <UserNav />
        <section className="card rounded-3xl p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/song-names" className="btn btn-secondary btn-mono">
              Back to Song List
            </Link>
            <Link href="/" className="btn btn-secondary btn-mono">
              Search Page
            </Link>
          </div>

          {isLoading ? (
            <p className="body-copy mt-6">Loading song...</p>
          ) : error ? (
            <p className="status-box status-error mt-6">{error}</p>
          ) : song ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
              <article className="card rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">Lyrics</p>
                    <h1 className="display-title mt-2">{song.title}</h1>
                    <p className="mono mt-2 text-xs text-[var(--muted)]">{song.artist}</p>
                  </div>
                  <button type="button" onClick={onToggleLiveLyrics} className="btn btn-secondary btn-mono">
                    {isLiveMode ? "Exit Live Lyrics" : "Live Lyrics"}
                  </button>
                </div>

                {!isLiveMode ? (
                  <p className="mt-5 whitespace-pre-wrap leading-7 text-[var(--foreground)]">{song.lyrics}</p>
                ) : (
                  <>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={onToggleLivePlayback} className="btn btn-primary btn-mono">
                        {isLivePlaying ? "Pause" : "Play"}
                      </button>
                      <button type="button" onClick={onRestartLiveLyrics} className="btn btn-secondary btn-mono">
                        Restart
                      </button>
                      {!hasYouTubeSync ? (
                        <>
                          <label htmlFor="live-speed" className="mono ml-1 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                            Speed
                          </label>
                          <select
                            id="live-speed"
                            value={liveSpeed}
                            onChange={(e) => setLiveSpeed(e.target.value as "0.75" | "1" | "1.25" | "1.5")}
                            className="ui-select w-28 !py-2 !text-xs"
                          >
                            <option value="0.75">0.75x</option>
                            <option value="1">1x</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                          </select>
                        </>
                      ) : null}
                      {hasYouTubeSync ? (
                        <>
                          <label htmlFor="sync-pace" className="mono ml-1 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                            Pace
                          </label>
                          <select
                            id="sync-pace"
                            value={syncPace}
                            onChange={(e) => setSyncPace(e.target.value as "0.75" | "0.9" | "1" | "1.1")}
                            className="ui-select w-24 !py-2 !text-xs"
                          >
                            <option value="0.75">Slow</option>
                            <option value="0.9">Soft</option>
                            <option value="1">Normal</option>
                            <option value="1.1">Fast</option>
                          </select>
                          <label htmlFor="sync-delay" className="mono ml-1 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                            Delay
                          </label>
                          <input
                            id="sync-delay"
                            type="range"
                            min={0}
                            max={6}
                            step={0.5}
                            value={syncDelaySeconds}
                            onChange={(e) => setSyncDelaySeconds(Number(e.target.value))}
                            className="w-28 accent-[var(--accent)]"
                          />
                          <span className="ui-chip">{syncDelaySeconds.toFixed(1)}s</span>
                          <span className="ui-chip">
                            Synced {formatSeconds(youtubePlaybackTime)} / {formatSeconds(youtubeDuration)}
                          </span>
                        </>
                      ) : null}
                    </div>
                    <p className="mono mt-2 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                      {hasYouTubeSync
                        ? "Live lyrics follow YouTube playback. Tap any line to seek the video."
                        : "Live lyrics auto-scroll mode. Tap any line to jump."}
                    </p>

                    <div className="card mt-4 h-[54vh] overflow-y-auto rounded-2xl p-4 md:h-[60vh]">
                      {lyricsLines.length === 0 ? (
                        <p className="body-copy">No lyrics lines available.</p>
                      ) : (
                        lyricsLines.map((line, index) => (
                          <p
                            key={`${song.id}-${index}`}
                            ref={(element) => {
                              lineRefs.current[index] = element;
                            }}
                            onClick={() => onJumpToLine(index)}
                            className={`cursor-pointer whitespace-pre-wrap rounded-md px-2 py-1.5 text-lg leading-8 transition-all duration-300 ${
                              index === activeLineIndex
                                ? "bg-[color:color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--foreground)]"
                                : "text-[var(--muted)] opacity-55 hover:opacity-80"
                            }`}
                          >
                            {line}
                          </p>
                        ))
                      )}
                    </div>
                  </>
                )}
              </article>

              <aside className="space-y-4">
                <div className="card rounded-2xl p-4">
                  <p className="eyebrow">Media</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {song.youtube_url ? (
                      <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-mono">
                        Open YouTube
                      </a>
                    ) : null}
                    {song.spotify_url ? (
                      <a href={song.spotify_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-mono">
                        Open Spotify
                      </a>
                    ) : null}
                  </div>
                </div>

                {youtubeVideoId ? (
                  <div className="card overflow-hidden rounded-2xl">
                    <div id={YOUTUBE_PLAYER_ID} className="h-[210px] w-full" />
                  </div>
                ) : null}

                {youtubeLoadError ? <p className="status-box status-error">{youtubeLoadError}</p> : null}

                {youtubeVideoId ? (
                  <button
                    type="button"
                    onClick={() => setUseNoCookiePlayer((prev) => !prev)}
                    className="btn btn-secondary btn-mono w-full"
                  >
                    {useNoCookiePlayer ? "Use Standard Player" : "Use Alternate Player"}
                  </button>
                ) : null}
              </aside>
            </div>
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
        <main className="grain">
          <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
            <UserNav />
            <section className="card rounded-3xl p-6">
              <p className="body-copy">Loading song...</p>
            </section>
          </div>
        </main>
      }
    >
      <SongDetailContent />
    </Suspense>
  );
}
