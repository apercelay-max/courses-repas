import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, genId } from "@/db/store";
import { findOrCreateIngredient, getIngredientName } from "@/lib/match";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await readDB();
  const recipe = db.recipes.find((r) => r.id === params.id);
  if (!recipe) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const ingredients = db.recipeIngredients
    .filter((ri) => ri.recipeId === recipe.id)
    .map((ri) => ({ ...ri, name: getIngredientName(db, ri.ingredientId) }));
  return NextResponse.json({ recipe: { ...recipe, ingredients } });
}

// Remplace entièrement la liste d'ingrédients d'une recette (correction manuelle
// après extraction IA imprécise).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { ingredients } = body as { ingredients: Array<{ name: string; quantity: number; unit: string }> };

  const db = await readDB();
  const recipe = db.recipes.find((r) => r.id === params.id);
  if (!recipe) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  db.recipeIngredients = db.recipeIngredients.filter((ri) => ri.recipeId !== recipe.id);

  const newOnes = ingredients.map((e) => {
    const ingredient = findOrCreateIngredient(db, e.name, e.unit);
    const ri = { id: genId("ri"), recipeId: recipe.id, ingredientId: ingredient.id, quantity: e.quantity, unit: e.unit };
    db.recipeIngredients.push(ri);
    return { ...ri, name: ingredient.canonicalName };
  });

  await writeDB(db);
  return NextResponse.json({ recipe: { ...recipe, ingredients: newOnes } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await readDB();
  const before = db.recipes.length;
  db.recipes = db.recipes.filter((r) => r.id !== params.id);
  if (db.recipes.length === before) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  db.recipeIngredients = db.recipeIngredients.filter((ri) => ri.recipeId !== params.id);
  db.mealPlanEntries = db.mealPlanEntries.filter((m) => m.recipeId !== params.id);

  await writeDB(db);
  return NextResponse.json({ ok: true });
}
