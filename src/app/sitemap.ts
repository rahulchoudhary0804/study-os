import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { loadSyllabusTree } from "@/server/queries/syllabus";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/syllabus`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
  try {
    const tree = await loadSyllabusTree();
    for (const exam of tree) {
      entries.push({ url: `${SITE_URL}/syllabus/${exam.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.9 });
      for (const subject of exam.subjects) {
        entries.push({
          url: `${SITE_URL}/syllabus/${exam.slug}/${subject.slug}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // DB unreachable at build time — the static entries above still ship.
  }
  return entries;
}
