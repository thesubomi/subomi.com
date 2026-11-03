// Joins a playlist file with what Spotify says about it (src/data/spotify.json).
import spotify from "../data/spotify.json";
import artist from "../data/artist.json";
import type { CollectionEntry } from "astro:content";

type Synced = { name: string; cover?: string; tracks: [string, string, number][] };
const playlists = spotify.playlists as Record<string, Synced>;
const tracks = spotify.tracks as Record<string, { name: string; artists: string; released?: string; cover?: string }>;

/** The id in an open.spotify.com link. */
export const spotifyId = (link?: string) => link?.match(/open\.spotify\.com\/(?:playlist|track|album|artist)\/([A-Za-z0-9]+)/)?.[1];

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const hm = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
};

export interface Track { title: string; artist: string; duration?: string; note?: string }

export function playlist(entry: CollectionEntry<"music">) {
  const synced = playlists[spotifyId(entry.data.spotify) ?? ""];
  const list: Track[] = (synced?.tracks ?? []).map(([title, artist, s]) => ({
    title, artist, duration: mmss(s), note: entry.data.trackNotes[title],
  }));
  const seconds = (synced?.tracks ?? []).reduce((sum, t) => sum + t[2], 0);
  return {
    tracks: list,
    cover: synced?.cover,
    count: list.length,
    length: seconds ? hm(seconds) : "",
    meta: list.length ? `${list.length} tracks · ${hm(seconds)}` : "",
  };
}

/** Szubomi's releases, newest first, with dates and covers from Spotify. */
export const releases = artist.releases.map((r) => {
  const t = tracks[spotifyId(r.spotify) ?? ""];
  return { ...r, released: t?.released ? new Date(t.released) : undefined, cover: t?.cover };
});
export { artist };
