import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, genId, nowIso } from "@/db/store";
import { findOrCreateIngredient, getIngredientName } from "@/lib/match";
import type { Location } from "@/db/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readDB();
  const items = db.inventoryItems.map((item) => ({
    ...item,
    ingredientName: getIngredientName(db, item.ingredientId),
  }));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ingredientName, location, quantity, unit, expiryDate } = body as {
    ingredientName: string;
    location: Location;
    quantity: number;
    unit: string;
    expiryDate?: string | null;
  };

  if (!ingredientName || !location || quantity == null || !unit) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }
  if (location !== "frigo" && location !== "placard") {
    return NextResponse.json({ error: "location doit être 'frigo' ou 'placard'" }, { status: 400 });
  }

  const db = await readDB();
  const ingredient = findOrCreateIngredient(db, ingredientName, unit);

  const item = {
    id: genId("inv"),
    ingredientId: ingredient.id,
    location,
    quantity: Number(quantity),
    unit,
    expiryDate: expiryDate ?? null,
    updatedAt: nowIso(),
  };
  db.inventoryItems.push(item);
  await writeDB(db);

  return NextResponse.json({ item: { ...item, ingredientName: ingredient.canonicalName } }, { status: 201 });
}
