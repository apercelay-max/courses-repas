import { NextResponse } from "next/server";
import { readDB } from "@/db/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const version = "v8-unsafe";
  try {
    const db = await readDB();
    return NextResponse.json({
      version,
      ok: true,
      keys: Object.keys(db),
      counts: {
        ingredients: db.ingredients?.length ?? "undefined",
        inventoryItems: db.inventoryItems?.length ?? "undefined",
        recipes: db.recipes?.length ?? "undefined",
        recipeIngredients: db.recipeIngredients?.length ?? "undefined",
        mealPlanEntries: db.mealPlanEntries?.length ?? "undefined",
        shoppingListItems: db.shoppingListItems?.length ?? "undefined",
      },
    });
  } catch (e: unknown) {
    const err = e as { message?: string; stack?: string };
    return NextResponse.json({
      version,
      ok: false,
      error: err?.message ?? String(e),
      stack: err?.stack?.split("\n").slice(0, 6),
    });
  }
}
