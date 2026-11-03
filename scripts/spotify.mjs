// Refreshes src/data/spotify.json from Spotify before each build: every playlist linked in
// src/content/music/*.md (name, cover, tracklist) and every release in src/data/artist.json.
// It reads Spotify's public embed pages, so it needs no account or key. If Spotify can't be
// reached, or a page changes shape, the build keeps what is already in the file.

import { readFile, writeFile, readdir } from "node:fs/promises";

const FILE = new URL("../src/data/spotify.json", import.meta.url);
const MUSIC = new URL("../src/content/music/", import.meta.url);
const ARTIST = new URL("../src/data/artist.json", import.meta.url);
const ID = /open\.spotify\.com\/(playlist|track)\/([A-Za-z0-9]+)/;

const data = JSON.parse(await readFile(FILE, "utf8"));

const links = [];
for (const name of await readdir(MUSIC)) {
  if (!name.endsWith(".md")) continue;
  const m = (await readFile(new URL(name, MUSIC), "utf8")).match(ID);
  if (m) links.push([m[1], m[2]]);
}
for (const r of JSON.parse(await readFile(ARTIST, "utf8")).releases) {
  const m = r.spotify?.match(ID);
  if (m) links.push([m[1], m[2]]);
}

async function entity(kind, id) {
  const res = await fetch(`https://open.spotify.com/embed/${kind}/${id}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; subomi.com build)", "Accept-Language": "en" },
  });
  if (!res.ok) throw new Error(`${kind} ${id}: ${res.status}`);
  const html = await res.text();
  const json = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  const e = json && JSON.parse(json)?.props?.pageProps?.state?.data?.entity;
  if (!e) throw new Error(`${kind} ${id}: page has no data`);
  return e;
}

let ok = 0, failed = 0;
for (const [kind, id] of links) {
  try {
    const e = await entity(kind, id);
    if (kind === "playlist") {
      const tracks = (e.trackList ?? []).map((t) => [t.title, t.subtitle, Math.round((t.duration ?? 0) / 1000)]);
      if (!tracks.length) throw new Error(`playlist ${id}: no tracks`);
      data.playlists[id] = { name: e.name, cover: e.coverArt?.sources?.[0]?.url ?? data.playlists[id]?.cover, tracks };
    } else {
      const cover = [...(e.visualIdentity?.image ?? [])].sort((a, b) => (b.maxWidth ?? 0) - (a.maxWidth ?? 0))[0]?.url;
      data.tracks[id] = {
        name: e.name ?? e.title,
        artists: e.subtitle ?? data.tracks[id]?.artists ?? "",
        released: e.releaseDate?.isoString?.slice(0, 10) ?? data.tracks[id]?.released,
        cover: cover ?? data.tracks[id]?.cover,
      };
    }
    ok++;
  } catch (err) {
    failed++;
    console.warn(`spotify: kept the saved copy (${err.message})`);
  }
}

if (ok) {
  data.updated = new Date().toISOString().slice(0, 10);
  await writeFile(FILE, JSON.stringify(data) + "\n");
}
console.log(`spotify: ${ok} refreshed, ${failed} kept from the saved copy`);
