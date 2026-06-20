import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/db/store";

// Supprime un item ajouté manuellement à la liste de courses
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await readDB();
  const before = db.shoppingListItems.length;
  db.shoppingListItems = db.shoppingListItems.filter((i) => i.id !== params.id);
  if (db.shoppingListItems.length === before) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  await writeDB(db);
  return NextResponse.json({ ok: true });
}
