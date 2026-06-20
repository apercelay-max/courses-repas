import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  const version = "v9-raw";
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ version, error: "no DATABASE_URL" });
  try {
    const parsed = new URL(url);
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

    // Vérif type JSONB
    const typeRows = await sql.unsafe(
      `SELECT jsonb_typeof(data) as jtype FROM app_state WHERE id = 1`
    );
    const jtype = typeRows[0]?.jtype ?? "no row";

    // Récupère les 300 premiers chars bruts
    const rawRows = await sql.unsafe(
      `SELECT left(data::text, 300) as raw FROM app_state WHERE id = 1`
    );
    const raw300 = rawRows[0]?.raw ?? "no row";

    // Essai readDB avec JSON.parse
    const dataRows = await sql.unsafe(
      `SELECT data::text as data_json FROM app_state WHERE id = 1`
    );
    const dataJson = dataRows[0]?.data_json as string;
    const parsed2 = JSON.parse(dataJson);
    const parsedType = typeof parsed2;
    const parsedKeys = parsedType === "object" && parsed2 !== null
      ? Object.keys(parsed2).slice(0, 10)
      : parsedType === "string"
      ? ["IS STRING: " + parsed2.slice(0, 100)]
      : ["unexpected: " + parsedType];

    await sql.end();
    return NextResponse.json({ version, jtype, raw300, parsedType, parsedKeys });
  } catch (e: unknown) {
    const err = e as { message?: string; stack?: string };
    return NextResponse.json({
      version,
      ok: false,
      error: err?.message ?? String(e),
      stack: err?.stack?.split("\n").slice(0, 5),
    });
  }
}
