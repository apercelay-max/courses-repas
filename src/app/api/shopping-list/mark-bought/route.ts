import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, genId, nowIso } from "@/db/store";

// "J'ai acheté ça" -> ajoute la quantité à l'inventaire (placard par défaut)
// et, si c'était un ajout manuel, le retire de la liste de courses.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ingredientId, quantity, unit, location, manualItemId } = body as {
    ingredientId: string;
    quantity: number;
    unit: string;
    location?: "frigo" | "placard" | "congelateur";
    manualItemId?: string;
  };

  if (!ingredientId || quantity == null || !unit) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const db = await readDB();

  db.inventoryItems.push({
    id: genId("inv"),
    ingredientId,
    location: location ?? "placard",
    quantity: Number(quantity),
    unit,
    expiryDate: null,
    updatedAt: nowIso(),
  });

  if (manualItemId) {
    db.shoppingListItems = db.shoppingListItems.filter((i) => i.id !== manualItemId);
  }

  await writeDB(db);
  return NextResponse.json({ ok: true });
}
