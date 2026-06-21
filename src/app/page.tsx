import Link from "next/link";
import HomeVoiceButton from "@/components/HomeVoiceButton";
import { readDB } from "@/db/store";
import { computeShoppingLists } from "@/lib/shoppingList";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = await readDB();
  const today = new Date().toISOString().slice(0, 10);
  const { toBuy, reverse } = computeShoppingLists(db, today);

  const frigoCount = db.inventoryItems.filter((i) => i.location === "frigo").length;
  const placardCount = db.inventoryItems.filter((i) => i.location === "placard").length;
  const upcomingMeals = db.mealPlanEntries.filter((e) => e.plannedDate >= today).length;

  const cards = [
    { href: "/inventaire", title: "Inventaire", value: `${frigoCount + placardCount}`, sub: `${frigoCount} au frigo, ${placardCount} au placard`, emoji: "🧊" },
    { href: "/calendrier", title: "Repas planifiés", value: `${upcomingMeals}`, sub: "à venir", emoji: "📅" },
    { href: "/courses", title: "À acheter", value: `${toBuy.length}`, sub: "ingrédients manquants", emoji: "🛒" },
    { href: "/courses", title: "Déjà en stock", value: `${reverse.length}`, sub: "ingrédients couverts pour les repas planifiés", emoji: "✅" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bienvenue 👋</h1>
        <p className="text-slate-600 mt-1">
          Gère ton frigo et tes placards, planifie tes repas, et laisse l'appli calculer
          automatiquement ce qu'il te manque pour faire les courses.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="text-2xl">{c.emoji}</div>
            <div className="text-3xl font-bold mt-2">{c.value}</div>
            <div className="font-medium">{c.title}</div>
            <div className="text-sm text-slate-500">{c.sub}</div>
          </Link>
        ))}
      </div>

      <HomeVoiceButton />

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="font-semibold mb-2">Comment ça marche</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm text-slate-700">
          <li>Renseigne ce que tu as dans le <Link href="/inventaire" className="text-blue-600 underline">Frigo et les Placards</Link>.</li>
          <li>Planifie tes repas dans le <Link href="/calendrier" className="text-blue-600 underline">Calendrier</Link> (texte libre, l'IA détecte les ingrédients).</li>
          <li>Consulte la <Link href="/courses" className="text-blue-600 underline">Liste de courses</Link> : ce qui manque vraiment, et ce que tu as déjà.</li>
        </ol>
      </div>
    </div>
  );
}
