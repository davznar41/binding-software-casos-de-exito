import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const text = z.string().trim().min(1, 'Escribe un texto no vacío.');
const slug = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa minúsculas, números y guiones.');
const file = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\.(webp|jpg|jpeg|png|avif)$/, 'Indica el nombre de una imagen local optimizada.');
const videoFile = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\.(mp4|webm)$/, 'Indica un archivo local MP4 o WebM.');
const captionFile = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\.vtt$/, 'Indica un archivo local WebVTT.');
const webUrl = z.url({ protocol: /^https?$/ });

const image = z.strictObject({
  file,
  alt: text,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: text.optional(),
  fit: z.enum(['recortar', 'contener']).optional(),
  focal: z.enum(['centro', 'arriba', 'abajo', 'izquierda', 'derecha']).optional(),
  focalMobile: z.enum(['centro', 'arriba', 'abajo', 'izquierda', 'derecha']).optional(),
  small: z.strictObject({
    file,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }).optional(),
});

const comparison = z.strictObject({
  before: z.array(text).min(1),
  after: z.array(text).min(1),
});

const results = z.array(z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('cualitativo'), description: text }),
  z.strictObject({
    type: z.literal('cuantitativo'),
    value: text,
    description: text,
    source: text,
  }),
])).min(1);

const quote = z.strictObject({
  text,
  author: text,
  role: text.optional(),
  establishment: text.optional(),
  photo: image.optional(),
});

const gallery = z.array(image).min(1).superRefine((images, context) => {
  const files = new Set<string>();
  images.forEach((item, index) => {
    for (const [key, file] of [['file', item.file], ['small', item.small?.file]] as const) {
      if (!file) continue;
      if (files.has(file)) {
        context.addIssue({ code: 'custom', path: [index, key], message: 'Usa cada foto y sus variantes una sola vez en la galería.' });
      }
      files.add(file);
    }
  });
});
const mediaWidth = z.enum(['lectura', 'amplia']).optional();
const videoFields = {
  title: text,
  poster: image.optional(),
  caption: text.optional(),
  transcript: text,
};

const video = z.discriminatedUnion('provider', [
  z.strictObject({
    provider: z.literal('local'),
    ...videoFields,
    audio: z.enum(['con-audio', 'sin-audio']),
    sources: z.array(videoFile).min(1).max(2),
    captions: z.array(z.strictObject({
      file: captionFile,
      lang: text.regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/, 'Indica un código de idioma, por ejemplo es.'),
      label: text,
    })).min(1).optional(),
    describedVersion: videoFile.optional(),
  }),
  z.strictObject({
    provider: z.literal('youtube'),
    ...videoFields,
    id: text.regex(/^[A-Za-z0-9_-]{11}$/, 'Indica el identificador de 11 caracteres de YouTube.'),
  }),
  z.strictObject({
    provider: z.literal('vimeo'),
    ...videoFields,
    id: text.regex(/^[1-9][0-9]{0,14}$/, 'Indica el identificador numérico de Vimeo.'),
  }),
]).superRefine((data, context) => {
  if (data.provider === 'local' && data.audio === 'con-audio' && !data.captions?.length) {
    context.addIssue({ code: 'custom', path: ['captions'], message: 'Añade subtítulos WebVTT para el vídeo con audio.' });
  }
  if (data.provider === 'local' && new Set(data.sources.map((source) => source.split('.').at(-1))).size !== data.sources.length) {
    context.addIssue({ code: 'custom', path: ['sources'], message: 'Usa un solo archivo por formato.' });
  }
});

const block = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('texto'), file: slug.optional() }),
  z.strictObject({ type: z.literal('imagen'), image, width: mediaWidth, variant: z.enum(['columna', 'destacada']).optional() }),
  z.strictObject({
    type: z.literal('galeria'),
    title: text.optional(),
    images: gallery,
    variant: z.enum(['uniforme', 'destacada']).optional(),
    width: mediaWidth,
  }),
  z.strictObject({ type: z.literal('video'), video }),
  z.strictObject({ type: z.literal('testimonio'), title: text.optional(), quote }),
  z.strictObject({ type: z.literal('resultados'), title: text.optional(), results }),
  z.strictObject({ type: z.literal('comparacion'), title: text.optional(), comparison }),
]);

const casos = defineCollection({
  loader: glob({
    base: './src/content/casos',
    pattern: '*.md',
    generateId: ({ entry }) => entry.slice(0, -3),
  }),
  schema: z.strictObject({
    status: z.enum(['borrador', 'demostracion', 'publicado']),
    language: z.enum(['es', 'en']).default('es'),
    caseId: slug.optional(),
    origin: z.enum(['sintetico', 'autorizado']).optional(),
    slug: slug.optional(),
    title: text,
    summary: text,
    breadcrumbLabel: text.max(64).optional(),
    client: text,
    category: text,
    cover: image.optional(),
    cardImage: image.optional(),
    publishedOn: z.iso.date().optional(),
    featured: z.boolean().optional(),
    sector: text.optional(),
    location: text.optional(),
    solutions: z.array(text).min(1).optional(),
    topics: z.array(text).min(1).optional(),
    facts: z.strictObject({
      establishment: text.optional(),
      rooms: z.number().int().positive().optional(),
      implementedOn: text.optional(),
      website: webUrl.optional(),
      logo: image.optional(),
    }).optional(),
    blocks: z.array(block).min(1, 'Añade al menos un bloque editorial.'),
    related: z.array(slug).min(1).optional(),
    seo: z.strictObject({
      title: text.optional(),
      description: text.optional(),
      image: image.optional(),
    }).optional(),
  }).superRefine((entry, context) => {
    if (entry.language === 'en' && !entry.caseId) {
      context.addIssue({ code: 'custom', path: ['caseId'], message: 'La versión inglesa requiere el identificador estable del caso.' });
    }

    if (entry.status === 'publicado' && entry.origin !== 'autorizado') {
      context.addIssue({
        code: 'custom',
        path: ['origin'],
        message: 'Publicar requiere procedencia autorizada. Conserva el contenido sintético en demostración.',
      });
    }

    if (entry.status === 'publicado' && !entry.publishedOn) {
      context.addIssue({
        code: 'custom',
        path: ['publishedOn'],
        message: 'Indica la fecha de publicación (AAAA-MM-DD).',
      });
    }
  }),
});

const textos = defineCollection({
  loader: glob({
    base: './src/content/textos',
    pattern: '*/*.md',
    generateId: ({ entry }) => entry.slice(0, -3),
  }),
  schema: z.strictObject({}),
});

export const collections = { casos, textos };



