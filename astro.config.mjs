import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { existsSync, readFileSync } from "node:fs";

// With public/CNAME present the site is served from its own domain at the root.
// Without it, GitHub Pages serves it at thesubomi.github.io/subomi.com/.
const customDomain = existsSync(new URL("./public/CNAME", import.meta.url));

// While the maintenance page is up, the sitemap lists only the home page.
const { maintenance } = JSON.parse(readFileSync(new URL("./src/data/site.json", import.meta.url), "utf8"));
const site = customDomain ? "https://subomi.com" : "https://thesubomi.github.io";
const base = customDomain ? "/" : "/subomi.com";

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site,
  base,
  trailingSlash: "ignore",
  integrations: [
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname.replace(base.replace(/\/$/, ""), "") || "/";
        if (path.startsWith("/preview")) return false;
        return maintenance ? path === "/" : true;
      },
    }),
  ],
});
