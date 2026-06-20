import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, genId, nowIso } from "@/db/store";
import { extractIngredients } from "@/lib/recipeExtractor";
import { findOrCreateIngredient, getIngredientName } from "@/lib/match";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readDB();
  const recipes = db.recipes.map((r) => ({
    ...r,
    ingredients: db.recipeIngredients
      .filter((ri) => ri.recipeId === r.id)
      .map((ri) => ({ ...ri, name: getIngredientName(db, ri.ingredientId) })),
  }));
  return NextResponse.json({ recipes });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, rawInput } = body as { title: string; rawInput: string };
  if (!rawInput || !rawInput.trim()) {
    return NextResponse.json({ error: "rawInput requis" }, { status: 400 });
  }

  const db = await readDB();

  const recipe = {
    id: genId("rec"),
    title: title?.trim() || rawInput.trim().slice(0, 60),
    rawInput: rawInput.trim(),
    createdAt: nowIso(),
  };
  db.recipes.push(recipe);

  // Analyse IA (ou mock) : extrait {name, quantity, unit}[] depuis le texte
  const extracted = await extractIngredients(rawInput);

  const recipeIngredients = extracted.map((e) => {
    const ingredient = findOrCreateIngredient(db, e.name, e.unit);
    const ri = {
      id: genId("ri"),
      recipeId: recipe.id,
      ingredientId: ingredient.id,
      quantity: e.quantity,
      unit: e.unit,
    };
    db.recipeIngredients.push(ri);
    return { ...ri, name: ingredient.canonicalName };
  });

  await writeDB(db);

  return NextResponse.json({ recipe: { ...recipe, ingredients: recipeIngredients } }, { status: 201 });
}
