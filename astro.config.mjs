import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { existsSync } from "node:fs";

// With public/CNAME present the site is served from its own domain at the root.
// Without it, GitHub Pages serves it at thesubomi.github.io/subomi.com/.
const customDomain = existsSync(new URL("./public/CNAME", import.meta.url));

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: customDomain ? "https://subomi.com" : "https://thesubomi.github.io",
  base: customDomain ? "/" : "/subomi.com",
  trailingSlash: "ignore",
  integrations: [sitemap()],
});
