const corporate = 'https://bindingsoftware.com';

export const site = {
  name: 'Binding Software',
  home: corporate + '/',
  cases: '/casos-de-exito/',
  accessibility: '/accesibilidad/',
  contact: corporate + '/contacto/',
  english: corporate + '/en/',
  brand: '/assets/binding-logo.webp',
};

export const primaryLinks = [
  { label: 'Inicio', href: site.home },
  { label: 'Por qué Binding', href: corporate + '/por-que-binding/' },
  { label: 'I+D+i', href: corporate + '/idi/' },
  { label: 'Comparador 360º', href: corporate + '/check-in-360/' },
  { label: 'Contacto', href: site.contact },
  { label: 'Casos de éxito', href: site.cases },
  { label: 'Login', href: 'https://app.bindingid.com/login' },
];

export function caseUrl(slug: string) {
  return site.cases + slug + '/';
}

export function caseMediaUrl(file: string) {
  return site.cases + 'media/' + file;
}
