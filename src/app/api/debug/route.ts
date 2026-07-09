import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

// Diagnostic sans danger : décrit la STRUCTURE de DATABASE_URL
// sans jamais révéler le mot de passe.
export async function GET() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return NextResponse.json({ error: "DATABASE_URL non défini" });

  const sanitized = raw.replace(/\s+/g, "").replace(/^["']+|["']+$/g, "");

  const structure = {
    rawLength: raw.length,
    sanitizedLength: sanitized.length,
    hadWhitespace: /\s/.test(raw),
    startsWithScheme: /^postgres(ql)?:\/\//.test(sanitized),
    atCount: (sanitized.match(/@/g) || []).length,
    endsWithPostgres: sanitized.endsWith("/postgres"),
    containsPooler: sanitized.includes("pooler.supabase.com"),
    containsRef: sanitized.includes("elyspjsyconovzczmzhm"),
  };

  let parsedInfo: Record<string, unknown> = {};
  let dbTest: Record<string, unknown> = {};

  try {
    const parsed = new URL(sanitized);
    parsedInfo = {
      urlParse: "OK",
      protocol: parsed.protocol,
      username: parsed.username,
      host: parsed.hostname,
      port: parsed.port,
      database: parsed.pathname,
      passwordSet: parsed.password.length > 0,
    };

    try {
      const sql = postgres({
        host: parsed.hostname,
        port: parseInt(parsed.port) || 6543,
        database: parsed.pathname.replace(/^\//, ""),
        username: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        ssl: { rejectUnauthorized: false },
        max: 1,
        prepare: false,
      });
      const rows = await sql.unsafe(`SELECT 1 as ok`);
      await sql.end();
      dbTest = { connexion: "OK", result: rows[0]?.ok };
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string };
      dbTest = { connexion: "ECHEC", error: err?.message, code: err?.code };
    }
  } catch {
    parsedInfo = { urlParse: "ECHEC (Invalid URL)" };
  }

  return NextResponse.json({ structure, parsedInfo, dbTest });
}
