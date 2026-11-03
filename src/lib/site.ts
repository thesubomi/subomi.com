// Small helpers shared by every page.

/** The site's root, with a trailing slash ("/" on subomi.com). */
export const home = import.meta.env.BASE_URL.replace(/\/?$/, "/");

/** A link to a page on this site: url("writing/") → "/writing/". */
export const url = (path = "") => home + path.replace(/^\//, "");

/** Two-digit index numbers: 1 → "01". */
export const pad = (i: number) => String(i).padStart(2, "0");

/** "October 2025". Days are never shown, so only the month and year of a date matter. */
export const monthYear = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);

/** Minutes to read a Markdown body at about 220 words a minute. */
export const readTime = (body = "") => {
  const words = body.replace(/[#*_>`\[\]()-]/g, " ").split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
};

/** Spotify's player for a playlist, album or track link; null for anything else. */
export const spotifyEmbed = (link?: string) => {
  const m = link?.match(/open\.spotify\.com\/(playlist|album|track)\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0` : null;
};

/** Apple Music's player for a music.apple.com link; null for anything else. */
export const appleEmbed = (link?: string) =>
  link && /^https:\/\/music\.apple\.com\//.test(link) ? link.replace("https://music.apple.com/", "https://embed.music.apple.com/") : null;

/** A link is real once it is more than a "#" placeholder. */
export const isReal = (link?: string) => !!link && link !== "#";
