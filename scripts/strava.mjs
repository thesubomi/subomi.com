// Refreshes src/data/running.json from Strava before each build:
// this month's totals, this year's totals, the last 12 weeks of distance and the five latest runs.
//
// Needs three environment variables (GitHub: Settings › Secrets and variables › Actions):
//   STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN
// Optional variable: STRAVA_PROFILE_URL (the "Follow on Strava" link).
// Without them, or if Strava can't be reached, the build keeps the numbers already in the file.
// The token is only ever used here, at build time, so it never reaches the browser.
// With the activity:read permission Strava returns only runs visible to Everyone or Followers,
// with privacy zones applied. No maps or start locations are saved.

import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../src/data/running.json", import.meta.url);
const WEEKS = 12;
const RECENT = 5;
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
  // Warsaw wall-clock "today", so months and weeks turn over at local midnight.
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }) + " UTC");
  const weekStart = startOfWeek(now);
  const firstWeek = addDays(weekStart, -7 * (WEEKS - 1));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const since = new Date(Math.min(firstWeek, yearStart) - 86400000);

  const runs = (await activities(token, since))
    .filter((a) => RUN_TYPES.has(a.sport_type ?? a.type))
    .sort((a, b) => localDate(b) - localDate(a));

  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const start = addDays(firstWeek, 7 * i);
    const end = addDays(start, 7);
    const km = runs.filter((r) => localDate(r) >= start && localDate(r) < end).reduce((s, r) => s + r.distance, 0) / 1000;
    return { label: `${MONTHS[start.getUTCMonth()]} ${start.getUTCDate()}`, km: Math.round(km * 10) / 10 };
  });

  const month = runs.filter((r) => localDate(r) >= monthStart);
  const year = runs.filter((r) => localDate(r) >= yearStart);
  const longest = year.reduce((m, r) => (r.distance > (m?.distance ?? 0) ? r : m), null);

  const data = {
    example: false,
    month: `${MONTHS_LONG[now.getUTCMonth()]} ${now.getUTCFullYear()}`,
    updated: `${now.getUTCDate()} ${MONTHS[now.getUTCMonth()]}`,
    profile: process.env.STRAVA_PROFILE_URL || current.profile,
    stats: totals(month),
    year: {
      label: String(now.getUTCFullYear()),
      stats: [
        ...totals(year).slice(0, 3),
        { label: "Longest run", value: longest ? km(longest.distance) : "–", unit: "km" },
      ],
    },
    recent: runs.slice(0, RECENT).map((r) => ({
      name: r.name,
      date: `${localDate(r).getUTCDate()} ${MONTHS[localDate(r).getUTCMonth()]}`,
      distance: km(r.distance),
      time: duration(r.moving_time),
      pace: r.distance ? ms(r.moving_time / (r.distance / 1000)) : "–",
    })),
    weeks,
  };

  await writeFile(FILE, JSON.stringify(data, null, 2) + "\n");
  console.log(`strava: ${month.length} runs this month, ${year.length} this year`);
} catch (err) {
  console.warn(`strava: could not refresh (${err.message}); keeping the numbers already in the file`);
}

function totals(list) {
  const metres = list.reduce((s, r) => s + r.distance, 0);
  const seconds = list.reduce((s, r) => s + r.moving_time, 0);
  return [
    { label: "Distance", value: km(metres), unit: "km" },
    { label: "Runs", value: String(list.length), unit: "" },
    { label: "Moving time", value: hm(seconds), unit: "h" },
    { label: "Average pace", value: metres ? ms(seconds / (metres / 1000)) : "–", unit: "/km" },
  ];
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
  return addDays(day, -((day.getUTCDay() + 6) % 7)); // weeks start on Monday
}
function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }
function km(m) { return (m / 1000).toFixed(1); }
function hm(s) { const t = Math.round(s / 60); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; }
function ms(s) { const t = Math.round(s); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; }
function duration(s) {
  const t = Math.round(s), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), r = t % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}
