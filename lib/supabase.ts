import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}

export function formatAppError(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) {
      if (/load failed|failed to fetch|networkerror|network request failed/i.test(message)) {
        return "Unable to reach the database right now. Check your connection and try again.";
      }

      return message;
    }
  }

  return fallbackMessage;
}

export function getBrowserRedirectUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

export type Lyric = {
  id: number;
  title: string;
  artist: string;
  artist_id?: string | number | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  lyrics: string;
  created_at: string;
};

export type ArtistProfile = {
  id: string | number;
  name: string;
  slug: string;
  bio: string;
  genre?: string;
  created_at: string;
};
