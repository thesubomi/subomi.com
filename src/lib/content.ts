// Reads each collection newest first, leaving drafts out of the live site.
import { getCollection } from "astro:content";

const live = ({ data }: { data: { draft?: boolean } }) => import.meta.env.DEV || !data.draft;
const newest = (a: { data: { date: Date } }, b: { data: { date: Date } }) => b.data.date.valueOf() - a.data.date.valueOf();

export const getWriting = async () => (await getCollection("writing", live)).sort(newest);
export const getMusic = async () => (await getCollection("music", live)).sort((a, b) => a.data.order - b.data.order);
export const getArt = async () => (await getCollection("art", live)).sort(newest);
export const getTravels = async () => (await getCollection("travels", live)).sort(newest);

/** The playlist marked featured, else the newest one. */
export const getFeatured = async () => {
  const all = await getMusic();
  return all.find((p) => p.data.featured) ?? all[0];
};

export const getReads = async () => (await getCollection("reads", live)).sort((a, b) => a.data.order - b.data.order);
