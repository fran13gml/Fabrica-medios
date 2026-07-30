/**
 * Deriva las palabras clave de relevancia del radar a partir de la temática
 * y las secciones. Compartido entre el asistente (sugerencias editables) y
 * el backend (red de seguridad si el asistente no manda ninguna).
 *
 * Coger literalmente cada palabra de >=4 letras produce decenas de términos
 * genéricos ("medio", "digital", "productos", "servicios"...) que aparecen
 * en cualquier tematica y hacen que el radar puntúe positivo casi cualquier
 * noticia de negocios/tecnología, venga o no a cuento. En vez de eso: se
 * filtran palabras vacías y de relleno genérico, y solo se quedan las ~12
 * más repetidas (repetirse en varias secciones = más central en la
 * identidad del medio) — pocos términos, pero que de verdad discriminan.
 */

export interface PalabraClave {
  palabra: string;
  peso: number;
}

const STOPWORDS = new Set([
  // artículos, preposiciones, conjunciones, pronombres, verbos comunes
  'de', 'la', 'que', 'el', 'en', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con', 'una', 'su', 'al', 'lo',
  'como', 'mas', 'pero', 'sus', 'le', 'ya', 'este', 'porque', 'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre',
  'tambien', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'otros',
  'ese', 'eso', 'ante', 'ellos', 'esto', 'antes', 'algunos', 'unos', 'otro', 'otras', 'otra', 'tanto', 'esa',
  'estos', 'mucho', 'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas', 'algo',
  'nosotros', 'ellas', 'esos', 'esas', 'entonces', 'mientras', 'aunque', 'segun', 'ademas', 'incluso', 'cada',
  'toda', 'todas', 'mejor', 'peor', 'nuevo', 'nueva', 'nuevos', 'nuevas', 'general', 'generales', 'actual',
  'actuales', 'principal', 'principales', 'gran', 'grande', 'grandes', 'mismo', 'misma', 'mismos', 'mismas',
  'propio', 'propia', 'propios', 'propias', 'ser', 'son', 'sera', 'seran', 'siendo', 'sido', 'tener', 'tiene',
  'tienen', 'hacer', 'hace', 'hacen', 'puede', 'pueden', 'debe', 'deben', 'asi', 'aqui', 'alli',
  // relleno genérico: aparece en casi cualquier tematica/editorial y no
  // discrimina nada específico de este medio en concreto
  'medio', 'medios', 'digital', 'digitales', 'informacion', 'contenido', 'contenidos', 'tematica', 'editorial',
  'linea', 'enfoque', 'tono', 'vida', 'servicio', 'servicios', 'producto', 'productos', 'proyecto', 'proyectos',
  'empresa', 'empresas', 'mercado', 'mercados', 'sector', 'actualidad', 'noticia', 'noticias', 'practica',
  'practico', 'calidad', 'mundo', 'tiempo', 'forma', 'parte', 'caso', 'casos', 'manera', 'tipo', 'tipos', 'area',
  'areas', 'espana',
]);

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function derivarPalabrasClave(
  tematica: string,
  secciones: { nombre: string; descriptor: string }[],
  max = 12,
  peso = 9
): PalabraClave[] {
  const fuentes = [tematica, ...secciones.flatMap((s) => [s.nombre, s.descriptor])];
  const conteo = new Map<string, number>();

  for (const texto of fuentes) {
    const vistas = new Set(
      texto
        .toLowerCase()
        .split(/[^a-záéíóúñü0-9]+/i)
        .filter((p) => p.length >= 4 && !STOPWORDS.has(normalizar(p)))
    );
    for (const palabra of vistas) conteo.set(palabra, (conteo.get(palabra) ?? 0) + 1);
  }

  return Array.from(conteo.entries())
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, max)
    .map(([palabra]) => ({ palabra, peso }));
}
