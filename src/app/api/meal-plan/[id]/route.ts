import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/db/store";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await readDB();
  const before = db.mealPlanEntries.length;
  db.mealPlanEntries = db.mealPlanEntries.filter((e) => e.id !== params.id);
  if (db.mealPlanEntries.length === before) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  await writeDB(db);
  return NextResponse.json({ ok: true });
}
