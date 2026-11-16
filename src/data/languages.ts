export const languages = ['es', 'en'] as const;
export type Language = typeof languages[number];
export type LocalizedPaths = Record<Language, string | undefined>;

export const languageNames = { es: 'Español', en: 'English' };

export function languageFromPath(path: string): Language {
  return path === '/en' || path.startsWith('/en/') ? 'en' : 'es';
}

export function otherLanguage(language: Language): Language {
  return language === 'es' ? 'en' : 'es';
}

const messages = {
  skip: ["Saltar al contenido","Skip to content"],
  home: ["Inicio","Home"],
  cases: ["Casos de éxito","Case studies"],
  why: ["Por qué Binding","Why Binding"],
  research: ["I+D+i","R&I"],
  comparator: ["Comparador 360º","Comparator 360º"],
  contact: ["Contacto","Contact"],
  mainNav: ["Principal","Main"],
  langGroup: ["Idioma","Language"],
  menu: ["Menú","Menu"],
  homeBrand: ["Binding Software, inicio","Binding Software, home"],
  accessibility: ["Accesibilidad","Accessibility"],
  footerNav: ["Pie de página","Footer"],
  footerDescription: ["Tecnología que conecta la hospitalidad.","Technology that connects hospitality."],
  footerNote: ["Binding Software · Tecnología para la gestión hotelera","Binding Software · Technology for hotel operations"],
  breadcrumbs: ["Ruta de navegación","Breadcrumb"],
  returnCases: ["Volver a Casos de éxito","Back to case studies"],
  missing: ["Este artículo aún no está disponible en inglés. Ver el catálogo en inglés.","This case study is not available in Spanish yet. View the Spanish catalogue."],
  read: ["Leer caso","Read case study"],
  readOf: ["de","about"],
  featured: ["Caso destacado","Featured case"],
  catalogDescription: ["Experiencias de establecimientos hoteleros con las soluciones de Binding Software.","How hotels use Binding Software solutions."],
  catalogEyebrow: ["Tecnología en la operativa hotelera","Technology for hotel operations"],
  catalogSummary: ["Cómo los equipos hoteleros conectan sus sistemas y simplifican la llegada del huésped con Binding.","How hotel teams connect their systems and simplify guest arrivals with Binding."],
  more: ["Más casos de éxito","More case studies"],
  stories: ["Historias de clientes","Customer stories"],
  emptyTitle: ["Los casos se publicarán aquí","Case studies will appear here"],
  emptyText: ["El catálogo todavía está a la espera de las primeras historias aprobadas.","The catalogue is awaiting its first approved stories."],
  contactTitle: ["Hablemos de la operativa de tu hotel","Let’s talk about your hotel operations"],
  contactText: ["Cuéntanos cómo gestionas el check-in y qué procesos quieres conectar.","Tell us how you manage check-in and which processes you want to connect."],
  contactAction: ["Contactar con Binding","Contact Binding"],
  location: ["Ubicación","Location"],
  sector: ["Sector","Industry"],
  establishment: ["Tipo de establecimiento","Property type"],
  rooms: ["Habitaciones","Rooms"],
  solutions: ["Soluciones","Solutions"],
  implemented: ["Implantación","Implementation"],
  facts: ["Ficha del establecimiento","Property details"],
  website: ["Sitio web de","Website for"],
  comparison: ["Antes y después","Before and after"],
  before: ["Antes","Before"],
  after: ["Después","After"],
  results: ["Resultados","Results"],
  source: ["Fuente","Source"],
  related: ["Casos relacionados","Related case studies"],
  openVideo: ["Abrir el vídeo","Open video"],
  loadVideo: ["Cargar vídeo de","Load video from"],
  videoPrivacy: ["Al cargar el vídeo, el reproductor se conecta con","Loading the video connects the player to"],
  watch: ["Ver","Watch"],
  on: ["en","on"],
  audioDescription: ["con audiodescripción","with audio description"],
  transcript: ["Transcripción y descripción","Transcript and description"],
  of: ["de","for"],
  quote: ["Testimonio","Testimonial"],
  accessDescription: ["Medidas de accesibilidad de la sección Casos de éxito y canal de contacto.","Accessibility measures and contact details for the Case studies section."],
  accessIntro: ["Información sobre la accesibilidad de Casos de éxito de Binding Software.","Accessibility information for Binding Software’s case studies."],
  measures: ["Medidas aplicadas","Accessibility measures"],
  measureText: ["La sección utiliza navegación por teclado, foco visible, encabezados jerárquicos, alternativas de imagen, diseño adaptable y compatibilidad con la preferencia de movimiento reducido.","This section supports keyboard navigation, visible focus, hierarchical headings, image alternatives, responsive layouts and reduced-motion preferences."],
  scope: ["Alcance de la evaluación","Assessment scope"],
  scopeText: ["El objetivo de diseño es WCAG 2.2 AA. La revisión de conformidad integral y la validación de esta declaración por Binding están pendientes.","The design target is WCAG 2.2 AA. A full conformance review and Binding’s approval of this statement are pending."],
  support: ["Comunicar una barrera","Report an accessibility barrier"],
  supportText: ["Si encuentras una dificultad para acceder al contenido, puedes escribir mediante el","If you have difficulty accessing this content, please use the"],
  supportLink: ["formulario de contacto de Binding Software","Binding Software contact form"],
  notFound: ["Página no encontrada","Page not found"],
} as const;

export function ui(language: Language) {
  const index = language === 'es' ? 0 : 1;
  return Object.fromEntries(Object.entries(messages).map(([key, value]) => [key, value[index]])) as
    Record<keyof typeof messages, string>;
}
