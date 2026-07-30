/**
 * Generador de logo e identidad visual, 100% procedural (sin IA de imagen).
 *
 * A partir del nombre, la temática y la línea editorial deriva de forma
 * determinista: una paleta de color, una variante de forma y un SVG de
 * marca. Mismos inputs → mismo logo siempre, así el asistente puede
 * previsualizar en el navegador sin llamar a ningún servidor.
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

export interface Identidad {
  iniciales: string;
  paleta: Paleta;
  variante: number;
  svg: string;
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

function formaVariante(variante: number, id: string): string {
  switch (variante) {
    case 0: // círculo
      return `<circle cx="100" cy="100" r="92" fill="url(#g-${id})" />`;
    case 1: // hexágono
      return `<polygon points="100,10 175,52 175,148 100,190 25,148 25,52" fill="url(#g-${id})" />`;
    case 2: // escudo con corte diagonal
      return `<path d="M100 10 L184 42 V110 C184 156 148 184 100 194 C52 184 16 156 16 110 V42 Z" fill="url(#g-${id})" />`;
    default: // cuadrado redondeado con esquina cortada
      return `<path d="M24 10 H150 L190 50 V176 A14 14 0 0 1 176 190 H24 A14 14 0 0 1 10 176 V24 A14 14 0 0 1 24 10 Z" fill="url(#g-${id})" />`;
  }
}

export function generarIdentidad(nombre: string, tematica: string, editorial: string): Identidad {
  const seed = hash(`${nombre}::${tematica}::${editorial}`);
  const paleta = generarPaleta(nombre, tematica, editorial);
  const variante = seed % 4;
  const inic = iniciales(nombre);
  const id = `${seed}`;

  const svg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Logo de ${nombre}">
  <defs>
    <linearGradient id="g-${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${paleta.primario}" />
      <stop offset="100%" stop-color="${paleta.primarioOscuro}" />
    </linearGradient>
  </defs>
  ${formaVariante(variante, id)}
  <text x="100" y="122" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif" font-weight="800" font-size="72" fill="${paleta.tinta}" letter-spacing="-2">${inic}</text>
  <circle cx="152" cy="56" r="7" fill="${paleta.acento}" />
</svg>`;

  return { iniciales: inic, paleta, variante, svg };
}
