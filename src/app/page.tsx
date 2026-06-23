import HomeClient from "@/components/HomeClient";
import { readDB } from "@/db/store";
import { computeShoppingLists } from "@/lib/shoppingList";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = await readDB();
  const today = new Date().toISOString().slice(0, 10);
  const { toBuy, reverse } = computeShoppingLists(db, today);

  const frigoCount = db.inventoryItems.filter((i) => i.location === "frigo").length;
  const placardCount = db.inventoryItems.filter((i) => i.location === "placard").length;
  const congelateurCount = db.inventoryItems.filter((i) => i.location === "congelateur").length;
  const upcomingMeals = db.mealPlanEntries.filter((e) => e.plannedDate >= today).length;

  const cards = [
    {
      id: "inventaire",
      href: "/inventaire",
      title: "Inventaire",
      value: `${frigoCount + placardCount + congelateurCount}`,
      sub: `${frigoCount} frigo · ${placardCount} placard · ${congelateurCount} congél.`,
      emoji: "🧊",
    },
    {
      id: "repas",
      href: "/calendrier",
      title: "Repas",
      value: `${upcomingMeals}`,
      sub: "repas à venir",
      emoji: "📅",
    },
    {
      id: "acheter",
      href: "/courses",
      title: "Courses",
      value: `${toBuy.length}`,
      sub: "ingrédients à acheter",
      emoji: "🛒",
    },
    {
      id: "stock",
      href: "/courses",
      title: "Déjà en stock",
      value: `${reverse.length}`,
      sub: "ingrédients couverts",
      emoji: "✅",
    },
  ];

  // Favoris : ingrédients marqués ⭐ avec leur stock actuel
  const ingredientMap = new Map(db.ingredients.map((i) => [i.id, i.canonicalName]));
  const favorites = db.inventoryItems
    .filter((i) => i.isFavorite)
    .map((i) => ({
      id: i.id,
      ingredientId: i.ingredientId,
      ingredientName: ingredientMap.get(i.ingredientId) ?? i.ingredientId,
      location: i.location as "frigo" | "placard" | "congelateur",
      quantity: i.quantity,
      unit: i.unit,
    }));

  return <HomeClient cards={cards} favorites={favorites} />;
}
