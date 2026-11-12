# Binding Software · Casos de éxito

`binding-software-casos-de-exito` es el catálogo editorial de Binding Software. Reúne un índice, un caso destacado y artículos que presentan el contexto de cada cliente, la solución implantada y sus resultados.

Cada caso se redacta en Markdown. Una plantilla compartida permite elegir y ordenar bloques de texto, imágenes, galerías, vídeos, testimonios, resultados y comparaciones. Astro genera la página del caso y actualiza el catálogo según su estado editorial.

[Ver la presentación del proyecto en Netlify](https://presentacioncasosdeexito.netlify.app/). Incluye el recorrido audiovisual, una transcripción y acceso al catálogo de revisión con ejemplos ficticios y contenido pendiente de aprobación editorial.

## Instalación y ejecución

Proyecto estático con Astro **6.4.8**, TypeScript estricto, CSS nativo y Content Collections con validación Zod. La entrega se verificó con **Node.js 24.11.1** y **pnpm 11.25.0** en Windows. El mínimo declarado es Node.js **22.19.0**.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

El servidor local arranca en modo revisión. Abre el catálogo en [localhost:4321/casos-de-exito/](http://127.0.0.1:4321/casos-de-exito/).

| Comando | Resultado |
| --- | --- |
| `pnpm dev:borradores` | Abre la revisión local con borradores. |
| `pnpm build` | Genera la compilación pública en `dist/`. |
| `pnpm build:revision` | Genera la compilación de revisión en `dist-revision/`. |
| `pnpm preview` | Sirve localmente la compilación pública. |
| `pnpm preview:revision` | Sirve localmente la compilación de revisión. |
| `pnpm exec playwright install chromium` | Instala Chromium para la suite. |
| `pnpm verify` | Comprueba Astro y TypeScript, genera ambas compilaciones y ejecuta las pruebas. |

## Arquitectura y escalabilidad editorial

| Pieza | Responsabilidad |
| --- | --- |
| [Colecciones y esquema](src/content.config.ts) | Valida el estado editorial, los campos de cada caso y los tipos de bloque. |
| [Ruta de artículo](src/pages/casos-de-exito/%5Bslug%5D.astro) y [plantilla compartida](src/layouts/CaseStudyLayout.astro) | Generan una página estática por slug con estructura, navegación y presentación comunes. |
| [Renderizador editorial](src/components/CaseEditorial.astro) | Selecciona el componente de cada bloque y conserva el orden declarado en Markdown. |
| [Catálogo](src/pages/casos-de-exito/index.astro) y [selección de casos](src/lib/cases.ts) | Determinan qué casos aparecen, su orden y las recomendaciones relacionadas. |

**Añadir un artículo** requiere su Markdown y los medios que utilice. Cada caso puede omitir, repetir o reordenar bloques. El catálogo y los artículos se regeneran al compilar, sin crear una ruta ni una plantilla por cliente.

**Añadir un tipo de bloque** requiere definir sus campos en el esquema, implementar el componente Astro y conectarlo al renderizador. Los artículos que lo necesiten pueden incorporarlo a `blocks`.

## Añadir un caso

1. Crea un archivo en `src/content/casos/` a partir de la [plantilla editorial](tests/fixtures/plantilla-editorial.md). El nombre del archivo determina el slug salvo que declares uno. Usa minúsculas y guiones.
2. Guarda los medios en `src/assets/casos/`. Declara el archivo, las dimensiones reales y el texto alternativo de las imágenes. Las galerías admiten las variantes `uniforme` y `destacada`.
3. Ordena los bloques, conserva el caso en `borrador` y revísalo con `pnpm dev:borradores`. Un bloque `texto` sin `file` muestra el cuerpo Markdown.

```markdown
---
status: borrador
title: Cómo se prepara una llegada
summary: Contexto y pasos de un proceso de recepción.
client: Establecimiento de ejemplo
category: Check-in digital
blocks:
  - type: texto
  - type: imagen
    image:
      file: mostrador-turnos-648.webp
      alt: Mostrador con equipo de recepción y cuaderno
      width: 648
      height: 432
---

## Contexto

Describe el punto de partida del establecimiento.
```

Para recomendar otros artículos, declara sus slugs en `related`. La selección prioriza esas relaciones y puede completar hasta tres tarjetas con casos afines disponibles en la compilación.

## Revisión y publicación

| Estado | Dónde aparece |
| --- | --- |
| `borrador` | Solo en el servidor local iniciado con `pnpm dev:borradores`. |
| `demostracion` | En la revisión local y en `dist-revision/`. |
| `publicado` | En la revisión y en el build público `dist/`. Requiere `origin: autorizado` y fecha en `publishedOn`. |

La compilación pública genera los artículos aprobados y los medios editoriales que referencian. Usa la compilación de revisión con acceso restringido cuando incluya material pendiente de aprobación. La directiva `noindex` indica a los buscadores que no indexen la revisión.

## Integración con la web corporativa

La sección usa `/casos-de-exito/` para el catálogo y `/casos-de-exito/<slug>/` para cada artículo. Al integrarla, conserva esas rutas y revisa los enlaces del menú y del pie desde la [configuración de navegación](src/data/site.ts). Configura el dominio definitivo con `site` en [Astro](astro.config.mjs) para que el [layout base](src/layouts/BaseLayout.astro) genere las URL canónicas en producción. Antes de publicar, valida la aprobación editorial, los derechos de los medios y la política de dependencias.

## Accesibilidad y validación

El objetivo es **WCAG 2.2 AA**. El sitio incorpora navegación por teclado, foco visible, HTML semántico, textos alternativos, reflujo y respeto por la preferencia de movimiento reducido. Los vídeos locales incluyen transcripción y, cuando tienen audio, subtítulos WebVTT.

La entrega registró **69 pruebas superadas y 85 evaluaciones axe sin infracciones detectadas**. Las pruebas cubren publicación estática, estados editoriales, navegación, galerías, vídeo y reflujo. Queda pendiente la evaluación manual con lectores de pantalla y dispositivos físicos.
