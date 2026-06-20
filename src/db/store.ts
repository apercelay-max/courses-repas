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
  // eslint-disable-next-line no-var
  var __appStateEnsured: boolean | undefined;
}

function getSql() {
  if (!global.__pgClient) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL n'est pas défini. Copie .env.local.example en .env.local et renseigne ta connection string Supabase."
      );
    }
    // Parse manuellement pour éviter les problèmes d'encodage URL (ex: @ dans le mot de passe)
    const parsed = new URL(url);
    global.__pgClient = postgres({
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6543,
      database: parsed.pathname.replace(/^\//, ""),
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      ssl: { rejectUnauthorized: false },
      max: 1,
      prepare: false, // requis pour le Transaction pooler Supabase
    });
  }
  return global.__pgClient;
}

async function ensureAppState(sql: ReturnType<typeof postgres>) {
  if (global.__appStateEnsured) return;

  await sql`
    create table if not exists app_state (
      id int primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )
  `;

  const rows = await sql`select 1 from app_state where id = 1`;
  if (rows.length === 0) {
    await sql`insert into app_state (id, data) values (1, ${initialData})`;
  }

  global.__appStateEnsured = true;
}

export async function readDB(): Promise<Database> {
  const sql = getSql();
  await ensureAppState(sql);
  const rows = await sql<{ data: Database }[]>`select data from app_state where id = 1`;
  return rows[0].data;
}

export async function writeDB(db: Database): Promise<void> {
  const sql = getSql();
  await ensureAppState(sql);
  await sql`update app_state set data = ${db}, updated_at = now() where id = 1`;
}

export function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
