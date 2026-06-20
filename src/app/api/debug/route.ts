import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ error: "DATABASE_URL non défini" });

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
    });

    // Check if table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'app_state'
      ) as exists
    `;
    const tableExists = tableCheck[0].exists;

    // Count rows
    let rowCount = 0;
    let dataKeys: string[] = [];
    if (tableExists) {
      const countRows = await sql`SELECT COUNT(*) as cnt FROM app_state`;
      rowCount = parseInt(countRows[0].cnt);
      if (rowCount > 0) {
        const sample = await sql`SELECT jsonb_object_keys(data) as k FROM app_state WHERE id = 1 LIMIT 20`;
        dataKeys = sample.map((r) => r.k as string);
      }
    }

    await sql.end();
    return NextResponse.json({ ok: true, tableExists, rowCount, dataKeys });
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string; stack?: string };
    return NextResponse.json({
      ok: false,
      error: err?.message ?? String(e),
      code: err?.code,
      stack: err?.stack?.split("\n").slice(0, 5),
    });
  }
}
