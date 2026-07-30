/**
 * Generador de logo e identidad visual, 100% procedural (sin IA de imagen).
 *
 * A partir del nombre, la temática y la línea editorial deriva de forma
 * determinista: una paleta de color, una forma de logo, un estilo
 * tipográfico y un layout de portada. Mismos inputs → misma identidad
 * siempre, así el asistente puede previsualizar en el navegador sin llamar
 * a ningún servidor, y cada medio generado se siente distinto sin usar IA
 * de imagen ni tipografías externas (todo son pilas de fuentes de sistema).
 */

export interface Paleta {
  hue: number;
  primario: string;
  primarioOscuro: string;
  acento: string;
  fondo: string;
  panel: string;
  tinta: string;
}

export interface Tipografia {
  id: string;
  etiqueta: string;
  ui: string;
  texto: string;
  display: string;
  tracking: string;
  transformTitulos: 'none' | 'uppercase';
}

export type Layout = 'rejilla' | 'hero' | 'lista';
export type Gradiente = 'diagonal' | 'vertical' | 'radial';

export interface Identidad {
  iniciales: string;
  paleta: Paleta;
  variante: number;
  gradiente: Gradiente;
  tipografia: Tipografia;
  layout: Layout;
  svg: string;
}

const TIPOGRAFIAS: Tipografia[] = [
  {
    id: 'editorial',
    etiqueta: 'Editorial clásica',
    ui: `-apple-system, 'Segoe UI', system-ui, sans-serif`,
    texto: `Georgia, 'Times New Roman', serif`,
    display: `Georgia, 'Times New Roman', serif`,
    tracking: '-0.01em',
    transformTitulos: 'none',
  },
  {
    id: 'prensa',
    etiqueta: 'Prensa contundente',
    ui: `'Arial Black', 'Helvetica Neue', Arial, sans-serif`,
    texto: `'Helvetica Neue', Arial, sans-serif`,
    display: `'Arial Black', 'Helvetica Neue', Arial, sans-serif`,
    tracking: '0.01em',
    transformTitulos: 'uppercase',
  },
  {
    id: 'revista',
    etiqueta: 'Revista elegante',
    ui: `Futura, 'Century Gothic', 'Segoe UI', sans-serif`,
    texto: `'Iowan Old Style', Palatino, 'Palatino Linotype', Georgia, serif`,
    display: `Futura, 'Century Gothic', 'Segoe UI', sans-serif`,
    tracking: '-0.02em',
    transformTitulos: 'none',
  },
  {
    id: 'tecnica',
    etiqueta: 'Boletín técnico',
    ui: `ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace`,
    texto: `-apple-system, 'Segoe UI', system-ui, sans-serif`,
    display: `ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace`,
    tracking: '0em',
    transformTitulos: 'none',
  },
  {
    id: 'calida',
    etiqueta: 'Cálida y cercana',
    ui: `'Avenir Next', 'Century Gothic', 'Segoe UI', sans-serif`,
    texto: `'Avenir Next', 'Segoe UI', system-ui, sans-serif`,
    display: `'Avenir Next', 'Century Gothic', 'Segoe UI', sans-serif`,
    tracking: '-0.01em',
    transformTitulos: 'none',
  },
  {
    id: 'fanzine',
    etiqueta: 'Fanzine alternativo',
    ui: `'Arial Narrow', Arial, sans-serif`,
    texto: `Georgia, 'Times New Roman', serif`,
    display: `'Arial Narrow', Arial, sans-serif`,
    tracking: '0.03em',
    transformTitulos: 'uppercase',
  },
];

/** Escapa texto libre para insertarlo como atributo/texto dentro del SVG. */
function escapeXml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Hash FNV-1a de 32 bits: determinista y estable entre navegador y servidor. */
function hash(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '?';
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
}

export function generarPaleta(nombre: string, tematica: string, editorial: string): Paleta {
  const seed = hash(`${nombre}::${tematica}::${editorial}`);
  const hue = seed % 360;
  const satBase = 55 + (seed % 20); // 55–74: saturado pero no chillón
  return {
    hue,
    primario: `hsl(${hue} ${satBase}% 58%)`,
    primarioOscuro: `hsl(${hue} ${Math.max(satBase - 15, 30)}% 32%)`,
    acento: `hsl(${(hue + 38) % 360} ${Math.min(satBase + 10, 80)}% 62%)`,
    fondo: `hsl(${hue} 30% 7%)`,
    panel: `hsl(${hue} 26% 12%)`,
    tinta: `hsl(${hue} 15% 95%)`,
  };
}

