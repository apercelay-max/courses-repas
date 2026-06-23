import type { Database } from "@/db/types";
import { toComparable, fromComparable } from "./units";
import { getIngredientName } from "./match";

export interface ShoppingListEntry {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  inStock: number;      // quantité déjà en stock (même si insuffisant)
  inStockUnit: string;  // unité pour inStock
  source: "auto" | "manual";
  manualItemId?: string;
}

export interface ReverseListEntry {
  ingredientId: string;
  name: string;
  needed: { quantity: number; unit: string };
  inStock: { quantity: number; unit: string };
}

export interface ShoppingLists {
  toBuy: ShoppingListEntry[];
  reverse: ReverseListEntry[];
}

export function computeShoppingLists(db: Database, fromDate: string): ShoppingLists {
  const needed = new Map<string, number>();

  const upcomingEntries = db.mealPlanEntries.filter((e) => e.plannedDate >= fromDate);
  for (const entry of upcomingEntries) {
    const recipeIngs = db.recipeIngredients.filter((ri) => ri.recipeId === entry.recipeId);
    for (const ri of recipeIngs) {
      const { key, value } = toComparable(ri.quantity, ri.unit);
      const mapKey = `${ri.ingredientId}__${key}`;
      needed.set(mapKey, (needed.get(mapKey) ?? 0) + value);
    }
  }

  const stock = new Map<string, number>();
  for (const item of db.inventoryItems) {
    const { key, value } = toComparable(item.quantity, item.unit);
    const mapKey = `${item.ingredientId}__${key}`;
    stock.set(mapKey, (stock.get(mapKey) ?? 0) + value);
  }

  const toBuy: ShoppingListEntry[] = [];
  const reverse: ReverseListEntry[] = [];

  for (const [mapKey, neededValue] of needed.entries()) {
    const [ingredientId, comparableKey] = mapKey.split("__");
    const haveValue = stock.get(mapKey) ?? 0;
    const name = getIngredientName(db, ingredientId);
    const missing = neededValue - haveValue;

    if (missing > 0) {
      const { quantity, unit } = fromComparable(comparableKey, missing);
      const inStockDisplay = fromComparable(comparableKey, haveValue);
      toBuy.push({
        ingredientId, name, quantity, unit,
        inStock: inStockDisplay.quantity,
        inStockUnit: inStockDisplay.unit,
        source: "auto",
      });
    } else {
      const neededDisplay = fromComparable(comparableKey, neededValue);
      const haveDisplay = fromComparable(comparableKey, haveValue);
      reverse.push({ ingredientId, name, needed: neededDisplay, inStock: haveDisplay });
    }
  }

  // Ajouts manuels
  for (const item of db.shoppingListItems) {
    if (item.status !== "to_buy") continue;
    toBuy.push({
      ingredientId: item.ingredientId,
      name: getIngredientName(db, item.ingredientId),
      quantity: item.quantityNeeded,
      unit: item.unit,
      inStock: 0,
      inStockUnit: item.unit,
      source: "manual",
      manualItemId: item.id,
    });
  }

  toBuy.sort((a, b) => a.name.localeCompare(b.name));
  reverse.sort((a, b) => a.name.localeCompare(b.name));

  return { toBuy, reverse };
}
