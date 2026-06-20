import type { Database, Ingredient } from "@/db/types";
import { genId } from "@/db/store";

/**
 * Normalise un nom d'ingrédient pour le matching :
 * minuscules, accents retirés, articles retirés, pluriel simple -> singulier.
 * Ex: "Tomates cerises" -> "tomate cerise" (via alias) ou comparaison directe.
 */
export function normalizeIngredientName(name: string): string {
  let s = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .trim();

  // retire les articles/quantifieurs en tête
  s = s.replace(/^(de la |de l'|du |des |de |d'|la |le |les |un |une )/g, "");

  // pluriel simple : retire un "s" final (sauf mots très courts)
  if (s.endsWith("s") && s.length > 3 && !s.endsWith("ss")) {
    s = s.slice(0, -1);
  }

  return s.trim();
}

/**
 * Cherche un ingrédient existant par nom (canonicalName ou alias),
 * sinon en crée un nouveau et l'ajoute à db.ingredients (mutation en place).
 * Retourne l'ingrédient trouvé/créé.
 */
export function findOrCreateIngredient(
  db: Database,
  rawName: string,
  defaultUnit = "piece"
): Ingredient {
  const normalized = normalizeIngredientName(rawName);

  for (const ing of db.ingredients) {
    if (normalizeIngredientName(ing.canonicalName) === normalized) return ing;
    for (const alias of ing.aliases) {
      if (normalizeIngredientName(alias) === normalized) return ing;
    }
  }

  // pas trouvé -> on crée une nouvelle entrée dans le référentiel
  const created: Ingredient = {
    id: genId("ing"),
    canonicalName: normalized,
    defaultUnit,
    aliases: rawName.trim() !== normalized ? [rawName.trim()] : [],
  };
  db.ingredients.push(created);
  return created;
}

export function getIngredientName(db: Database, ingredientId: string): string {
  const ing = db.ingredients.find((i) => i.id === ingredientId);
  return ing ? ing.canonicalName : "(ingrédient inconnu)";
}
