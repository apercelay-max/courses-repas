"use client";

import VoiceInventoryInput from "@/components/VoiceInventoryInput";
import { useEffect, useState } from "react";

type Loc = "frigo" | "placard" | "congelateur";

interface InventoryItem {
  id: string;
  ingredientId: string;
  ingredientName: string;
  location: Loc;
  quantity: number;
  unit: string;
  expiryDate: string | null;
  isFavorite?: boolean;
}

interface IngredientOption {
  id: string;
  name: string;
  defaultUnit: string;
}

const UNITS = ["g", "kg", "ml", "L", "piece", "gousse", "tranche", "boite", "sachet", "pot"];
const LOC_LABELS: Record<Loc, string> = { frigo: "🧊 Frigo", placard: "🗄️ Placard", congelateur: "❄️ Congélateur" };

export default function InventairePage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [ingredients, setIngredients] = useState<IngredientOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    ingredientName: "",
    quantity: "",
    unit: "g",
    location: "frigo" as Loc,
    expiryDate: "",
  });

  async function load() {
    const [invRes, ingRes] = await Promise.all([fetch("/api/inventory"), fetch("/api/ingredients")]);
    const invData = await invRes.json();
    const ingData = await ingRes.json();
    setItems(invData.items);
    setIngredients(ingData.ingredients);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ingredientName.trim()) return;
    const qty = form.quantity ? Number(form.quantity) : 1;
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ingredientName: form.ingredientName.trim(),
        quantity: qty,
        unit: form.unit,
        location: form.location,
        expiryDate: form.expiryDate || null,
      }),
    });
    setForm({ ...form, ingredientName: "", quantity: "", expiryDate: "" });
    load();
  }

  async function removeItem(id: string) {
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    load();
  }

  async function updateQuantity(id: string, quantity: number) {
    if (quantity < 0) return;
    await fetch(`/api/inventory/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    load();
  }

  async function toggleFavorite(id: string, current: boolean) {
    await fetch(`/api/inventory/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isFavorite: !current }),
    });
    load();
  }

  const frigo = items.filter((i) => i.location === "frigo");
  const placard = items.filter((i) => i.location === "placard");
  const congelateur = items.filter((i) => i.location === "congelateur");

  // Favoris à réapprovisionner (favoris avec quantité 0 ou très basse)
  const toRestock = items.filter((i) => i.isFavorite && i.quantity === 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inventaire</h1>

      <VoiceInventoryInput onDone={load} />

      {/* Section réapprovisionnement rapide */}
      {toRestock.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <h2 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">⚠️ À réapprovisionner</h2>
          <div className="flex flex-wrap gap-2">
            {toRestock.map((item) => (
              <button
                key={item.id}
                onClick={() => updateQuantity(item.id, 1)}
                className="bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-full px-3 py-1 text-sm font-medium transition"
              >
                + {item.ingredientName} ({LOC_LABELS[item.location]})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire ajout manuel */}
      <form onSubmit={addItem} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Ingrédient</label>
          <input
            list="ingredient-options"
            value={form.ingredientName}
            onChange={(e) => setForm({ ...form, ingredientName: e.target.value })}
            placeholder="ex: tomate"
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm w-48"
          />
          <datalist id="ingredient-options">
            {ingredients.map((i) => <option key={i.id} value={i.name} />)}
          </datalist>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Qté</label>
          <input type="number" step="any" min="0" value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm w-20"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Unité</label>
          <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm">
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Emplacement</label>
          <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value as Loc })}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm">
            {(Object.entries(LOC_LABELS) as [Loc, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Péremption</label>
          <input type="date" value={form.expiryDate}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-blue-700">
          Ajouter
        </button>
      </form>

      {loading ? (
        <p className="text-slate-500">Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InventoryColumn title="🧊 Frigo" items={frigo} onRemove={removeItem}
            onUpdateQuantity={updateQuantity} onToggleFavorite={toggleFavorite} />
          <InventoryColumn title="🗄️ Placards" items={placard} onRemove={removeItem}
            onUpdateQuantity={updateQuantity} onToggleFavorite={toggleFavorite} />
          <InventoryColumn title="❄️ Congélateur" items={congelateur} onRemove={removeItem}
            onUpdateQuantity={updateQuantity} onToggleFavorite={toggleFavorite} />
        </div>
      )}
    </div>
  );
}

function InventoryColumn({ title, items, onRemove, onUpdateQuantity, onToggleFavorite }: {
  title: string;
  items: InventoryItem[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h2 className="font-semibold mb-3">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Rien ici pour le moment.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  onClick={() => onToggleFavorite(item.id, Boolean(item.isFavorite))}
                  title={item.isFavorite ? "Retirer des favoris" : "Marquer comme habituel"}
                  className="text-base flex-shrink-0 opacity-60 hover:opacity-100 transition"
                >
                  {item.isFavorite ? "⭐" : "☆"}
                </button>
                <div className="min-w-0">
                  <div className="font-medium capitalize truncate">{item.ingredientName}</div>
                  {item.expiryDate && (
                    <div className="text-xs text-slate-400">Péremption : {item.expiryDate}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => onUpdateQuantity(item.id, roundQty(item.quantity - stepFor(item.unit)))}
                  className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-sm">−</button>
                <span className="text-sm tabular-nums w-20 text-center">{item.quantity} {item.unit}</span>
                <button onClick={() => onUpdateQuantity(item.id, roundQty(item.quantity + stepFor(item.unit)))}
                  className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-sm">+</button>
                <button onClick={() => onRemove(item.id)}
                  className="text-slate-400 hover:text-red-600 text-sm ml-1" title="Supprimer">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function stepFor(unit: string): number {
  if (unit === "g" || unit === "ml") return 50;
  if (unit === "kg" || unit === "L") return 0.5;
  return 1;
}

function roundQty(n: number): number {
  return Math.round(n * 100) / 100;
}
