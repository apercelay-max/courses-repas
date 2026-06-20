import { NextResponse } from "next/server";
import { readDB } from "@/db/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readDB();
  const ingredients = db.ingredients
    .map((i) => ({ id: i.id, name: i.canonicalName, defaultUnit: i.defaultUnit }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ ingredients });
}
