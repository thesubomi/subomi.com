// Refreshes src/data/running.json from Strava before each build.
//
// Needs three environment variables (GitHub: Settings › Secrets and variables › Actions):
//   STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN
// Without them, or if Strava can't be reached, the build keeps the numbers already in the file.
// The token is only ever used here, at build time, so it never reaches the browser.

import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../src/data/running.json", import.meta.url);
const WEEKS = 12;
const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } = process.env;

if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
  console.log("strava: no credentials set, keeping the numbers in src/data/running.json");
  process.exit(0);
}

try {
  const current = JSON.parse(await readFile(FILE, "utf8"));
  const token = await accessToken();
  const now = new Date();
  const weekStart = startOfWeek(now);
  const firstWeek = addDays(weekStart, -7 * (WEEKS - 1));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const since = firstWeek < monthStart ? firstWeek : monthStart;

  const runs = (await activities(token, since)).filter((a) => RUN_TYPES.has(a.sport_type ?? a.type));

  // Weekly distance, oldest first, weeks starting Monday.
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const start = addDays(firstWeek, 7 * i);
    const end = addDays(start, 7);
    const m = runs.filter((r) => { const d = localDate(r); return d >= start && d < end; });
    const km = m.reduce((s, r) => s + r.distance, 0) / 1000;
    return { label: `${MONTHS[start.getUTCMonth()]} ${start.getUTCDate()}`, km: Math.round(km * 10) / 10 };
  });

  // This month's totals.
  const month = runs.filter((r) => localDate(r) >= monthStart);
  const metres = month.reduce((s, r) => s + r.distance, 0);
  const seconds = month.reduce((s, r) => s + r.moving_time, 0);
  const pace = metres > 0 ? seconds / (metres / 1000) : 0;

  const data = {
    example: false,
    month: `${MONTHS_LONG[now.getUTCMonth()]} ${now.getUTCFullYear()}`,
    updated: `${now.getUTCDate()} ${MONTHS[now.getUTCMonth()]}`,
    profile: process.env.STRAVA_PROFILE_URL || current.profile,
    stats: [
      { label: "Distance", value: (metres / 1000).toFixed(1), unit: "km" },
      { label: "Runs", value: String(month.length), unit: "" },
      { label: "Moving time", value: hm(seconds), unit: "h" },
      { label: "Average pace", value: pace ? ms(pace) : "–", unit: "/km" },
    ],
    weeks,
  };

  await writeFile(FILE, JSON.stringify(data, null, 2) + "\n");
  console.log(`strava: ${month.length} runs this month, ${weeks.length} weeks written`);
} catch (err) {
  console.warn(`strava: could not refresh (${err.message}); keeping the numbers already in the file`);
}

async function accessToken() {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: STRAVA_REFRESH_TOKEN,
    }),
  });
  if (!res.ok) throw new Error(`token request returned ${res.status}`);
  return (await res.json()).access_token;
}

async function activities(token, since) {
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const url = `https://www.strava.com/api/v3/athlete/activities?after=${Math.floor(since / 1000)}&per_page=200&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`activities request returned ${res.status}`);
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < 200) break;
  }
  return all;
}

// Strava's start_date_local is the athlete's wall-clock time written with a Z; read it as UTC.
function localDate(a) { return new Date(a.start_date_local); }
function startOfWeek(d) {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const offset = (day.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(day, -offset);
}
function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }
function hm(s) { const h = Math.floor(s / 3600); const m = Math.round((s % 3600) / 60); return `${h}:${String(m).padStart(2, "0")}`; }
function ms(s) { const m = Math.floor(s / 60); const r = Math.round(s % 60); return `${m}:${String(r).padStart(2, "0")}`; }
