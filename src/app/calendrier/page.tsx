"use client";

import { useEffect, useMemo, useState } from "react";

interface MealEntry {
  id: string;
  recipeId: string;
  plannedDate: string;
  mealSlot: string;
  recipeTitle: string;
}

interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface Recipe {
  id: string;
  title: string;
  rawInput: string;
  ingredients: RecipeIngredient[];
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function CalendrierPage() {
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(toIso(new Date()));

  const [title, setTitle] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [lastExtracted, setLastExtracted] = useState<RecipeIngredient[] | null>(null);
  const [existingRecipeId, setExistingRecipeId] = useState("");
  const [busy, setBusy] = useState(false);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const { gridStart, gridEnd } = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    // lundi = 0 ... dimanche = 6
    const firstOffset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - firstOffset);
    const lastOffset = (last.getDay() + 6) % 7;
    const end = new Date(last);
    end.setDate(last.getDate() + (6 - lastOffset));
    return { gridStart: start, gridEnd: end };
  }, [year, month]);

  async function load() {
    const [mpRes, recRes] = await Promise.all([
      fetch(`/api/meal-plan?from=${toIso(gridStart)}&to=${toIso(gridEnd)}`),
      fetch("/api/recipes"),
    ]);
    const mpData = await mpRes.json();
    const recData = await recRes.json();
    setEntries(mpData.entries);
    setRecipes(recData.recipes);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridStart.getTime(), gridEnd.getTime()]);

  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const entriesForSelected = entries.filter((e) => e.plannedDate === selectedDate);
  const todayIso = toIso(new Date());

  async function planNewRecipe(e: React.FormEvent) {
    e.preventDefault();
    if (!rawInput.trim()) return;
    setBusy(true);
    try {
      const recRes = await fetch("/api/recipes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, rawInput }),
      });
      const recData = await recRes.json();
      const recipe: Recipe = recData.recipe;
      setLastExtracted(recipe.ingredients);

      await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipeId: recipe.id, plannedDate: selectedDate }),
      });

      setTitle("");
      setRawInput("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function planExistingRecipe(e: React.FormEvent) {
    e.preventDefault();
    if (!existingRecipeId) return;
    await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipeId: existingRecipeId, plannedDate: selectedDate }),
    });
    setExistingRecipeId("");
    await load();
  }

  async function removeEntry(id: string) {
    await fetch(`/api/meal-plan/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calendrier</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setMonthDate(new Date(year, month - 1, 1))}
            className="px-2 py-1 rounded hover:bg-slate-100"
          >
            ←
          </button>
          <div className="font-semibold">{MONTHS[month]} {year}</div>
          <button
            onClick={() => setMonthDate(new Date(year, month + 1, 1))}
            className="px-2 py-1 rounded hover:bg-slate-100"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs text-slate-400 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center">{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const iso = toIso(d);
            const inMonth = d.getMonth() === month;
            const dayEntries = entries.filter((e) => e.plannedDate === iso);
            const isSelected = iso === selectedDate;
            const isToday = iso === todayIso;
            return (
              <button
                key={iso}
                onClick={() => setSelectedDate(iso)}
                className={`min-h-[70px] rounded-md border p-1 text-left text-xs transition-colors ${
                  isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-100"
                } ${inMonth ? "bg-white" : "bg-slate-50 text-slate-400"} hover:border-blue-300`}
              >
                <div className={`font-medium ${isToday ? "text-blue-600" : ""}`}>{d.getDate()}</div>
                <div className="space-y-0.5 mt-1">
                  {dayEntries.slice(0, 2).map((e) => (
                    <div key={e.id} className="truncate rounded bg-blue-50 text-blue-700 px-1">
                      {e.recipeTitle}
                    </div>
                  ))}
                  {dayEntries.length > 2 && (
                    <div className="text-slate-400">+{dayEntries.length - 2} autre(s)</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h2 className="font-semibold">
          Repas du {new Date(selectedDate + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </h2>

        {entriesForSelected.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun repas planifié ce jour-là.</p>
        ) : (
          <ul className="space-y-1">
            {entriesForSelected.map((e) => (
              <li key={e.id} className="flex items-center justify-between bg-slate-50 rounded px-3 py-2 text-sm">
                <span>{e.recipeTitle}</span>
                <button onClick={() => removeEntry(e.id)} className="text-slate-400 hover:text-red-600">✕</button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <form onSubmit={planNewRecipe} className="space-y-2">
            <div className="text-sm font-medium">Nouvelle recette</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre (optionnel)"
              className="border border-slate-300 rounded-md px-2 py-1.5 text-sm w-full"
            />
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={"Idée générale (ex: \"pâtes bolognaise\") ou recette détaillée, une ligne par ingrédient (ex: \"200g de riz\")"}
              className="border border-slate-300 rounded-md px-2 py-1.5 text-sm w-full h-24"
            />
            <button
              type="submit"
              disabled={busy}
              className="bg-blue-600 text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "Analyse en cours…" : "Analyser et planifier"}
            </button>
            {lastExtracted && (
              <div className="text-xs text-slate-500 mt-1">
                Ingrédients détectés :{" "}
                {lastExtracted.length === 0
                  ? "aucun (ajoute-les via la fiche recette si besoin)"
                  : lastExtracted.map((i) => `${i.name} (${i.quantity}${i.unit})`).join(", ")}
              </div>
            )}
          </form>

          <form onSubmit={planExistingRecipe} className="space-y-2">
            <div className="text-sm font-medium">Recette déjà créée</div>
            <select
              value={existingRecipeId}
              onChange={(e) => setExistingRecipeId(e.target.value)}
              className="border border-slate-300 rounded-md px-2 py-1.5 text-sm w-full"
            >
              <option value="">-- choisir --</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-slate-600 text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-slate-700"
            >
              Planifier ce jour
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
