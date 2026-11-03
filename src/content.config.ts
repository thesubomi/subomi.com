// What each kind of content on the site looks like.
// Every entry is one Markdown file: the part between the --- lines sets these fields,
// and the text below it is the body.
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// src/content/writing/<slug>.md → subomi.com/writing/<slug>/
const writing = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/writing" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(), // the line under the title, and the preview text on lists
    date: z.coerce.date(), // only the month and year are shown
    draft: z.boolean().default(false), // drafts show while editing locally, never on the live site
  }),
});

// src/content/music/<slug>.md → subomi.com/music/<slug>/
const music = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/music" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      note: z.string(), // one or two lines on why the playlist exists
      date: z.coerce.date(),
      featured: z.boolean().default(false), // the one shown as "[ This week ]"
      spotify: z.string().default("#"),
      appleMusic: z.string().default("#"),
      cover: image().optional(),
      tracks: z
        .array(z.object({ title: z.string(), artist: z.string(), duration: z.string().optional(), note: z.string().optional() }))
        .default([]),
      draft: z.boolean().default(false),
    }),
});

// src/content/art/<slug>.md → subomi.com/art/<slug>/
const art = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/art" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      medium: z.string().optional(), // "Ink on paper", "Digital"
      image: image().optional(),
      alt: z.string().default(""),
      draft: z.boolean().default(false),
    }),
});

// src/content/travels/<slug>.md → subomi.com/travels/<slug>/
const travels = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/travels" }),
  schema: ({ image }) =>
    z.object({
      place: z.string(), // "Lagos, Nigeria"
      date: z.coerce.date(),
      cover: image().optional(),
      alt: z.string().default(""),
      photos: z.array(z.object({ image: image(), alt: z.string().default(""), caption: z.string().optional() })).default([]),
      draft: z.boolean().default(false),
    }),
});

export const collections = { writing, music, art, travels };
