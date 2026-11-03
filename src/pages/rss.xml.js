// subomi.com/rss.xml: every published article, newest first.
import rss from "@astrojs/rss";
import { getWriting } from "../lib/content";
import site from "../data/site.json";

export async function GET(context) {
  const posts = await getWriting();
  const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
  return rss({
    title: `${site.name}: writing`,
    description: site.description,
    site: new URL(base, context.site),
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `${base}writing/${p.id}/`,
    })),
    customData: "<language>en</language>",
  });
}
