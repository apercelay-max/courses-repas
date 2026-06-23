import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, genId, nowIso } from "@/db/store";
import { computeShoppingLists } from "@/lib/shoppingList";
import { findOrCreateIngredient } from "@/lib/match";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);

  const db = await readDB();
  const lists = computeShoppingLists(db, from);
  return NextResponse.json(lists);
}

// Ajout manuel à la liste de courses (toujours conservé tel quel par le recalcul auto)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ingredientName, unit } = body as { ingredientName: string; quantity?: number; unit: string };
  const quantity = body.quantity ?? 1;
  if (!ingredientName || !unit) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const db = await readDB();
  const ingredient = findOrCreateIngredient(db, ingredientName, unit);

  const item = {
    id: genId("sli"),
    ingredientId: ingredient.id,
    quantityNeeded: Number(quantity),
    unit,
    status: "to_buy" as const,
    source: "manual" as const,
    updatedAt: nowIso(),
  };
  db.shoppingListItems.push(item);
  await writeDB(db);

  return NextResponse.json({ item: { ...item, name: ingredient.canonicalName } }, { status: 201 });
}
