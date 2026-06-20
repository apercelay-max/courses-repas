import { NextResponse } from "next/server";
import { readDB } from "@/db/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await readDB();
    return NextResponse.json({
      ok: true,
      ingredients: db.ingredients.length,
      inventoryItems: db.inventoryItems.length,
      recipes: db.recipes.length,
      mealPlanEntries: db.mealPlanEntries.length,
      shoppingListItems: db.shoppingListItems.length,
    });
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string; stack?: string };
    return NextResponse.json({
      ok: false,
      error: err?.message ?? String(e),
      code: err?.code,
      stack: err?.stack?.split("\n").slice(0, 8),
    });
  }
}
