import type { APIRoute, GetStaticPaths } from 'astro';
import { readFile } from 'node:fs/promises';
import { caseMediaPath, mediaFiles, visibleCases } from '../../../lib/cases';

const types: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  vtt: 'text/vtt; charset=utf-8',
};

export const getStaticPaths = (async () => {
  const files = new Set((await visibleCases()).flatMap(mediaFiles));
  return [...files].map((file) => ({ params: { asset: file }, props: { file } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const file = props.file as string;
  const bytes = await readFile(caseMediaPath(file));
  const extension = file.split('.').at(-1)!;
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': types[extension] },
  });
};

