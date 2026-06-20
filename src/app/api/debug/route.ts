import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ error: "DATABASE_URL non défini" });
  }

  // Affiche l'URL masquée (mot de passe caché) pour vérification
  let maskedUrl = "(impossible de parser)";
  let host = "";
  let port = "";
  let username = "";
  let database = "";
  try {
    const parsed = new URL(url);
    host = parsed.hostname;
    port = parsed.port;
    username = decodeURIComponent(parsed.username);
    database = parsed.pathname.replace(/^\//, "");
    maskedUrl = `${parsed.protocol}//${parsed.username}:****@${parsed.hostname}:${parsed.port}${parsed.pathname}`;
  } catch (e: unknown) {
    return NextResponse.json({ error: "URL invalide", detail: String(e), raw_length: url.length });
  }

  // Tentative de connexion
  try {
    const postgres = (await import("postgres")).default;
    const parsed = new URL(url);
    const sql = postgres({
      host,
      port: parseInt(port) || 6543,
      database,
      username,
      password: decodeURIComponent(parsed.password),
      ssl: { rejectUnauthorized: false },
      max: 1,
      connect_timeout: 10,
    });
    const result = await sql`SELECT NOW() as now`;
    await sql.end();
    return NextResponse.json({ ok: true, time: result[0].now, maskedUrl });
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string; stack?: string };
    return NextResponse.json({
      ok: false,
      maskedUrl,
      error: err?.message ?? String(e),
      code: err?.code,
      stack: err?.stack?.split("\n").slice(0, 5),
    });
  }
}
