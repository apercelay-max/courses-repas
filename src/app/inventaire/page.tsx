"use client";

import VoiceInventoryInput from "@/components/VoiceInventoryInput";

import { useEffect, useState } from "react";

interface InventoryItem {
  id: string;
  ingredientId: string;
  ingredientName: string;
  location: "frigo" | "placard";
  quantity: number;
  unit: string;
  expiryDate: string | null;
}

interface IngredientOption {
  id: string;
  name: string;
  defaultUnit: string;
}

const UNITS = ["g", "kg", "ml", "L", "piece", "gousse", "tranche", "boite"];

export default function InventairePage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [ingredients, setIngredients] = useState<IngredientOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    ingredientName: "",
    quantity: "",
    unit: "g",
    location: "frigo" as "frigo" | "placard",
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

  useEffect(() => {
    load();
  }, []);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ingredientName.trim() || !form.quantity) return;
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ingredientName: form.ingredientName.trim(),
        quantity: Number(form.quantity),
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

  const frigo = items.filter((i) => i.location === "frigo");
  const placard = items.filter((i) => i.location === "placard");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inventaire</h1>

      <VoiceInventoryInput onDone={load} />

      <form onSubmit={addItem} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
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
            {ingredients.map((i) => (
              <option key={i.id} value={i.name} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Quantité</label>
          <input
            type="number"
            step="any"
            min="0"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm w-24"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Unité</label>
          <select
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Emplacement</label>
          <select
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value as "frigo" | "placard" })}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
          >
            <option value="frigo">Frigo</option>
            <option value="placard">Placard</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Péremption (optionnel)</label>
          <input
            type="date"
            value={form.expiryDate}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InventoryColumn title="🧊 Frigo" items={frigo} onRemove={removeItem} onUpdateQuantity={updateQuantity} />
          <InventoryColumn title="🗄️ Placards" items={placard} onRemove={removeItem} onUpdateQuantity={updateQuantity} />
        </div>
      )}
    </div>
  );
}

function InventoryColumn({
  title,
  items,
  onRemove,
  onUpdateQuantity,
}: {
  title: string;
  items: InventoryItem[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
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
              <div>
                <div className="font-medium capitalize">{item.ingredientName}</div>
                {item.expiryDate && (
                  <div className="text-xs text-slate-400">Péremption : {item.expiryDate}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateQuantity(item.id, roundQty(item.quantity - stepFor(item.unit)))}
                  className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-sm"
                >
                  −
                </button>
                <span className="text-sm tabular-nums w-20 text-center">
                  {item.quantity} {item.unit}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, roundQty(item.quantity + stepFor(item.unit)))}
                  className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-sm"
                >
                  +
                </button>
                <button
                  onClick={() => onRemove(item.id)}
                  className="text-slate-400 hover:text-red-600 text-sm ml-1"
                  title="Supprimer"
                >
                  ✕
                </button>
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
