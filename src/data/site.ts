import { ui, type Language } from './languages';

const corporate = 'https://bindingsoftware.com';
const login = 'https://app.bindingid.com/login';
export const catalogPaths = { es: '/casos-de-exito/', en: '/en/casos-de-exito/' };
export const accessibilityPaths = { es: '/accesibilidad/', en: '/en/accessibility/' };
const corporatePaths = {
  es: { home: '/', why: '/por-que-binding/', research: '/idi/', comparator: '/check-in-360/', contact: '/contacto/' },
  en: { home: '/en/', why: '/en/why-binding/', research: '/en/ri/', comparator: '/en/check-in-360/', contact: '/en/contact/' },
};

export function siteFor(language: Language) {
  const urls = corporatePaths[language];
  return {
    home: corporate + urls.home,
    contact: corporate + urls.contact,
    cases: catalogPaths[language],
    accessibility: accessibilityPaths[language],
    brand: '/assets/binding-logo.webp',
  };
}

export function primaryLinks(language: Language) {
  const labels = ui(language);
  const urls = corporatePaths[language];
  return [
    ...(['home', 'why', 'research', 'comparator', 'contact'] as const).map(key => ({
      key, label: labels[key], href: corporate + urls[key],
    })),
    { key: 'cases', label: language === 'en' ? 'Success Stories' : labels.cases, href: catalogPaths[language] },
    { key: 'login', label: 'Login', href: login },
  ];
}

export function caseUrl(slug: string, language: Language = 'es') {
  return catalogPaths[language] + slug + '/';
}

export function caseMediaUrl(file: string) {
  return catalogPaths.es + 'media/' + file;
}
