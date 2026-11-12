import { getCollection, type CollectionEntry } from 'astro:content';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { blockFiles, imageFiles } from './editorial';

export type CaseEntry = CollectionEntry<'casos'>;
export type CaseData = CaseEntry['data'];
export type CaseImage = NonNullable<CaseData['cover']>;
export type EditorialBlock = CaseData['blocks'][number];
export type CaseStudy = CaseEntry & { slug: string };
export type VisibleCase = CaseStudy;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const reserved = new Set(['media', 'pagina']);
export const isReview = import.meta.env.MODE === 'revision' || isDraftPreview();
const mediaFolder = resolve('src/assets/casos');

function isDraftPreview() {
  return import.meta.env.DEV && import.meta.env.MODE === 'borradores';
}

function showCase(entry: CaseStudy): entry is VisibleCase {
  return (
    entry.data.status === 'publicado' ||
    (entry.data.status === 'demostracion' && isReview) ||
    (entry.data.status === 'borrador' && isDraftPreview())
  );
}

export function caseMediaPath(file: string) {
  return resolve(mediaFolder, file);
}

export function mediaFiles(entry: CaseStudy) {
  const { data } = entry;
  return [
    ...imageFiles(data.cover),
    ...imageFiles(data.cardImage),
    ...imageFiles(data.facts?.logo),
    ...imageFiles(data.seo?.image),
    ...data.blocks.flatMap(blockFiles),
  ];
}

export async function visibleCases() {
  const entries = (await getCollection('casos')).map((entry) => ({
    ...entry,
    slug: entry.data.slug ?? entry.id,
  }));
  const slugs = new Set<string>();
  for (const entry of entries) {
    if (!slugPattern.test(entry.slug) || reserved.has(entry.slug)) {
      throw new Error('Caso «' + entry.id + '»: slug inválido o reservado «' + entry.slug + '».');
    }
    if (slugs.has(entry.slug)) {
      throw new Error('Caso «' + entry.id + '»: slug duplicado «' + entry.slug + '».');
    }
    slugs.add(entry.slug);
    for (const file of mediaFiles(entry)) {
      if (!existsSync(caseMediaPath(file))) {
        throw new Error('Caso «' + entry.id + '»: falta el recurso «' + file + '» en src/assets/casos/.');
      }
    }
  }
  const publicTitles = new Set<string>();
  const publicSeoTitles = new Set<string>();
  for (const entry of entries) {
    if (entry.data.status === 'publicado') {
      const title = entry.data.title.toLocaleLowerCase('es');
      const seoTitle = (entry.data.seo?.title ?? entry.data.title).toLocaleLowerCase('es');
      if (publicTitles.has(title) || publicSeoTitles.has(seoTitle)) {
        throw new Error('Caso «' + entry.id + '»: el título de un caso publicado debe ser único.');
      }
      publicTitles.add(title);
      publicSeoTitles.add(seoTitle);
    }
    for (const target of entry.data.related ?? []) {
      if (target === entry.slug || !slugs.has(target)) {
        throw new Error('Caso «' + entry.id + '»: relación inválida con «' + target + '».');
      }
    }
  }

  return entries.filter(showCase).sort(compareCases);
}

function compareCases(a: VisibleCase, b: VisibleCase) {
  return (b.data.publishedOn ?? '').localeCompare(a.data.publishedOn ?? '') ||
    a.slug.localeCompare(b.slug, 'es');
}

function normalizeTerm(value: string) {
  return value.normalize('NFC').toLocaleLowerCase('es');
}

function editorialTerms(values: readonly string[] = []) {
  return new Set(values.map(normalizeTerm));
}

function sharedTerms(values: readonly string[] | undefined, terms: Set<string>) {
  return [...editorialTerms(values)].filter((value) => terms.has(value)).length;
}

function sameTerm(value: string | undefined, candidate: string | undefined) {
  return value !== undefined && candidate !== undefined && normalizeTerm(value) === normalizeTerm(candidate);
}

export function relatedCases(entry: VisibleCase, entries: VisibleCase[]) {
  const available = new Map(entries
    .filter(({ slug }) => slug !== entry.slug)
    .map((candidate) => [candidate.slug, candidate]));
  const selected: VisibleCase[] = [];
  for (const slug of entry.data.related ?? []) {
    const candidate = available.get(slug);
    if (!candidate) continue;
    selected.push(candidate);
    available.delete(slug);
    if (selected.length === 3) return selected;
  }

  const { solutions, topics, sector, facts } = entry.data;
  const solutionTerms = editorialTerms(solutions);
  const topicTerms = editorialTerms(topics);
  const ranked = [...available.values()].map((candidate) => {
    const data = candidate.data;
    const score = sharedTerms(data.solutions, solutionTerms) * 8 +
      sharedTerms(data.topics, topicTerms) * 4 +
      Number(sameTerm(facts?.establishment, data.facts?.establishment)) * 2 +
      Number(sameTerm(sector, data.sector));
    return { candidate, score };
  }).sort((a, b) => b.score - a.score || compareCases(a.candidate, b.candidate));

  return selected.concat(ranked.slice(0, 3 - selected.length).map(({ candidate }) => candidate));
}
