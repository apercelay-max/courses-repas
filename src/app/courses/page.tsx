"use client";

import { useEffect, useState } from "react";
import VoiceShoppingInput from "@/components/VoiceShoppingInput";

interface ToBuyEntry {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  inStock: number;
  inStockUnit: string;
  source: "auto" | "manual";
  manualItemId?: string;
}

interface ReverseEntry {
  ingredientId: string;
  name: string;
  needed: { quantity: number; unit: string };
  inStock: { quantity: number; unit: string };
}

export default function CoursesPage() {
  const [toBuy, setToBuy] = useState<ToBuyEntry[]>([]);
  const [reverse, setReverse] = useState<ReverseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReverse, setShowReverse] = useState(false);
  const [fetchError, setFetchError] = useState("");
  // Set d'IDs en cours d'animation "acheté"
  const [checking, setChecking] = useState<Set<string>>(new Set());

  const [manualForm, setManualForm] = useState({ ingredientName: "", quantity: "", unit: "piece" });

  async function load() {
    try {
      const res = await fetch("/api/shopping-list");
      const data = await res.json();
      setToBuy(data.toBuy ?? []);
      setReverse(data.reverse ?? []);
      setFetchError("");
    } catch {
      setFetchError("Impossible de charger la liste. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualForm.ingredientName.trim()) return;
    const qty = manualForm.quantity ? Number(manualForm.quantity) : 1;
    await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ingredientName: manualForm.ingredientName.trim(), quantity: qty, unit: manualForm.unit }),
    });
    setManualForm({ ingredientName: "", quantity: "", unit: "piece" });
    load();
  }

  function itemKey(item: ToBuyEntry) {
    return `${item.ingredientId}-${item.manualItemId ?? "auto"}`;
  }

  async function markBought(item: ToBuyEntry) {
    const key = itemKey(item);
    // Animation Apple-style : coche immédiate, disparition après 400ms
    setChecking((prev) => new Set([...prev, key]));
    await new Promise((r) => setTimeout(r, 450));
    await fetch("/api/shopping-list/mark-bought", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ingredientId: item.ingredientId, quantity: item.quantity, unit: item.unit, manualItemId: item.manualItemId }),
    });
    setChecking((prev) => { const n = new Set(prev); n.delete(key); return n; });
    load();
  }

  async function removeManual(id: string) {
    await fetch(`/api/shopping-list/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Liste de courses</h1>
        <button
          onClick={() => setShowReverse((v) => !v)}
          className="text-sm px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          {showReverse ? "← Voir : à acheter" : "Voir : déjà en stock ✅"}
        </button>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{fetchError}</div>
      )}

      {loading ? (
        <p className="text-slate-500">Chargement…</p>
      ) : showReverse ? (
        <ReverseList items={reverse} />
      ) : (
        <>
          <VoiceShoppingInput onDone={load} />

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {toBuy.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                Rien à acheter. Planifie des repas ou ajoute des articles ci-dessous.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {toBuy.map((item) => {
                  const key = itemKey(item);
                  const isChecking = checking.has(key);
                  const hasPartialStock = item.inStock > 0;

                  return (
                    <li
                      key={key}
                      className={`px-4 py-3 flex items-center gap-3 transition-all duration-300 ${
                        isChecking ? "opacity-40" : ""
                      } ${hasPartialStock ? "bg-amber-50 dark:bg-amber-950" : ""}`}
                    >
                      {/* Bouton cercle style Apple */}
                      <button
                        onClick={() => markBought(item)}
                        className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                          isChecking
                            ? "bg-green-500 border-green-500 scale-110"
                            : "border-slate-300 dark:border-slate-500 hover:border-green-400 dark:hover:border-green-500"
                        }`}
                      >
                        {isChecking && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      <div className={`flex-1 min-w-0 ${isChecking ? "line-through" : ""}`}>
                        <span className="font-medium capitalize">{item.name}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm"> — {item.quantity} {item.unit}</span>
                        {item.source === "manual" && (
                          <span className="ml-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 rounded px-1.5 py-0.5">manuel</span>
                        )}
                        {hasPartialStock && (
                          <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                            ⚠️ Tu en as déjà {item.inStock} {item.inStockUnit} en stock
                          </div>
                        )}
                      </div>

                      {item.source === "manual" && item.manualItemId && !isChecking && (
                        <button onClick={() => removeManual(item.manualItemId!)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 text-lg flex-shrink-0">✕</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Ajout manuel */}
          <form onSubmit={addManual} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Ajout manuel</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col flex-1 min-w-40">
                <label className="text-xs text-slate-500 mb-1">Article</label>
                <input
                  value={manualForm.ingredientName}
                  onChange={(e) => setManualForm({ ...manualForm, ingredientName: e.target.value })}
                  placeholder="ex: papier essuie-tout"
                  className="border border-slate-300 rounded-md px-2 py-1.5 text-sm w-full"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-slate-500 mb-1">Qté (optionnel)</label>
                <input type="number" step="any" min="0" value={manualForm.quantity} placeholder="1"
                  onChange={(e) => setManualForm({ ...manualForm, quantity: e.target.value })}
                  className="border border-slate-300 rounded-md px-2 py-1.5 text-sm w-24"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-slate-500 mb-1">Unité</label>
                <select value={manualForm.unit} onChange={(e) => setManualForm({ ...manualForm, unit: e.target.value })}
                  className="border border-slate-300 rounded-md px-2 py-1.5 text-sm">
                  {["piece","g","kg","ml","L","boite","tranche","gousse","sachet","pot"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="bg-indigo-600 text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-indigo-700">
                Ajouter
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function ReverseList({ items }: { items: ReverseEntry[] }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-sm text-slate-500 mb-3">Ingrédients couverts par ton stock — pas besoin de les acheter.</p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Planifie des repas pour voir ce qui est déjà couvert.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="py-2">Ingrédient</th>
                <th className="py-2">Besoin</th>
                <th className="py-2">En stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {items.map((item) => (
                <tr key={item.ingredientId}>
                  <td className="py-2 capitalize font-medium">{item.name}</td>
                  <td className="py-2">{item.needed.quantity} {item.needed.unit}</td>
                  <td className="py-2 text-green-700 dark:text-green-400">{item.inStock.quantity} {item.inStock.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
