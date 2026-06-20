import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, genId } from "@/db/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const db = await readDB();
  let entries = db.mealPlanEntries;
  if (from) entries = entries.filter((e) => e.plannedDate >= from);
  if (to) entries = entries.filter((e) => e.plannedDate <= to);

  const withRecipe = entries.map((e) => {
    const recipe = db.recipes.find((r) => r.id === e.recipeId);
    return { ...e, recipeTitle: recipe?.title ?? "(recette supprimée)" };
  });

  return NextResponse.json({ entries: withRecipe });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { recipeId, plannedDate, mealSlot } = body as {
    recipeId: string;
    plannedDate: string;
    mealSlot?: "breakfast" | "lunch" | "dinner";
  };

  if (!recipeId || !plannedDate) {
    return NextResponse.json({ error: "recipeId et plannedDate requis" }, { status: 400 });
  }

  const db = await readDB();
  if (!db.recipes.find((r) => r.id === recipeId)) {
    return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
  }

  const entry = {
    id: genId("mp"),
    recipeId,
    plannedDate,
    mealSlot: mealSlot ?? "dinner",
  };
  db.mealPlanEntries.push(entry);
  await writeDB(db);

  const recipe = db.recipes.find((r) => r.id === recipeId);
  return NextResponse.json({ entry: { ...entry, recipeTitle: recipe?.title } }, { status: 201 });
}
