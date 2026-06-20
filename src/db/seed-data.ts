import type { Database, Ingredient } from "./types";

// Référentiel d'ingrédients de base, pré-rempli pour que l'appli soit
// utilisable immédiatement. canonicalName = nom normalisé (singulier,
// minuscules, sans accent géré dans lib/match.ts). aliases = variantes
// fréquentes rencontrées dans les recettes en texte libre.
const base: Array<[string, string, string, string[]]> = [
  ["ing_pates", "pâte", "g", ["pâtes", "pâtes sèches", "spaghetti", "spaghettis"]],
  ["ing_riz", "riz", "g", ["riz basmati", "riz blanc"]],
  ["ing_viande_hachee", "viande hachée", "g", ["bœuf haché", "viande hachée de bœuf", "steak haché"]],
  ["ing_poulet", "poulet", "g", ["blanc de poulet", "filet de poulet", "escalope de poulet"]],
  ["ing_oeuf", "œuf", "piece", ["œufs", "oeuf", "oeufs"]],
  ["ing_lait", "lait", "ml", ["lait demi-écrémé", "lait entier"]],
  ["ing_beurre", "beurre", "g", []],
  ["ing_farine", "farine", "g", ["farine de blé", "farine type 45"]],
  ["ing_sucre", "sucre", "g", ["sucre blanc", "sucre en poudre"]],
  ["ing_sel", "sel", "g", []],
  ["ing_poivre", "poivre", "g", []],
  ["ing_huile_olive", "huile d'olive", "ml", ["huile d olive"]],
  ["ing_tomate", "tomate", "piece", ["tomates", "tomate cerise", "tomates cerises"]],
  ["ing_tomate_concassee", "tomate concassée", "g", ["tomates concassées", "coulis de tomate", "purée de tomate"]],
  ["ing_oignon", "oignon", "piece", ["oignons", "oignon jaune"]],
  ["ing_ail", "ail", "gousse", ["gousse d'ail", "gousses d'ail"]],
  ["ing_carotte", "carotte", "piece", ["carottes"]],
  ["ing_pomme_de_terre", "pomme de terre", "piece", ["pommes de terre", "patate", "patates"]],
  ["ing_courgette", "courgette", "piece", ["courgettes"]],
  ["ing_poivron", "poivron", "piece", ["poivrons", "poivron rouge", "poivron vert"]],
  ["ing_champignon", "champignon", "g", ["champignons", "champignons de paris"]],
  ["ing_salade", "salade verte", "piece", ["laitue", "salade"]],
  ["ing_fromage_rape", "fromage râpé", "g", ["gruyère râpé", "emmental râpé"]],
  ["ing_parmesan", "parmesan", "g", []],
  ["ing_creme_fraiche", "crème fraîche", "ml", ["crème liquide", "crème épaisse"]],
  ["ing_yaourt", "yaourt", "piece", ["yaourts", "yaourt nature"]],
  ["ing_jambon", "jambon", "tranche", ["tranches de jambon", "jambon blanc"]],
  ["ing_saumon", "saumon", "g", ["pavé de saumon", "filet de saumon"]],
  ["ing_thon", "thon", "boite", ["thon en boîte", "boîte de thon"]],
  ["ing_pain", "pain", "piece", ["baguette", "pain de mie"]],
  ["ing_citron", "citron", "piece", ["citrons", "jus de citron"]],
  ["ing_basilic", "basilic", "g", ["basilic frais"]],
  ["ing_persil", "persil", "g", ["persil frais"]],
  ["ing_mozzarella", "mozzarella", "g", ["boule de mozzarella"]],
  ["ing_pate_a_pizza", "pâte à pizza", "piece", ["pate à pizza", "pâte à tarte"]],
  ["ing_avocat", "avocat", "piece", ["avocats"]],
  ["ing_pomme", "pomme", "piece", ["pommes"]],
  ["ing_banane", "banane", "piece", ["bananes"]],
  ["ing_chocolat", "chocolat", "g", ["chocolat noir", "chocolat pâtissier"]],
  ["ing_lardons", "lardons", "g", ["lardons fumés"]],
  ["ing_bouillon_cube", "bouillon cube", "piece", ["cube de bouillon", "bouillon de légumes"]],
];

const ingredients: Ingredient[] = base.map(([id, canonicalName, defaultUnit, aliases]) => ({
  id,
  canonicalName,
  defaultUnit,
  aliases,
}));

const today = new Date();
function isoDaysFromNow(days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const initialData: Database = {
  ingredients,
  inventoryItems: [
    { id: "inv_1", ingredientId: "ing_pates", location: "placard", quantity: 500, unit: "g", expiryDate: isoDaysFromNow(120), updatedAt: new Date().toISOString() },
    { id: "inv_2", ingredientId: "ing_riz", location: "placard", quantity: 1000, unit: "g", expiryDate: isoDaysFromNow(200), updatedAt: new Date().toISOString() },
    { id: "inv_3", ingredientId: "ing_oeuf", location: "frigo", quantity: 6, unit: "piece", expiryDate: isoDaysFromNow(10), updatedAt: new Date().toISOString() },
    { id: "inv_4", ingredientId: "ing_lait", location: "frigo", quantity: 1000, unit: "ml", expiryDate: isoDaysFromNow(7), updatedAt: new Date().toISOString() },
    { id: "inv_5", ingredientId: "ing_oignon", location: "placard", quantity: 4, unit: "piece", expiryDate: null, updatedAt: new Date().toISOString() },
    { id: "inv_6", ingredientId: "ing_ail", location: "placard", quantity: 6, unit: "gousse", expiryDate: null, updatedAt: new Date().toISOString() },
    { id: "inv_7", ingredientId: "ing_huile_olive", location: "placard", quantity: 500, unit: "ml", expiryDate: isoDaysFromNow(300), updatedAt: new Date().toISOString() },
    { id: "inv_8", ingredientId: "ing_sel", location: "placard", quantity: 1000, unit: "g", expiryDate: null, updatedAt: new Date().toISOString() },
    { id: "inv_9", ingredientId: "ing_tomate_concassee", location: "placard", quantity: 400, unit: "g", expiryDate: isoDaysFromNow(180), updatedAt: new Date().toISOString() },
    { id: "inv_10", ingredientId: "ing_fromage_rape", location: "frigo", quantity: 100, unit: "g", expiryDate: isoDaysFromNow(5), updatedAt: new Date().toISOString() },
  ],
  recipes: [],
  recipeIngredients: [],
  mealPlanEntries: [],
  shoppingListItems: [],
};