/** 8 siluetas de logo bien distintas entre sí (no solo geometría básica). */
function formaVariante(variante: number, id: string): string {
  switch (variante % 8) {
    case 0: // círculo
      return `<circle cx="100" cy="100" r="92" fill="url(#g-${id})" />`;
    case 1: // hexágono
      return `<polygon points="100,10 175,52 175,148 100,190 25,148 25,52" fill="url(#g-${id})" />`;
    case 2: // escudo con corte diagonal
      return `<path d="M100 10 L184 42 V110 C184 156 148 184 100 194 C52 184 16 156 16 110 V42 Z" fill="url(#g-${id})" />`;
    case 3: // cuadrado redondeado con esquina cortada
      return `<path d="M24 10 H150 L190 50 V176 A14 14 0 0 1 176 190 H24 A14 14 0 0 1 10 176 V24 A14 14 0 0 1 24 10 Z" fill="url(#g-${id})" />`;
    case 4: // triángulo redondeado
      return `<path d="M100 14 L182 162 Q188 172 177 176 H23 Q12 172 18 162 Z" fill="url(#g-${id})" />`;
    case 5: // diamante (cuadrado rotado, esquinas redondeadas)
      return `<rect x="42" y="42" width="116" height="116" rx="18" transform="rotate(45 100 100)" fill="url(#g-${id})" />`;
    case 6: // anillo — círculo con un hueco real (transparente)
      return `<path fill-rule="evenodd" d="M100 8a92 92 0 100 184 92 92 0 000-184zm0 40a52 52 0 110 104 52 52 0 010-104z" fill="url(#g-${id})" />`;
    default: // blob orgánico
      return `<path d="M100 12c40 0 78 22 86 60 8 38-6 82-46 100-40 18-88 8-112-24C4 116-4 72 24 40 48 12 68 12 100 12Z" fill="url(#g-${id})" />`;
  }
}

function definicionGradiente(gradiente: Gradiente, id: string, paleta: Paleta): string {
  if (gradiente === 'radial') {
    return `<radialGradient id="g-${id}" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="${paleta.acento}" />
      <stop offset="100%" stop-color="${paleta.primarioOscuro}" />
    </radialGradient>`;
  }
  const [x1, y1, x2, y2] = gradiente === 'vertical' ? ['0', '0', '0', '1'] : ['0', '0', '1', '1'];
  return `<linearGradient id="g-${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
      <stop offset="0%" stop-color="${paleta.primario}" />
      <stop offset="100%" stop-color="${paleta.primarioOscuro}" />
    </linearGradient>`;
}

export function generarIdentidad(nombre: string, tematica: string, editorial: string): Identidad {
  const seed = hash(`${nombre}::${tematica}::${editorial}`);
  const paleta = generarPaleta(nombre, tematica, editorial);
  // Cada rasgo lee una ventana de bits distinta del mismo hash para no ir
  // siempre correlado con el tono de color (variante, tipografía, layout y
  // degradado deben poder combinarse de formas distintas entre sí).
  const variante = seed % 8;
  const gradiente: Gradiente = (['diagonal', 'vertical', 'radial'] as const)[(seed >>> 13) % 3];
  const tipografia = TIPOGRAFIAS[(seed >>> 5) % TIPOGRAFIAS.length];
  const layout: Layout = (['rejilla', 'hero', 'lista'] as const)[(seed >>> 9) % 3];
  const inic = iniciales(nombre);
  const id = `${seed}`;

  const svg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Logo de ${escapeXml(nombre)}">
  <defs>
    ${definicionGradiente(gradiente, id, paleta)}
  </defs>
  ${formaVariante(variante, id)}
  <text x="100" y="122" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif" font-weight="800" font-size="72" fill="${paleta.tinta}" letter-spacing="-2">${escapeXml(inic)}</text>
  <circle cx="152" cy="56" r="7" fill="${paleta.acento}" />
</svg>`;

  return { iniciales: inic, paleta, variante, gradiente, tipografia, layout, svg };
}
