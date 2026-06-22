// Schéma de données — reflète le schéma relationnel décrit dans la spec.
// Stocké ici en JSON (fichier src/db/data.json) pour le MVP local, sans
// dépendance native. Migration vers Postgres/Supabase : il suffit de
// recréer ces tables avec les mêmes colonnes (cf. spec-app-courses-repas.md).

export type Location = "frigo" | "placard" | "congelateur";

export interface Ingredient {
  id: string;
  canonicalName: string; // ex: "tomate"
  defaultUnit: string; // ex: "g", "piece", "L"
  aliases: string[]; // ex: ["tomates", "tomate cerise"]
}

export interface InventoryItem {
  id: string;
  ingredientId: string;
  location: Location;
  quantity: number;
  unit: string;
  expiryDate: string | null; // YYYY-MM-DD
  updatedAt: string;
}

export interface Recipe {
  id: string;
  title: string;
  rawInput: string;
  createdAt: string;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
}

export interface MealPlanEntry {
  id: string;
  recipeId: string;
  plannedDate: string; // YYYY-MM-DD
  mealSlot: "breakfast" | "lunch" | "dinner";
}

export type ShoppingItemStatus = "to_buy" | "bought";
export type ShoppingItemSource = "auto" | "manual";

export interface ShoppingListItem {
  id: string;
  ingredientId: string;
  quantityNeeded: number;
  unit: string;
  status: ShoppingItemStatus;
  source: ShoppingItemSource;
  updatedAt: string;
}

export interface Database {
  ingredients: Ingredient[];
  inventoryItems: InventoryItem[];
  recipes: Recipe[];
  recipeIngredients: RecipeIngredient[];
  mealPlanEntries: MealPlanEntry[];
  shoppingListItems: ShoppingListItem[];
}
