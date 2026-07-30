-- Registro de medios creados por la fábrica.
CREATE TABLE IF NOT EXISTS medios (
  id             TEXT PRIMARY KEY,       -- slug del medio
  nombre         TEXT NOT NULL,
  tematica       TEXT NOT NULL,
  editorial      TEXT NOT NULL,
  paleta         TEXT NOT NULL,          -- JSON: colores derivados del logo
  secciones      TEXT NOT NULL,          -- JSON: [{clave, nombre, descriptor}]
  categoria      TEXT NOT NULL,          -- categoría del catálogo de fuentes
  fuentes        TEXT NOT NULL,          -- JSON: [{nombre, url}]
  frecuencia_cron TEXT NOT NULL,         -- expresión cron de autopublicación
  cantidad       INTEGER NOT NULL,       -- artículos por tanda
  repo_url       TEXT,
  estado         TEXT NOT NULL DEFAULT 'generando', -- generando | listo | error
  creado         TEXT NOT NULL DEFAULT (datetime('now'))
);
