"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient, type ArtistProfile, type Lyric } from "@/lib/supabase";

function sanitizeMusicUrl(value: string, provider: "youtube" | "spotify"): string | null {
  const input = value.trim();
  if (!input) return null;

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error(`${provider} URL is invalid.`);
  }

  const host = parsed.hostname.toLowerCase();
  if (provider === "youtube" && !host.includes("youtube.com") && !host.includes("youtu.be")) {
    throw new Error("YouTube URL must be youtube.com or youtu.be.");
  }

  if (provider === "spotify" && !host.includes("spotify.com")) {
    throw new Error("Spotify URL must be spotify.com.");
  }

  return parsed.toString();
}

function makeSlug(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (!base) return `artist-${Date.now().toString(36)}`;
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AdminPage() {
  const [lyrics, setLyrics] = useState<Lyric[]>([]);
  const [editingLyricId, setEditingLyricId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [lyricsArtistSearch, setLyricsArtistSearch] = useState("");
  const [activeLyricsArtistId, setActiveLyricsArtistId] = useState<string | null>(null);

  const [artistProfiles, setArtistProfiles] = useState<ArtistProfile[]>([]);
  const [editingArtistId, setEditingArtistId] = useState<string | null>(null);
  const [artistName, setArtistName] = useState("");
  const [artistGenre, setArtistGenre] = useState("");
  const [isArtistLoading, setIsArtistLoading] = useState(true);
  const [isArtistSaving, setIsArtistSaving] = useState(false);
  const [artistError, setArtistError] = useState("");
  const artistFormRef = useRef<HTMLDivElement | null>(null);
  const lyricsFormRef = useRef<HTMLDivElement | null>(null);

  const activeLyricsArtist = activeLyricsArtistId
    ? artistProfiles.find((profile) => String(profile.id) === activeLyricsArtistId) ?? null
    : null;
  const searchQuery = lyricsArtistSearch.trim().toLowerCase();
  const filteredLyrics = lyrics.filter((item) => {
    const artistTokens = item.artist
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);
    const itemArtistId = item.artist_id !== null && item.artist_id !== undefined ? String(item.artist_id) : null;

    const matchesArtistFilter =
      !activeLyricsArtist ||
      itemArtistId === String(activeLyricsArtist.id) ||
      artistTokens.includes(activeLyricsArtist.name.toLowerCase());

    const matchesArtistSearch = !searchQuery || artistTokens.some((name) => name.includes(searchQuery));
    return matchesArtistFilter && matchesArtistSearch;
  });

  async function loadLyrics() {
    setIsLoading(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("lyrics")
        .select("id, title, artist, artist_id, youtube_url, spotify_url, lyrics, created_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      setLyrics(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load lyrics.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadArtistProfiles() {
    setIsArtistLoading(true);
    setArtistError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("artists")
        .select("id, name, slug, bio, genre, created_at")
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      const sorted = [...((data ?? []) as ArtistProfile[])].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
      setArtistProfiles(sorted);
      if (sorted.length > 0) {
        setSelectedArtistIds((prev) => (prev.length > 0 ? prev : [String(sorted[0].id)]));
      }
    } catch (e) {
      setArtistError(e instanceof Error ? e.message : "Failed to load artist profiles.");
    } finally {
      setIsArtistLoading(false);
    }
  }

  useEffect(() => {
    loadLyrics();
    loadArtistProfiles();
  }, []);

  async function onSubmitArtist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isArtistSaving) return;

    setIsArtistSaving(true);
    setArtistError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const db = supabase as unknown as {
        from: (table: string) => {
          insert: (values: unknown[]) => {
            select: (columns: string) => {
              single: () => Promise<{ data: ArtistProfile; error: { message: string } | null }>;
            };
          };
          update: (values: Record<string, unknown>) => {
            eq: (column: string, value: string) => {
              select: (columns: string) => {
                maybeSingle: () => Promise<{ data: ArtistProfile | null; error: { message: string } | null }>;
              };
            };
          };
        };
      };
      const name = artistName.trim();
      const genre = artistGenre.trim();
      if (!name || !genre) throw new Error("Artist name and genre are required.");

      if (editingArtistId) {
        const { data, error } = await db
          .from("artists")
          .update({ name, genre })
          .eq("id", editingArtistId)
          .select("id, name, slug, bio, genre, created_at")
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (!data) throw new Error("Artist profile not found.");

        setArtistProfiles((prev) => {
          const next = prev.map((item) => (String(item.id) === String(data.id) ? data : item));
          next.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
          return next;
        });
        setLyrics((prev) =>
          prev.map((item) => {
            if (item.artist_id !== null && item.artist_id !== undefined && String(item.artist_id) === String(data.id)) {
              return { ...item, artist: data.name };
            }
            return item;
          })
        );
      } else {
        const { data, error } = await db
          .from("artists")
          .insert([{ name, genre, slug: makeSlug(name) }])
          .select("id, name, slug, bio, genre, created_at")
          .single();

        if (error) throw new Error(error.message);

        setArtistProfiles((prev) => {
          const next = [data, ...prev];
          next.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
          return next;
        });
        setSelectedArtistIds([String(data.id)]);
      }

      setEditingArtistId(null);
      setArtistName("");
      setArtistGenre("");
    } catch (e) {
      setArtistError(e instanceof Error ? e.message : "Failed to save artist profile.");
    } finally {
      setIsArtistSaving(false);
    }
  }

  async function onSubmitLyrics(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const db = supabase as unknown as {
        from: (table: string) => {
          select: (columns: string) => {
            eq: (column: string, value: string) => {
              maybeSingle: () => Promise<{
                data: { id: string | number; name: string } | null;
                error: { message: string } | null;
              }>;
            };
          };
          update: (values: Record<string, unknown>) => {
            eq: (column: string, value: number) => {
              select: (columns: string) => {
                maybeSingle: () => Promise<{ data: Lyric | null; error: { message: string } | null }>;
              };
            };
          };
          insert: (values: unknown[]) => {
            select: (columns: string) => {
              single: () => Promise<{ data: Lyric; error: { message: string } | null }>;
            };
          };
        };
      };
      const titleValue = title.trim();
      const lyricsValue = content.trim();
      const artistIds = selectedArtistIds.map((id) => id.trim()).filter(Boolean);

      if (!titleValue || !lyricsValue || artistIds.length === 0) {
        throw new Error("title, artist and lyrics are required.");
      }

      const youtubeValue = sanitizeMusicUrl(youtubeUrl, "youtube");
      const spotifyValue = sanitizeMusicUrl(spotifyUrl, "spotify");

      const { data: artistData, error: artistFetchError } = await (
        db.from("artists").select("id, name") as unknown as {
          in: (column: string, values: string[]) => Promise<{
            data: Array<{ id: string | number; name: string }> | null;
            error: { message: string } | null;
          }>;
        }
      )
        .in("id", artistIds);

      if (artistFetchError) throw new Error(artistFetchError.message);
      if (!artistData || artistData.length === 0) {
        throw new Error("Selected artist profile does not exist.");
      }

      const artistById = new Map(artistData.map((artist) => [String(artist.id), artist]));
      const orderedArtists = artistIds
        .map((id) => artistById.get(id))
        .filter((artist): artist is { id: string | number; name: string } => Boolean(artist));

      if (orderedArtists.length === 0) {
        throw new Error("Selected artist profile does not exist.");
      }

      const artistNames = orderedArtists.map((artist) => artist.name).join(", ");
      const artistIdValue = orderedArtists.length === 1 ? orderedArtists[0].id : null;

      if (editingLyricId) {
        const { data, error } = await db
          .from("lyrics")
          .update({
            title: titleValue,
            artist: artistNames,
            artist_id: artistIdValue,
            youtube_url: youtubeValue,
            spotify_url: spotifyValue,
            lyrics: lyricsValue,
          })
          .eq("id", editingLyricId)
          .select("id, title, artist, artist_id, youtube_url, spotify_url, lyrics, created_at")
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (!data) throw new Error("Song not found.");
        setLyrics((prev) => prev.map((item) => (item.id === data.id ? data : item)));
      } else {
        const { data, error } = await db
          .from("lyrics")
          .insert([
            {
              title: titleValue,
              artist: artistNames,
              artist_id: artistIdValue,
              youtube_url: youtubeValue,
              spotify_url: spotifyValue,
              lyrics: lyricsValue,
            },
          ])
          .select("id, title, artist, artist_id, youtube_url, spotify_url, lyrics, created_at")
          .single();

        if (error) throw new Error(error.message);
        setLyrics((prev) => [data, ...prev]);
      }

      setEditingLyricId(null);
      setTitle("");
      setYoutubeUrl("");
      setSpotifyUrl("");
      setContent("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save lyric.");
    } finally {
      setIsSaving(false);
    }
  }

  function onEditLyric(item: Lyric) {
    const matchedArtist = artistProfiles.find((profile) => {
      if (item.artist_id !== null && item.artist_id !== undefined) {
        return String(profile.id) === String(item.artist_id);
      }
      return profile.name.toLowerCase() === item.artist.toLowerCase();
    });

    setEditingLyricId(item.id);
    setTitle(item.title);
    if (matchedArtist) {
      setSelectedArtistIds([String(matchedArtist.id)]);
    } else {
      const selectedByName = item.artist
        .split(",")
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean)
        .map((name) => artistProfiles.find((profile) => profile.name.toLowerCase() === name))
        .filter((profile): profile is ArtistProfile => Boolean(profile))
        .map((profile) => String(profile.id));

      setSelectedArtistIds(selectedByName);
    }
    setYoutubeUrl(item.youtube_url ?? "");
    setSpotifyUrl(item.spotify_url ?? "");
    setContent(item.lyrics);
    lyricsFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onCancelEdit() {
    setEditingLyricId(null);
    setTitle("");
    setYoutubeUrl("");
    setSpotifyUrl("");
    setContent("");
    if (artistProfiles.length > 0) {
      setSelectedArtistIds([String(artistProfiles[0].id)]);
    }
  }

  function onToggleArtistSelection(artistId: string) {
    setSelectedArtistIds((prev) => {
      if (prev.includes(artistId)) {
        return prev.filter((id) => id !== artistId);
      }
      return [...prev, artistId];
    });
  }

  function onEditArtist(profile: ArtistProfile) {
    setEditingArtistId(String(profile.id));
    setArtistName(profile.name);
    setArtistGenre(profile.genre ?? "");
    artistFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onCancelArtistEdit() {
    setEditingArtistId(null);
    setArtistName("");
    setArtistGenre("");
  }

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-8 md:px-8 lg:grid-cols-[380px_1fr]">
        <section className="space-y-6">
          <div ref={artistFormRef} className="card rounded-3xl p-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="mono text-xs uppercase tracking-[0.18em] text-[#6b604e]">Admin Side</p>
              <Link
                href="/"
                className="mono rounded-xl border border-[#d7c9b2] bg-[#fffcf6] px-3 py-2 text-xs uppercase tracking-widest text-[#5a503f] transition hover:bg-[#f4ecdf]"
              >
                User page
              </Link>
            </div>
            <h1 className="text-3xl font-semibold leading-tight">Artist Profile List</h1>
            <p className="mt-2 text-sm text-[#4e4537]">
              {editingArtistId ? "Update artist profile details." : "Add artist profiles for users to browse."}
            </p>

            <form onSubmit={onSubmitArtist} className="mt-4 space-y-3">
              <label className="block">
                <span className="mono text-xs uppercase tracking-widest text-[#685d4d]">
                  Artist Name
                </span>
                <input
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-[#d7c9b2] bg-white px-3 py-2 text-sm outline-none ring-[#0f8a6f]/35 focus:ring-4"
                  placeholder="Artist name"
                />
              </label>

              <label className="block">
                <span className="mono text-xs uppercase tracking-widest text-[#685d4d]">Genre</span>
                <input
                  value={artistGenre}
                  onChange={(e) => setArtistGenre(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-[#d7c9b2] bg-white px-3 py-2 text-sm outline-none ring-[#0f8a6f]/35 focus:ring-4"
                  placeholder="Pop, Rock, Hip-hop..."
                />
              </label>

              <button
                type="submit"
                disabled={isArtistSaving}
                className="w-full rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isArtistSaving
                  ? editingArtistId
                    ? "Updating..."
                    : "Saving..."
                  : editingArtistId
                    ? "Update Artist Profile"
                    : "Add Artist Profile"}
              </button>
              {editingArtistId ? (
                <button
                  type="button"
                  onClick={onCancelArtistEdit}
                  className="w-full rounded-xl border border-[#d7c9b2] bg-white px-4 py-2 text-sm font-semibold text-[#5f5444] transition hover:bg-[#f7efe3]"
                >
                  Cancel Artist Edit
                </button>
              ) : null}
            </form>

            {artistError ? <p className="mt-3 text-sm text-[var(--danger)]">{artistError}</p> : null}
          </div>

          <div ref={lyricsFormRef} className="card rounded-3xl p-6">
            <h2 className="text-3xl font-semibold leading-tight">Manage Lyrics</h2>
            <p className="mt-2 text-sm text-[#4e4537]">
              {editingLyricId ? "Edit an existing lyric entry." : "Add new lyrics to the database."}
            </p>

            <form onSubmit={onSubmitLyrics} className="mt-6 space-y-3">
              <label className="block">
                <span className="mono text-xs uppercase tracking-widest text-[#685d4d]">Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-[#d7c9b2] bg-white px-3 py-2 text-sm outline-none ring-[#0f8a6f]/35 focus:ring-4"
                  placeholder="Song title"
                />
              </label>

              <label className="block">
                <span className="mono text-xs uppercase tracking-widest text-[#685d4d]">
                  Artist Profile
                </span>
                <div className="mt-2 flex flex-wrap gap-2 rounded-xl border border-[#d7c9b2] bg-white p-3">
                  {artistProfiles.length === 0 ? (
                    <p className="text-xs text-[#746a5b]">No artist profiles yet.</p>
                  ) : (
                    artistProfiles.map((profile) => {
                      const isSelected = selectedArtistIds.includes(String(profile.id));
                      return (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => onToggleArtistSelection(String(profile.id))}
                          aria-pressed={isSelected}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            isSelected
                              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                              : "border-[#d7c9b2] bg-[#fffcf6] text-[#5f5444] hover:bg-[#f4ecdf]"
                          }`}
                        >
                          {profile.name}
                        </button>
                      );
                    })
                  )}
                </div>
                <p className="mt-1 text-xs text-[#746a5b]">
                  Click artist names to toggle selection.
                </p>
              </label>

              <label className="block">
                <span className="mono text-xs uppercase tracking-widest text-[#685d4d]">
                  YouTube Link (optional)
                </span>
                <input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d7c9b2] bg-white px-3 py-2 text-sm outline-none ring-[#0f8a6f]/35 focus:ring-4"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </label>

              <label className="block">
                <span className="mono text-xs uppercase tracking-widest text-[#685d4d]">
                  Spotify Link (optional)
                </span>
                <input
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d7c9b2] bg-white px-3 py-2 text-sm outline-none ring-[#0f8a6f]/35 focus:ring-4"
                  placeholder="https://open.spotify.com/track/..."
                />
              </label>

              <label className="block">
                <span className="mono text-xs uppercase tracking-widest text-[#685d4d]">Lyrics</span>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={6}
                  className="mt-1 w-full resize-y rounded-xl border border-[#d7c9b2] bg-white px-3 py-2 text-sm outline-none ring-[#0f8a6f]/35 focus:ring-4"
                  placeholder="Paste lyrics..."
                />
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Saving..." : editingLyricId ? "Update Lyric" : "Add Lyric"}
              </button>
              {editingLyricId ? (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="w-full rounded-xl border border-[#d7c9b2] bg-white px-4 py-2 text-sm font-semibold text-[#5f5444] transition hover:bg-[#f7efe3]"
                >
                  Cancel Edit
                </button>
              ) : null}
            </form>

            {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
          </div>
        </section>

        <section className="space-y-6">
          <div className="card rounded-3xl p-6">
            <h2 className="text-2xl font-semibold">Artist Profiles</h2>
            <p className="text-sm text-[#4e4537]">
              {artistProfiles.length} artist profile{artistProfiles.length === 1 ? "" : "s"}
            </p>

            <div className="mt-4 space-y-3">
              {isArtistLoading ? (
                <p className="text-sm text-[#6b604e]">Loading artist profiles...</p>
              ) : artistProfiles.length === 0 ? (
                <p className="text-sm text-[#6b604e]">No artist profiles yet.</p>
              ) : (
                artistProfiles.map((profile) => (
                  <article
                    key={profile.id}
                    className={`rounded-2xl border bg-[#fffcf6] p-4 ${
                      String(profile.id) === activeLyricsArtistId
                        ? "border-[var(--accent)]"
                        : "border-[#e1d4c0]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActiveLyricsArtistId((prev) =>
                          prev === String(profile.id) ? null : String(profile.id)
                        )
                      }
                      className="text-left text-lg font-semibold underline-offset-2 hover:underline"
                    >
                      {profile.name}
                    </button>
                    <p className="mono mt-1 text-xs text-[#746a5b]">{profile.genre || "No genre set."}</p>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => onEditArtist(profile)}
                        className="mono rounded-md border border-[#d7c9b2] bg-white px-2 py-1 text-[10px] uppercase tracking-widest text-[#5f5444]"
                      >
                        Edit Artist
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="card rounded-3xl p-6">
            <h2 className="text-2xl font-semibold">Latest Lyrics Entries</h2>
            <p className="text-sm text-[#4e4537]">
              {filteredLyrics.length} lyric{filteredLyrics.length === 1 ? "" : "s"} shown
            </p>
            <div className="mt-3 space-y-2">
              <input
                value={lyricsArtistSearch}
                onChange={(e) => setLyricsArtistSearch(e.target.value)}
                className="w-full rounded-xl border border-[#d7c9b2] bg-white px-3 py-2 text-sm outline-none ring-[#0f8a6f]/35 focus:ring-4"
                placeholder="Search artist songs by artist name..."
              />
              {activeLyricsArtist ? (
                <button
                  type="button"
                  onClick={() => setActiveLyricsArtistId(null)}
                  className="mono rounded-md border border-[#d7c9b2] bg-white px-2 py-1 text-[10px] uppercase tracking-widest text-[#5f5444]"
                >
                  Clear artist filter: {activeLyricsArtist.name}
                </button>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {isLoading ? (
                <p className="text-sm text-[#6b604e]">Loading lyrics...</p>
              ) : filteredLyrics.length === 0 ? (
                <p className="text-sm text-[#6b604e]">
                  {lyrics.length === 0 ? "No lyrics yet." : "No lyrics found for this artist filter."}
                </p>
              ) : (
                filteredLyrics.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-[#e1d4c0] bg-[#fffcf6] p-4">
                    <header className="mb-2">
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <p className="mono text-xs text-[#726758]">{item.artist}</p>
                    </header>
                    <div className="mb-2">
                      <button
                        type="button"
                        onClick={() => onEditLyric(item)}
                        className="mono rounded-md border border-[#d7c9b2] bg-white px-2 py-1 text-[10px] uppercase tracking-widest text-[#5f5444]"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {item.youtube_url ? (
                        <a
                          href={item.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mono rounded-md border border-[#d7c9b2] bg-white px-2 py-1 text-[10px] uppercase tracking-widest text-[#5f5444]"
                        >
                          YouTube
                        </a>
                      ) : null}
                      {item.spotify_url ? (
                        <a
                          href={item.spotify_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mono rounded-md border border-[#d7c9b2] bg-white px-2 py-1 text-[10px] uppercase tracking-widest text-[#5f5444]"
                        >
                          Spotify
                        </a>
                      ) : null}
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm text-[#332d24]">
                      {item.lyrics}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
