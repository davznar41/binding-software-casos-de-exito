# Binding Software · Casos de éxito

Catálogo corporativo estático en español e inglés. Una plantilla editorial compartida genera los artículos a partir de Markdown y permite incorporar nuevas historias, traducciones y combinaciones de bloques.

**[Ver la presentación y explorar la demo en Netlify](https://casosdeexitodemoidioma.netlify.app/)** · Vídeo de 5:50 sin audio, transcripción y acceso a cinco casos en ambos idiomas. La demo incluye ejemplos ficticios.

## Desarrollo local

Astro **6.4.8**, TypeScript estricto, CSS nativo y Content Collections con Zod. Requiere **Node.js ≥22.19.0** y **pnpm 11.25.0**. Ambas compilaciones se comprobaron con Node 22.19.0 y la suite completa con Node 24.11.1.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

El servidor local abre la revisión en los catálogos [ES](http://127.0.0.1:4321/casos-de-exito/) y [EN](http://127.0.0.1:4321/en/casos-de-exito/).

| Comando | Uso |
| --- | --- |
| `pnpm dev:borradores` | Incluye borradores en la revisión local. |
| `pnpm build` / `pnpm preview` | Compila y sirve la salida publicable de `dist/`. |
| `pnpm build:revision` / `pnpm preview:revision` | Compila y sirve `dist-revision/`, con las demostraciones. |
| `pnpm exec playwright install chromium` | Instala Chromium para las pruebas de navegador. |
| `pnpm verify` | Ejecuta Astro check, TypeScript, ambos builds y las pruebas editoriales y de navegador. |

## Arquitectura y escalabilidad editorial

| Pieza | Responsabilidad |
| --- | --- |
| [Esquema editorial](src/content.config.ts) | Valida campos, estados de publicación y tipos de bloques. |
| [Rutas de catálogo y detalle](src/pages/) | Astro genera el catálogo y las páginas de los artículos en ambos idiomas. |
| [Plantilla del artículo](src/layouts/CaseStudyLayout.astro) y [renderizador](src/components/CaseEditorial.astro) | Comparten estructura corporativa y renderizan cada bloque en el orden declarado. |
| [Selección de casos](src/lib/cases.ts) | Filtra la visibilidad editorial, resuelve traducciones y selecciona casos relacionados. |
| [Navegación corporativa](src/data/site.ts) y [estilos](src/styles/) | Centralizan enlaces, tokens y estilos reutilizables para integrar la sección en Astro. |

Cada historia puede repetir, omitir o reordenar bloques de texto, imagen, galería, vídeo, testimonio, comparación y resultados. El catálogo y las fichas se regeneran al compilar. Si se necesita un tipo de bloque nuevo, se amplían el esquema y el renderizador compartidos y se implementa su componente.

## Crear y traducir un caso

1. Copia la [plantilla editorial](tests/fixtures/editorial/plantilla.md) a `src/content/casos/`. Conserva el estado `borrador` mientras editas y elige un slug estable en minúsculas y con guiones.
2. Ordena los bloques en `blocks`. Un bloque `texto` sin `file` muestra el cuerpo Markdown. Para intercalar tramos de texto, toma como referencia los fragmentos de `src/content/textos/` y los artículos que los enlazan.
3. Guarda los medios en `src/assets/casos/`. Declara dimensiones reales y textos alternativos en el idioma del artículo. Para galerías están disponibles las variantes `uniforme` y `destacada`.
4. Para traducir, declara el mismo `caseId` en ambas entradas y `language: en` en la traducción. Los slugs pueden ser distintos. Usa los `caseId` en `related` para curar las relaciones. Revisa ambas versiones con `pnpm dev:borradores`.

## Publicación e integración

| Estado | Disponibilidad |
| --- | --- |
| `borrador` | Edición local con `pnpm dev:borradores`. |
| `demostracion` | Revisión local y build de revisión. |
| `publicado` | Revisión y build público. Requiere `origin: autorizado` y fecha en `publishedOn`. |

La compilación filtra también los medios exclusivos de las entradas excluidas. Usa control de acceso en el alojamiento si el build de revisión contiene material restringido. La directiva `noindex` indica a los buscadores que omitan la indexación.

Para integrar la sección en la web corporativa, conserva las rutas `/casos-de-exito/` y `/en/casos-de-exito/` y resuelve los enlaces corporativos desde [la configuración de navegación](src/data/site.ts). Configura `BINDING_SITE_URL` con el dominio aprobado para las URL canónicas y las equivalencias de idioma en producción.

## Validación y accesibilidad

`pnpm verify` cubre las dos compilaciones estáticas, la exclusión de borradores, la creación de casos desde Markdown, las traducciones, la navegación, las galerías, los vídeos y el reflujo. La entrega registró **81 pruebas superadas**.

El objetivo es WCAG 2.2 AA. La interfaz contempla semántica, navegación por teclado, foco visible, alternativas de imagen, reflujo y movimiento reducido. Los vídeos locales incluyen transcripción y subtítulos cuando corresponde. Las pruebas automáticas con axe complementan la revisión manual con tecnologías de asistencia.
