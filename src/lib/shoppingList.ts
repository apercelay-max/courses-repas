import type { Database } from "@/db/types";
import { toComparable, fromComparable } from "./units";
import { getIngredientName } from "./match";

export interface ShoppingListEntry {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
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

/**
 * Coeur de l'app : compare les ingrédients requis par les repas planifiés
 * (à venir) avec l'inventaire (frigo + placards), et détermine :
 * - toBuy   : ce qui manque (ou est insuffisant) -> à acheter
 * - reverse : ce qui est déjà couvert par le stock -> pas besoin d'acheter
 *
 * Les unités sont regroupées via toComparable() (g, ml, ou "count:<unite>"),
 * donc 200g + 0.3kg sont bien additionnés ensemble.
 */
export function computeShoppingLists(db: Database, fromDate: string): ShoppingLists {
  // 1. Besoins agrégés par (ingredientId, clé d'unité)
  const needed = new Map<string, number>(); // clé = `${ingredientId}__${comparableKey}`

  const upcomingEntries = db.mealPlanEntries.filter((e) => e.plannedDate >= fromDate);
  for (const entry of upcomingEntries) {
    const recipeIngs = db.recipeIngredients.filter((ri) => ri.recipeId === entry.recipeId);
    for (const ri of recipeIngs) {
      const { key, value } = toComparable(ri.quantity, ri.unit);
      const mapKey = `${ri.ingredientId}__${key}`;
      needed.set(mapKey, (needed.get(mapKey) ?? 0) + value);
    }
  }

  // 2. Stock agrégé par (ingredientId, clé d'unité)
  const stock = new Map<string, number>();
  for (const item of db.inventoryItems) {
    const { key, value } = toComparable(item.quantity, item.unit);
    const mapKey = `${item.ingredientId}__${key}`;
    stock.set(mapKey, (stock.get(mapKey) ?? 0) + value);
  }

  // 3. Comparaison
  const toBuy: ShoppingListEntry[] = [];
  const reverse: ReverseListEntry[] = [];

  for (const [mapKey, neededValue] of needed.entries()) {
    const [ingredientId, comparableKey] = mapKey.split("__");
    const haveValue = stock.get(mapKey) ?? 0;
    const name = getIngredientName(db, ingredientId);
    const missing = neededValue - haveValue;

    if (missing > 0) {
      const { quantity, unit } = fromComparable(comparableKey, missing);
      toBuy.push({ ingredientId, name, quantity, unit, source: "auto" });
    } else {
      const neededDisplay = fromComparable(comparableKey, neededValue);
      const haveDisplay = fromComparable(comparableKey, haveValue);
      reverse.push({
        ingredientId,
        name,
        needed: neededDisplay,
        inStock: haveDisplay,
      });
    }
  }

  // 4. Ajouts manuels (jamais touchés par le calcul auto)
  for (const item of db.shoppingListItems) {
    if (item.status !== "to_buy") continue;
    toBuy.push({
      ingredientId: item.ingredientId,
      name: getIngredientName(db, item.ingredientId),
      quantity: item.quantityNeeded,
      unit: item.unit,
      source: "manual",
      manualItemId: item.id,
    });
  }

  toBuy.sort((a, b) => a.name.localeCompare(b.name));
  reverse.sort((a, b) => a.name.localeCompare(b.name));

  return { toBuy, reverse };
}
