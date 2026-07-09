import postgres from "postgres";
import type { Database } from "./types";
import { initialData } from "./seed-data";

// Stockage : une seule ligne (id=1) dans une table Postgres `app_state`, avec
// toute la "base" stockée en JSONB. Ça permet de garder le même modèle de données
// en mémoire (lecture -> manipulation -> écriture complète) tout en étant
// persisté de façon centralisée (Supabase) et accessible depuis plusieurs
// appareils / un déploiement Vercel.
//
// Migration vers un vrai schéma relationnel (tables séparées par entité) :
// remplacer le contenu de readDB/writeDB par des requêtes par table, les types
// dans ./types.ts correspondent déjà aux colonnes attendues.

declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

function getSql() {
  if (!global.__pgClient) {
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl) throw new Error("DATABASE_URL non défini");
    // Nettoyage : supprime espaces, retours à la ligne et guillemets qui
    // peuvent s'introduire lors d'un copier-coller dans Vercel.
    let url = rawUrl.replace(/\s+/g, "").replace(/^["']+|["']+$/g, "");
    // Répare un "@" manquant avant l'hôte du pooler Supabase
    // (arrive quand le "@" est effacé en collant le mot de passe).
    if (!url.includes("@")) {
      url = url.replace(/(aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com)/, "@$1");
    }
    const parsed = new URL(url);
    global.__pgClient = postgres({
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6543,
      database: parsed.pathname.replace(/^\//, ""),
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      ssl: { rejectUnauthorized: false },
      max: 1,
      prepare: false,
    });
  }
  return global.__pgClient!;
}

export async function readDB(): Promise<Database> {
  const sql = getSql();

  // CREATE TABLE idempotent — pas de prepared statement, cast text explicite
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS app_state (
      id int primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);

  // Cast explicite en text pour éviter tout problème de désérialisation JSONB
  const rows = await sql.unsafe(
    `SELECT data::text AS data_json FROM app_state WHERE id = 1`
  );

  if (rows.length === 0) {
    // Première utilisation : insère les données de démo
    const jsonStr = JSON.stringify(initialData).replace(/'/g, "''");
    await sql.unsafe(
      `INSERT INTO app_state (id, data) VALUES (1, '${jsonStr}'::jsonb)`
    );
    return initialData;
  }

  const raw = JSON.parse(rows[0].data_json as string);
  return (typeof raw === "string" ? JSON.parse(raw) : raw) as Database;
}

export async function writeDB(db: Database): Promise<void> {
  const sql = getSql();
  const jsonStr = JSON.stringify(db).replace(/'/g, "''");
  await sql.unsafe(
    `UPDATE app_state SET data = '${jsonStr}'::jsonb, updated_at = now() WHERE id = 1`
  );
}

export function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
