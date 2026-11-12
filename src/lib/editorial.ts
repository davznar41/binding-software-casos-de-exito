import { getEntry, render } from 'astro:content';
import type { CaseStudy, CaseData, EditorialBlock } from './cases';

export function imageFiles(image: CaseData['cover']) {
  return image ? [image.file, ...(image.small ? [image.small.file] : [])] : [];
}

export function blockFiles(block: EditorialBlock): string[] {
  switch (block.type) {
    case 'imagen':
      return imageFiles(block.image);
    case 'galeria':
      return block.images.flatMap(imageFiles);
    case 'testimonio':
      return imageFiles(block.quote.photo);
    case 'video': {
      const { video } = block;
      const files = imageFiles(video.poster);
      if (video.provider === 'local') {
        files.push(...video.sources, ...(video.captions?.map(({ file }) => file) ?? []));
        if (video.describedVersion) files.push(video.describedVersion);
      }
      return files;
    }
    default:
      return [];
  }
}

type TextBlock = Extract<EditorialBlock, { type: 'texto' }>;
export type RenderedBlock = Exclude<EditorialBlock, TextBlock>
  | (TextBlock & { Content: Awaited<ReturnType<typeof render>>['Content'] });

export function editorialBlockId(index: number) {
  return 'editorial-' + (index + 1);
}

export async function renderEditorial(entry: CaseStudy): Promise<RenderedBlock[]> {
  const blocks = entry.data.blocks;
  const texts = new Set<string>();
  const headingsSeen = new Set([
    'contenido', 'case-facts-title', 'related-title', 'contacto',
    ...blocks.map((_block, index) => editorialBlockId(index)),
  ]);
  const errors = (message: string) => new Error('Caso «' + entry.slug + '»: ' + message);

  if (entry.body?.trim() && !blocks.some((block) => block.type === 'texto' && !block.file)) {
    throw errors('Hay texto bajo el frontmatter. Añade un bloque texto sin file para mostrarlo.');
  }

  const result: RenderedBlock[] = [];
  for (const block of blocks) {
    if (block.type !== 'texto') {
      result.push(block);
      continue;
    }
    const id = block.file ? entry.slug + '/' + block.file : '';
    if (texts.has(id)) throw errors('El bloque de texto «' + (id || 'cuerpo principal') + '» ya se usa.');
    texts.add(id);

    const source = id ? await getEntry('textos', id) : entry;
    if (!source?.body?.trim()) {
      throw errors(id
        ? 'Falta el fragmento Markdown con contenido en src/content/textos/' + id + '.md.'
        : 'El bloque texto sin file requiere contenido bajo el frontmatter.');
    }
    const { Content, headings, remarkPluginFrontmatter } = await render(source);
    if (remarkPluginFrontmatter.bindingInvalidMarkdown) {
      throw errors('Usa Markdown de texto y añade las imágenes o el vídeo con bloques editoriales.');
    }
    let previous = 1;
    for (const { depth, slug } of headings) {
      if (depth < 2 || depth > previous + 1) {
        throw errors('el Markdown debe comenzar en H2 y avanzar sin saltos de nivel.');
      }
      if (headingsSeen.has(slug)) throw errors('El encabezado «' + slug + '» se repite o coincide con un identificador de la plantilla. Usa otro encabezado.');
      headingsSeen.add(slug);
      previous = depth;
    }
    result.push({ ...block, Content });
  }
  return result;
}





