"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import HomeVoiceButton from "./HomeVoiceButton";

export interface HomeCard {
  id: string;
  href: string;
  title: string;
  value: string;
  sub: string;
  emoji: string;
}

export interface FavoriteItem {
  id: string;
  ingredientId: string;
  ingredientName: string;
  location: "frigo" | "placard" | "congelateur";
  quantity: number;
  unit: string;
}

const DEFAULT_CARD_ORDER = ["inventaire", "repas", "acheter", "stock"];
const DEFAULT_SECTION_ORDER = ["cards", "voice", "guide"];
const LOC_EMOJI: Record<string, string> = { frigo: "🧊", placard: "🗄️", congelateur: "❄️" };

export default function HomeClient({ cards, favorites }: { cards: HomeCard[]; favorites: FavoriteItem[] }) {
  const [activeTab, setActiveTab] = useState<"accueil" | "favoris">("accueil");
  const [cardOrder, setCardOrder] = useState<string[]>(DEFAULT_CARD_ORDER);
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [favQtys, setFavQtys] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const sc = localStorage.getItem("home-card-order");
      if (sc) setCardOrder(JSON.parse(sc));
      const ss = localStorage.getItem("home-section-order");
      if (ss) setSectionOrder(JSON.parse(ss));
      const sh = localStorage.getItem("home-hidden");
      if (sh) setHiddenSections(JSON.parse(sh));
    } catch { /* ignore */ }
    // Initialiser qtys favoris depuis les props
    const qtys: Record<string, number> = {};
    favorites.forEach((f) => { qtys[f.id] = f.quantity; });
    setFavQtys(qtys);
  }, [favorites]);

  function moveCard(id: string, dir: -1 | 1) {
    setCardOrder((prev) => {
      const next = [...prev];
      const i = next.indexOf(id); const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      localStorage.setItem("home-card-order", JSON.stringify(next));
      return next;
    });
  }

  function moveSection(id: string, dir: -1 | 1) {
    setSectionOrder((prev) => {
      const next = [...prev];
      const i = next.indexOf(id); const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      localStorage.setItem("home-section-order", JSON.stringify(next));
      return next;
    });
  }

  function toggleSection(id: string) {
    setHiddenSections((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      localStorage.setItem("home-hidden", JSON.stringify(next));
      return next;
    });
  }

  async function updateFavQty(item: FavoriteItem, delta: number) {
    const newQty = Math.max(0, (favQtys[item.id] ?? item.quantity) + delta);
    setFavQtys((p) => ({ ...p, [item.id]: newQty }));
    await fetch(`/api/inventory/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity: newQty }),
    });
  }

  const sortedCards = cardOrder.map((id) => cards.find((c) => c.id === id)).filter(Boolean) as HomeCard[];

  const SECTION_LABELS: Record<string, string> = {
    cards: "📊 Tableau de bord",
    voice: "🎤 Ajout vocal",
    guide: "📖 Comment ça marche",
  };

  function renderSection(id: string) {
    const hidden = hiddenSections.includes(id);
    if (id === "cards") {
      if (hidden && !editing) return null;
      return (
        <div key="cards">
          {editing ? (
            <div className="space-y-2">
              {sortedCards.map((card, idx) => (
                <div key={card.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
                  <span className="text-2xl">{card.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{card.title}</div>
                    <div className="text-xs text-slate-500 truncate">{card.sub}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => moveCard(card.id, -1)} disabled={idx === 0}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 disabled:opacity-25 flex items-center justify-center">↑</button>
                    <button onClick={() => moveCard(card.id, 1)} disabled={idx === sortedCards.length - 1}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 disabled:opacity-25 flex items-center justify-center">↓</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {sortedCards.map((card) => (
                <Link key={card.id} href={card.href}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
                  <div className="text-2xl">{card.emoji}</div>
                  <div className="text-3xl font-bold mt-2">{card.value}</div>
                  <div className="font-medium text-sm mt-1">{card.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.sub}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (id === "voice") {
      if (hidden && !editing) return null;
      return (
        <div key="voice">
          {hidden
            ? <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center text-slate-400 text-sm">{SECTION_LABELS.voice} — masqué</div>
            : <HomeVoiceButton />}
        </div>
      );
    }
    if (id === "guide") {
      if (hidden && !editing) return null;
      return (
        <div key="guide">
          {hidden
            ? <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center text-slate-400 text-sm">{SECTION_LABELS.guide} — masqué</div>
            : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <h2 className="font-semibold mb-2">Comment ça marche</h2>
                <ol className="list-decimal list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  <li>Renseigne ton <Link href="/inventaire" className="text-indigo-600 underline">Inventaire</Link> (frigo, placards, congélateur).</li>
                  <li>Planifie tes <Link href="/calendrier" className="text-indigo-600 underline">Repas</Link> dans le calendrier.</li>
                  <li>Consulte tes <Link href="/courses" className="text-indigo-600 underline">Courses</Link> : ce qui manque et ce que tu as déjà.</li>
                </ol>
              </div>
            )}
        </div>
      );
    }
    return null;
  }

  // --- Tab Favoris ---
  const FavorisTab = () => {
    const empty = favorites.length === 0;
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ingrédients marqués ⭐ dans l&apos;inventaire. Modifie les quantités directement ici.
        </p>
        {empty ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center">
            <p className="text-slate-400 text-sm">Aucun favori — marque des ingrédients avec ⭐ dans l&apos;Inventaire.</p>
            <Link href="/inventaire" className="mt-3 inline-block text-indigo-600 text-sm font-medium hover:underline">Aller à l&apos;inventaire →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {favorites.map((item) => {
              const qty = favQtys[item.id] ?? item.quantity;
              const isEmpty = qty === 0;
              return (
                <div key={item.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${isEmpty ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
                  <span className="text-lg">{LOC_EMOJI[item.location]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium capitalize truncate">{item.ingredientName}</div>
                    {isEmpty && <div className="text-xs text-amber-600 dark:text-amber-400">À réapprovisionner</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => updateFavQty(item, -1)} disabled={qty <= 0}
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center font-bold text-lg">−</button>
                    <span className="text-sm tabular-nums w-16 text-center font-medium">{qty} {item.unit}</span>
                    <button onClick={() => updateFavQty(item, 1)}
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-lg">+</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* En-tête avec tabs */}
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold mr-auto">Accueil</h1>
        {/* Tabs */}
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button onClick={() => { setActiveTab("accueil"); setEditing(false); }}
            className={`px-4 py-1.5 text-sm font-medium transition ${activeTab === "accueil" ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
            🏠 Accueil
          </button>
          <button onClick={() => { setActiveTab("favoris"); setEditing(false); }}
            className={`px-4 py-1.5 text-sm font-medium transition ${activeTab === "favoris" ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
            ⭐ Favoris {favorites.length > 0 && <span className="ml-1 text-xs opacity-75">({favorites.length})</span>}
          </button>
        </div>
        {activeTab === "accueil" && (
          <button onClick={() => setEditing((e) => !e)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${editing ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>
            {editing ? "✓ Terminer" : "✏️ Personnaliser"}
          </button>
        )}
      </div>

      {/* Tab Favoris */}
      {activeTab === "favoris" && <FavorisTab />}

      {/* Tab Accueil */}
      {activeTab === "accueil" && (
        <>
          {editing && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">Sections</p>
              {sectionOrder.map((id, idx) => {
                const hidden = hiddenSections.includes(id);
                return (
                  <div key={id} className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                    <span className="text-sm flex-1 text-slate-700 dark:text-slate-300">{SECTION_LABELS[id]}</span>
                    <button onClick={() => toggleSection(id)}
                      className={`text-xs px-2 py-1 rounded-md border transition ${hidden ? "border-slate-300 text-slate-400 bg-slate-50 dark:bg-slate-700" : "border-green-300 text-green-700 bg-green-50 dark:bg-green-900 dark:text-green-400"}`}>
                      {hidden ? "👁 Afficher" : "✓ Visible"}
                    </button>
                    <button onClick={() => moveSection(id, -1)} disabled={idx === 0}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 disabled:opacity-25 flex items-center justify-center">↑</button>
                    <button onClick={() => moveSection(id, 1)} disabled={idx === sectionOrder.length - 1}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 disabled:opacity-25 flex items-center justify-center">↓</button>
                  </div>
                );
              })}
            </div>
          )}
          {sectionOrder.map((id) => renderSection(id))}
        </>
      )}
    </div>
  );
}
