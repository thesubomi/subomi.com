# subomi.com

Ọláṣùbòmí Archibong's personal site: playlists, writing, art, travels and running. Built with [Astro](https://astro.build) and deployed to GitHub Pages.

The look follows the Ọláṣùbòmí design system in its website mode: ink on paper, text first. The brand colours stay on social posts; colour on the site comes only from content (cover art, artwork, photos).

## Maintenance mode

While `"maintenance": true` is set in `src/data/site.json`, subomi.com shows a "Building in progress" page (`src/components/Maintenance.astro`). The full site stays viewable at [subomi.com/preview/](https://subomi.com/preview/), hidden from search engines. Set it to `false` and push to put the full site on the home page.

## Editing content

Each article, playlist, art piece and trip is one Markdown file. The part between the `---` lines sets its title, date and so on; the text below is the body. Add a file (copy an existing one is easiest), push to `main`, and the site rebuilds. On GitHub you can do this in the browser: open the folder, then Add file › Create new file.

| What | Where | Becomes |
| --- | --- | --- |
| Articles | `src/content/writing/<name>.md` | `/writing/<name>/` |
| Playlists (title, one-line note, paragraph, Spotify link) | `src/content/music/<name>.md` | `/music/<name>/` |
| Szubomi: bio and releases | `src/data/artist.json` | `/music/` and home |
| Art (put the image next to the file, set `image: ./name.jpg`) | `src/content/art/<name>.md` | `/art/<name>/` |
| Trips (cover and photos in a folder beside the file) | `src/content/travels/<name>.md` | `/travels/<name>/` |
| Name, intro line, [ Now ] lines, About text, footer, social links | `src/data/site.json` | every page |
| Running numbers (filled in from Strava, see below) | `src/data/running.json` | home and `/running/` |

- `draft: true` keeps an article (or any entry) off the live site until you change it to `false`.
- `featured: true` on one playlist makes it "[ On repeat ]" on the home page and the music page. `order` sets the order of the list.
- Each playlist's tracklist, length and cover come from its Spotify link: `scripts/spotify.mjs` reads them before every build (and the site rebuilds every morning), so editing a playlist on Spotify updates the site on its own. The last copy is saved in `src/data/spotify.json`, which the build falls back to if Spotify can't be reached.
- To add a note to one track, add `trackNotes:` to the playlist file, for example `trackNotes: { "Till I Collapse": "The morning alarm." }`, using the title exactly as Spotify shows it.
- A new single: add it to `releases` in `src/data/artist.json`, newest first. The first one gets the player.
- Only the month and year of a date are shown.
- The fields each kind of file accepts are listed in `src/content.config.ts`.

Text in `[brackets]` is placeholder copy waiting for the real thing.

## Pages

| URL | File |
| --- | --- |
| `/` | `src/pages/index.astro` (maintenance page or the full home, see above) |
| `/preview/` | `src/pages/preview.astro` (the full home, never indexed) |
| `/music/`, `/music/<name>/` | `src/pages/music/` |
| `/writing/`, `/writing/<name>/` | `src/pages/writing/` |
| `/art/`, `/art/<name>/` | `src/pages/art/` |
| `/travels/`, `/travels/<name>/` | `src/pages/travels/` |
| `/running/` | `src/pages/running.astro` |
| `/about/` | `src/pages/about.astro` |
| `/rss.xml` | `src/pages/rss.xml.js` (all published articles) |
| 404 | `src/pages/404.astro` |

The home page content itself lives in `src/components/Home.astro`. While maintenance mode is on, every page except the holding page is marked noindex and left out of the sitemap.

Shared parts: `src/layouts/Base.astro` (head, share tags), `src/components/` (header, footer, OLA mark). Styles: `src/styles/site.css`.

## Running locally

```bash
npm install
npm run dev      # local preview at http://localhost:4321
npm run build    # refreshes Strava numbers if credentials are set, then builds into dist/
```

## Strava

`scripts/strava.mjs` runs before every build. It signs in to the Strava API with a refresh token, sums this month's runs (distance, count, moving time, average pace) and the last 12 weeks of distance, and writes them to `src/data/running.json`. The token is used only during the build, never in the browser. The site also rebuilds every morning so the numbers stay current.

To switch it on:

1. Create an API application at <https://www.strava.com/settings/api> (Website: `https://subomi.com`, Authorization Callback Domain: `localhost`).
2. Authorise it once with read access to your activities by opening, with your Client ID filled in:
   `https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost&approval_prompt=force&scope=activity:read`
   After you approve, the browser lands on a `localhost` address that won't load. Copy the `code=` value from its address bar.
3. Exchange that code for a refresh token:
   ```bash
   curl -X POST https://www.strava.com/oauth/token \
     -d client_id=YOUR_CLIENT_ID -d client_secret=YOUR_CLIENT_SECRET \
     -d code=THE_CODE -d grant_type=authorization_code
   ```
   Keep the `refresh_token` from the reply.
4. In this repository on GitHub: Settings › Secrets and variables › Actions, add the secrets `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` and `STRAVA_REFRESH_TOKEN`. Optionally add a variable `STRAVA_PROFILE_URL` with your Strava profile link.
5. Run the "Deploy to GitHub Pages" workflow (Actions tab › Run workflow).

Until the secrets are set, the page shows the example numbers in `running.json`, labelled as examples. If Strava ever rejects the token, the build keeps the last numbers and still publishes.

## Deploying

Every push to `main` builds and publishes the site (`.github/workflows/deploy.yml`). In the repository's Settings › Pages, Source must be set to **GitHub Actions**.

## Domain

Right now the site lives at <https://thesubomi.github.io/subomi.com/>. `astro.config.mjs` switches to the root of subomi.com by itself as soon as `public/CNAME` exists.

To serve the site at subomi.com, add a file `public/CNAME` containing `subomi.com`, then point the domain's DNS at GitHub Pages: four `A` records for `@` to 185.199.108.153, 185.199.109.153, 185.199.110.153 and 185.199.111.153, and a `CNAME` record for `www` to `thesubomi.github.io`. Then enter `subomi.com` under Settings › Pages › Custom domain and tick Enforce HTTPS once it is offered.
