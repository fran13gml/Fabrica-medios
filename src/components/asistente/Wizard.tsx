import { useMemo, useState } from 'react';
import { generarIdentidad } from '../../lib/logo';
import catalogoFuentes from '../../data/catalogo-fuentes.json';

interface Seccion {
  clave: string;
  nombre: string;
  descriptor: string;
}

interface Fuente {
  nombre: string;
  url: string;
}

const FRECUENCIAS = [
  { key: 'cada-6h', label: 'Cada 6 horas', cron: '0 */6 * * *', ventanaHoras: 7 },
  { key: 'cada-12h', label: 'Cada 12 horas', cron: '0 */12 * * *', ventanaHoras: 13 },
  { key: 'diario', label: 'Diario', cron: '0 6 * * *', ventanaHoras: 25 },
  { key: 'bisemanal', label: 'Dos veces por semana (lunes y jueves)', cron: '0 6 * * 1,4', ventanaHoras: 85 },
  { key: 'semanal', label: 'Semanal (lunes)', cron: '0 6 * * 1', ventanaHoras: 169 },
] as const;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

const catalogo = catalogoFuentes as Record<string, { nombre: string; descripcion: string; fuentes: Fuente[] }>;

export default function Wizard() {
  const [paso, setPaso] = useState(1);

  const [nombre, setNombre] = useState('');
  const [tematica, setTematica] = useState('');
  const [editorial, setEditorial] = useState('');

  const [secciones, setSecciones] = useState<Seccion[]>([{ clave: '', nombre: '', descriptor: '' }]);

  const [categoria, setCategoria] = useState<string>(Object.keys(catalogo)[0]);
  const [fuentesActivas, setFuentesActivas] = useState<Record<string, boolean>>({});
  const [fuentesManuales, setFuentesManuales] = useState<Fuente[]>([]);
  const [nuevaFuente, setNuevaFuente] = useState<Fuente>({ nombre: '', url: '' });

  const [frecuenciaKey, setFrecuenciaKey] = useState<(typeof FRECUENCIAS)[number]['key']>('diario');
  const [cantidad, setCantidad] = useState(2);

  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const identidad = useMemo(
    () => (nombre.trim() && tematica.trim() && editorial.trim() ? generarIdentidad(nombre, tematica, editorial) : null),
    [nombre, tematica, editorial]
  );

  const fuentesCategoria = catalogo[categoria]?.fuentes ?? [];
  const fuentesSeleccionadas: Fuente[] = [
    ...fuentesCategoria.filter((f) => fuentesActivas[f.url] !== false),
    ...fuentesManuales,
  ];

  const frecuencia = FRECUENCIAS.find((f) => f.key === frecuenciaKey)!;

  function actualizarSeccion(i: number, campo: keyof Seccion, valor: string) {
    setSecciones((prev) => {
      const copia = [...prev];
      copia[i] = { ...copia[i], [campo]: valor };
      if (campo === 'nombre') copia[i].clave = slugify(valor);
      return copia;
    });
  }

  function validoPaso1() {
    return nombre.trim().length > 1 && tematica.trim().length > 3 && editorial.trim().length > 10;
  }
  function validoPaso2() {
    return secciones.length > 0 && secciones.every((s) => s.clave && s.nombre && s.descriptor);
  }
  function validoPaso3() {
    return fuentesSeleccionadas.length > 0;
  }

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch('/api/generar-medio', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nombre,
          tematica,
          editorial,
          secciones,
          categoria,
          fuentes: fuentesSeleccionadas,
          frecuenciaLabel: frecuencia.label,
          frecuenciaCron: frecuencia.cron,
          ventanaHoras: frecuencia.ventanaHoras,
          cantidad,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ? `${data.error}${data.detalle ? ` — ${data.detalle}` : ''}` : 'Error desconocido');
      } else {
        setResultado(data);
      }
    } catch (e: any) {
      setError(String(e));
    } finally {
      setEnviando(false);
    }
  }

  const paleta = identidad?.paleta;

  return (
    <div
      className="asistente"
      style={
        paleta
          ? ({
              '--primario': paleta.primario,
              '--primario-oscuro': paleta.primarioOscuro,
              '--acento': paleta.acento,
            } as React.CSSProperties)
          : undefined
      }
    >
      {!resultado && (
        <>
          <ol className="pasos">
            {['Identidad', 'Secciones', 'Fuentes', 'Automatización', 'Confirmar'].map((t, i) => (
              <li key={t} className={i + 1 === paso ? 'activo' : i + 1 < paso ? 'hecho' : ''}>
                {t}
              </li>
            ))}
          </ol>

          {paso === 1 && (
            <section>
              <h2>¿Qué medio vamos a crear?</h2>
              <label>
                Nombre del medio
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. El Radar Vecinal" />
              </label>
              <label>
                Temática
                <input
                  value={tematica}
                  onChange={(e) => setTematica(e.target.value)}
                  placeholder="Ej. Actualidad y vida del barrio de Salamanca"
                />
              </label>
              <label>
                Línea editorial
                <textarea
                  value={editorial}
                  onChange={(e) => setEditorial(e.target.value)}
                  rows={4}
                  placeholder="Ej. Directos, sin sensacionalismo, con datos. Crítica constructiva con el ayuntamiento, nunca panfletaria."
                />
              </label>

              {identidad && (
                <div className="preview-logo">
                  <div className="logo-svg" dangerouslySetInnerHTML={{ __html: identidad.svg }} />
                  <div className="paleta">
                    {Object.entries({
                      primario: paleta!.primario,
                      oscuro: paleta!.primarioOscuro,
                      acento: paleta!.acento,
                      fondo: paleta!.fondo,
                    }).map(([k, v]) => (
                      <span key={k} className="swatch" style={{ background: v }} title={`${k}: ${v}`} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {paso === 2 && (
            <section>
              <h2>Secciones del medio</h2>
              <p className="ayuda">Igual que "mercado" o "crónica" en un medio deportivo: los apartados en los que se organiza el contenido.</p>
              {secciones.map((s, i) => (
                <div key={i} className="fila-seccion">
                  <input
                    placeholder="Nombre (ej. vecinos)"
                    value={s.nombre}
                    onChange={(e) => actualizarSeccion(i, 'nombre', e.target.value)}
                  />
                  <input
                    placeholder="Descriptor (ej. Historias del barrio)"
                    value={s.descriptor}
                    onChange={(e) => actualizarSeccion(i, 'descriptor', e.target.value)}
                  />
                  <button type="button" onClick={() => setSecciones((prev) => prev.filter((_, j) => j !== i))} disabled={secciones.length === 1}>
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="secundario" onClick={() => setSecciones((prev) => [...prev, { clave: '', nombre: '', descriptor: '' }])}>
                + Añadir sección
              </button>
            </section>
          )}

          {paso === 3 && (
            <section>
              <h2>Fuentes para el radar</h2>
              <p className="ayuda">Elige la categoría más cercana a tu temática. Puedes desmarcar fuentes o añadir las tuyas — revisa que las URL sigan vivas.</p>
              <label>
                Categoría
                <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setFuentesActivas({}); }}>
                  {Object.entries(catalogo).map(([clave, c]) => (
                    <option key={clave} value={clave}>{c.nombre}</option>
                  ))}
                </select>
              </label>
              <ul className="fuentes">
                {fuentesCategoria.map((f) => (
                  <li key={f.url}>
                    <label>
                      <input
                        type="checkbox"
                        checked={fuentesActivas[f.url] !== false}
                        onChange={(e) => setFuentesActivas((prev) => ({ ...prev, [f.url]: e.target.checked }))}
                      />
                      {f.nombre} <span className="url">{f.url}</span>
                    </label>
                  </li>
                ))}
                {fuentesManuales.map((f, i) => (
                  <li key={`m-${i}`}>
                    <label>
                      <input type="checkbox" checked readOnly />
                      {f.nombre} <span className="url">{f.url}</span>
                    </label>
                    <button type="button" onClick={() => setFuentesManuales((prev) => prev.filter((_, j) => j !== i))}>✕</button>
                  </li>
                ))}
              </ul>
              <div className="fila-seccion">
                <input placeholder="Nombre de la fuente" value={nuevaFuente.nombre} onChange={(e) => setNuevaFuente((f) => ({ ...f, nombre: e.target.value }))} />
                <input placeholder="URL del feed RSS" value={nuevaFuente.url} onChange={(e) => setNuevaFuente((f) => ({ ...f, url: e.target.value }))} />
                <button
                  type="button"
                  className="secundario"
                  onClick={() => {
                    if (!nuevaFuente.nombre || !nuevaFuente.url) return;
                    setFuentesManuales((prev) => [...prev, nuevaFuente]);
                    setNuevaFuente({ nombre: '', url: '' });
                  }}
                >
                  + Añadir
                </button>
              </div>
            </section>
          )}

          {paso === 4 && (
            <section>
              <h2>Autopublicación</h2>
              <p className="ayuda">El medio redactará y publicará solo, sin revisión humana, según lo que elijas aquí.</p>
              <fieldset>
                <legend>¿Cada cuánto?</legend>
                {FRECUENCIAS.map((f) => (
                  <label key={f.key} className="radio">
                    <input type="radio" name="frecuencia" checked={frecuenciaKey === f.key} onChange={() => setFrecuenciaKey(f.key)} />
                    {f.label}
                  </label>
                ))}
              </fieldset>
              <label>
                Artículos por tanda
                <input type="number" min={1} max={10} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} />
              </label>
            </section>
          )}

          {paso === 5 && (
            <section>
              <h2>Resumen</h2>
              <ul className="resumen">
                <li><strong>Nombre:</strong> {nombre}</li>
                <li><strong>Temática:</strong> {tematica}</li>
                <li><strong>Editorial:</strong> {editorial}</li>
                <li><strong>Secciones:</strong> {secciones.map((s) => s.nombre).join(', ')}</li>
                <li><strong>Fuentes:</strong> {fuentesSeleccionadas.length} de la categoría {catalogo[categoria]?.nombre}</li>
                <li><strong>Publicación:</strong> {frecuencia.label}, {cantidad} artículo(s) por tanda</li>
              </ul>
              {identidad && <div className="logo-svg chico" dangerouslySetInnerHTML={{ __html: identidad.svg }} />}
              {error && <p className="error">{error}</p>}
              <button type="button" className="primario" disabled={enviando} onClick={confirmar}>
                {enviando ? 'Creando el medio…' : 'Crear medio'}
              </button>
            </section>
          )}

          <div className="nav">
            {paso > 1 && (
              <button type="button" className="secundario" onClick={() => setPaso((p) => p - 1)}>
                Atrás
              </button>
            )}
            {paso < 5 && (
              <button
                type="button"
                className="primario"
                disabled={(paso === 1 && !validoPaso1()) || (paso === 2 && !validoPaso2()) || (paso === 3 && !validoPaso3())}
                onClick={() => setPaso((p) => p + 1)}
              >
                Siguiente
              </button>
            )}
          </div>
        </>
      )}

      {resultado && (
        <section className="resultado">
          <h2>¡Medio creado!</h2>
          <p>
            Repo: <a href={resultado.repo} target="_blank" rel="noreferrer">{resultado.repo}</a>
          </p>
          <h3>Últimos pasos</h3>
          <ol>
            {resultado.siguientesPasos.map((p: string) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </section>
      )}

      <style>{`
        .asistente { max-width: 640px; margin: 0 auto; font-family: var(--ui, system-ui, sans-serif); }
        .pasos { display: flex; gap: 0.5rem; list-style: none; padding: 0; margin: 0 0 2rem; font-size: 0.8rem; }
        .pasos li { flex: 1; text-align: center; padding-bottom: 0.5rem; border-bottom: 3px solid var(--regla, #333); color: var(--tinta-suave, #888); }
        .pasos li.activo { border-color: var(--primario, #888); color: var(--tinta, #fff); font-weight: 700; }
        .pasos li.hecho { border-color: var(--primario, #888); }
        label { display: block; margin-bottom: 1rem; font-weight: 600; font-size: 0.9rem; }
        input, textarea, select { display: block; width: 100%; margin-top: 0.3rem; padding: 0.6rem 0.7rem; border-radius: 8px; border: 1px solid var(--regla, #444); background: var(--panel, #1a1a1a); color: var(--tinta, #fff); font: inherit; }
        input[type=checkbox], input[type=radio] { display: inline-block; width: auto; margin: 0 0.5rem 0 0; }
        .radio { font-weight: 400; display: flex; align-items: center; }
        .fila-seccion { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.6rem; }
        .fila-seccion input { margin: 0; }
        .fuentes { list-style: none; padding: 0; }
        .fuentes li { display: flex; align-items: center; justify-content: space-between; padding: 0.3rem 0; font-size: 0.9rem; }
        .fuentes label { font-weight: 400; margin: 0; display: flex; align-items: center; }
        .url { color: var(--tinta-suave, #888); font-size: 0.78rem; margin-left: 0.5rem; }
        .ayuda { color: var(--tinta-suave, #888); font-size: 0.9rem; }
        button { cursor: pointer; border: none; border-radius: 8px; padding: 0.6rem 1.1rem; font: inherit; font-weight: 700; }
        .primario { background: var(--primario, #6c5ce7); color: #fff; }
        .secundario { background: transparent; border: 1px solid var(--regla, #444); color: inherit; }
        .nav { display: flex; justify-content: space-between; margin-top: 2rem; }
        .preview-logo { display: flex; align-items: center; gap: 1rem; margin-top: 1rem; }
        .logo-svg { width: 90px; height: 90px; }
        .logo-svg.chico { width: 60px; height: 60px; }
        .paleta { display: flex; gap: 6px; }
        .swatch { width: 22px; height: 22px; border-radius: 6px; display: inline-block; }
        .resumen { list-style: none; padding: 0; }
        .resumen li { padding: 0.3rem 0; border-bottom: 1px solid var(--regla, #333); }
        .error { color: #ff6b6b; }
      `}</style>
    </div>
  );
}
