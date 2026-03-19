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

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

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
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [adminEmail, setAdminEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginWebsite, setLoginWebsite] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");

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
    const supabase = getSupabaseBrowserClient();
    let isActive = true;

    async function initAuth() {
      const { data, error } = await supabase.auth.getSession();
      if (!isActive) return;

      if (error) {
        setAuthStatus("unauthenticated");
        setAuthError("Unable to check admin session.");
        return;
      }

      if (data.session?.user) {
        setAdminEmail(data.session.user.email ?? "");
        setAuthStatus("authenticated");
        setAuthError("");
      } else {
        setAuthStatus("unauthenticated");
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive) return;

      if (session?.user) {
        setAdminEmail(session.user.email ?? "");
        setAuthStatus("authenticated");
        setAuthError("");
      } else {
        setAdminEmail("");
        setAuthStatus("unauthenticated");
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    loadLyrics();
    loadArtistProfiles();
  }, [authStatus]);

  async function onSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isAuthSubmitting) return;

    setIsAuthSubmitting(true);
    setAuthError("");
    try {
      if (loginWebsite.trim()) {
        throw new Error("Invalid sign in request.");
      }

      const email = loginEmail.trim();
      const password = loginPassword;
      if (!email || !password) throw new Error("Email and password are required.");

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);

      setLoginPassword("");
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Failed to sign in.");
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function onSignOut() {
    setAuthError("");
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
    }
  }

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

  if (authStatus === "checking") {
    return (
      <main className="grain">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
          <section className="card rounded-3xl p-6">
            <p className="body-copy">Checking admin session...</p>
          </section>
        </div>
      </main>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <main className="grain">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
          <section className="card rounded-3xl p-6 md:p-8">
            <p className="eyebrow">Admin Access</p>
            <h1 className="display-title mt-2">Welcome Admin</h1>
            <p className="body-copy mt-2">Sign in is required to open the admin dashboard.</p>

            <form onSubmit={onSignIn} className="mt-6 space-y-4">
              <div className="hidden" aria-hidden="true">
                <label htmlFor="admin-website" className="ui-label">
                  <span>Website</span>
                  <input
                    id="admin-website"
                    name="website"
                    type="text"
                    value={loginWebsite}
                    onChange={(e) => setLoginWebsite(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    className="ui-input"
                  />
                </label>
              </div>

              <label className="ui-label">
                <span>Email</span>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="ui-input"
                  placeholder="admin@example.com"
                  required
                  autoComplete="email"
                />
              </label>

              <label className="ui-label">
                <span>Password</span>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="ui-input"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </label>

              <button type="submit" disabled={isAuthSubmitting} className="btn btn-primary w-full">
                {isAuthSubmitting ? "Signing In..." : "Sign In to Admin"}
              </button>
            </form>

            {authError ? <p className="status-box status-error mt-4">{authError}</p> : null}

            <div className="mt-4">
              <Link href="/" className="btn btn-secondary btn-mono">
                Back to User Page
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="grain">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-8 md:px-8 lg:grid-cols-[380px_1fr]">
        <section className="space-y-6">
          <div ref={artistFormRef} className="card rounded-3xl p-6">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Welcome Admin</p>
                <h1 className="display-title mt-2">Artist Profiles</h1>
                {adminEmail ? <p className="mono mt-2 text-xs text-[var(--muted)]">{adminEmail}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/" className="btn btn-secondary btn-mono">
                  User Page
                </Link>
                <button type="button" onClick={onSignOut} className="btn btn-secondary btn-mono">
                  Sign Out
                </button>
              </div>
            </div>
            <p className="body-copy">
              {editingArtistId ? "Update artist profile details." : "Add artist profiles for users to browse."}
            </p>

            <form onSubmit={onSubmitArtist} className="mt-4 space-y-3">
              <label className="ui-label">
                <span>Artist Name</span>
                <input
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  required
                  className="ui-input"
                  placeholder="Artist name"
                />
              </label>

              <label className="ui-label">
                <span>Genre</span>
                <input
                  value={artistGenre}
                  onChange={(e) => setArtistGenre(e.target.value)}
                  required
                  className="ui-input"
                  placeholder="Pop, Rock, Hip-hop..."
                />
              </label>

              <button
                type="submit"
                disabled={isArtistSaving}
                className="btn btn-primary w-full"
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
                  className="btn btn-secondary w-full"
                >
                  Cancel Artist Edit
                </button>
              ) : null}
            </form>

            {artistError ? <p className="status-box status-error mt-3">{artistError}</p> : null}
          </div>

          <div ref={lyricsFormRef} className="card rounded-3xl p-6">
            <h2 className="display-title">Manage Lyrics</h2>
            <p className="body-copy mt-2">
              {editingLyricId ? "Edit an existing lyric entry." : "Add new lyrics to the database."}
            </p>

            <form onSubmit={onSubmitLyrics} className="mt-6 space-y-3">
              <label className="ui-label">
                <span>Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="ui-input"
                  placeholder="Song title"
                />
              </label>

              <label className="ui-label">
                <span>Artist Profile</span>
                <div className="card mt-2 flex flex-wrap gap-2 rounded-xl p-3">
                  {artistProfiles.length === 0 ? (
                    <p className="body-copy text-xs">No artist profiles yet.</p>
                  ) : (
                    artistProfiles.map((profile) => {
                      const isSelected = selectedArtistIds.includes(String(profile.id));
                      return (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => onToggleArtistSelection(String(profile.id))}
                          aria-pressed={isSelected}
                          className={`btn btn-mono ${isSelected ? "btn-primary" : "btn-secondary"}`}
                        >
                          {profile.name}
                        </button>
                      );
                    })
                  )}
                </div>
                <p className="body-copy mt-1 text-xs">
                  Click artist names to toggle selection.
                </p>
              </label>

              <label className="ui-label">
                <span>YouTube Link (optional)</span>
                <input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="ui-input"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </label>

              <label className="ui-label">
                <span>Spotify Link (optional)</span>
                <input
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  className="ui-input"
                  placeholder="https://open.spotify.com/track/..."
                />
              </label>

              <label className="ui-label">
                <span>Lyrics</span>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={6}
                  className="ui-textarea"
                  placeholder="Paste lyrics..."
                />
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary w-full"
              >
                {isSaving ? "Saving..." : editingLyricId ? "Update Lyric" : "Add Lyric"}
              </button>
              {editingLyricId ? (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="btn btn-secondary w-full"
                >
                  Cancel Edit
                </button>
              ) : null}
            </form>

            {error ? <p className="status-box status-error mt-3">{error}</p> : null}
          </div>
        </section>

        <section className="space-y-6">
          <div className="card rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Artist Profiles</h2>
              <div className="ui-chip">{artistProfiles.length} total</div>
            </div>
            <p className="body-copy">
              {artistProfiles.length} artist profile{artistProfiles.length === 1 ? "" : "s"}
            </p>

            <div className="mt-4 space-y-3">
              {isArtistLoading ? (
                <p className="body-copy">Loading artist profiles...</p>
              ) : artistProfiles.length === 0 ? (
                <p className="body-copy">No artist profiles yet.</p>
              ) : (
                artistProfiles.map((profile) => (
                  <article
                    key={profile.id}
                    className={`card rounded-2xl p-4 ${
                      String(profile.id) === activeLyricsArtistId
                        ? "border-[var(--accent)]"
                        : ""
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
                    <p className="mono mt-1 text-xs text-[var(--muted)]">{profile.genre || "No genre set."}</p>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => onEditArtist(profile)}
                        className="btn btn-secondary btn-mono"
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Latest Lyrics Entries</h2>
              <div className="ui-chip">{filteredLyrics.length} shown</div>
            </div>
            <p className="body-copy">
              {filteredLyrics.length} lyric{filteredLyrics.length === 1 ? "" : "s"} shown
            </p>
            <div className="mt-3 space-y-2">
              <input
                value={lyricsArtistSearch}
                onChange={(e) => setLyricsArtistSearch(e.target.value)}
                className="ui-input"
                placeholder="Search artist songs by artist name..."
              />
              {activeLyricsArtist ? (
                <button
                  type="button"
                  onClick={() => setActiveLyricsArtistId(null)}
                  className="btn btn-secondary btn-mono"
                >
                  Clear artist filter: {activeLyricsArtist.name}
                </button>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {isLoading ? (
                <p className="body-copy">Loading lyrics...</p>
              ) : filteredLyrics.length === 0 ? (
                <p className="body-copy">
                  {lyrics.length === 0 ? "No lyrics yet." : "No lyrics found for this artist filter."}
                </p>
              ) : (
                filteredLyrics.map((item) => (
                  <article key={item.id} className="card rounded-2xl p-4">
                    <header className="mb-2">
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <p className="mono text-xs text-[var(--muted)]">{item.artist}</p>
                    </header>
                    <div className="mb-2">
                      <button
                        type="button"
                        onClick={() => onEditLyric(item)}
                        className="btn btn-secondary btn-mono"
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
                          className="btn btn-secondary btn-mono"
                        >
                          YouTube
                        </a>
                      ) : null}
                      {item.spotify_url ? (
                        <a
                          href={item.spotify_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-mono"
                        >
                          Spotify
                        </a>
                      ) : null}
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm text-[var(--muted)]">
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
