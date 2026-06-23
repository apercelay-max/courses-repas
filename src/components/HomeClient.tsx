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

const DEFAULT_CARD_ORDER = ["inventaire", "repas", "acheter", "stock"];
const DEFAULT_SECTION_ORDER = ["cards", "voice", "guide"];

const SECTION_LABELS: Record<string, string> = {
  cards: "📊 Tableau de bord",
  voice: "🎤 Ajout vocal",
  guide: "📖 Comment ça marche",
};

export default function HomeClient({ cards }: { cards: HomeCard[] }) {
  const [cardOrder, setCardOrder] = useState<string[]>(DEFAULT_CARD_ORDER);
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      const sc = localStorage.getItem("home-card-order");
      if (sc) setCardOrder(JSON.parse(sc));
      const ss = localStorage.getItem("home-section-order");
      if (ss) setSectionOrder(JSON.parse(ss));
      const sh = localStorage.getItem("home-hidden");
      if (sh) setHiddenSections(JSON.parse(sh));
    } catch { /* ignore */ }
  }, []);

  function moveCard(id: string, dir: -1 | 1) {
    setCardOrder((prev) => {
      const next = [...prev];
      const i = next.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      localStorage.setItem("home-card-order", JSON.stringify(next));
      return next;
    });
  }

  function moveSection(id: string, dir: -1 | 1) {
    setSectionOrder((prev) => {
      const next = [...prev];
      const i = next.indexOf(id);
      const j = i + dir;
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

  const sortedCards = cardOrder
    .map((id) => cards.find((c) => c.id === id))
    .filter(Boolean) as HomeCard[];

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
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => moveCard(card.id, -1)} disabled={idx === 0}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-25 text-base flex items-center justify-center">↑</button>
                    <button onClick={() => moveCard(card.id, 1)} disabled={idx === sortedCards.length - 1}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-25 text-base flex items-center justify-center">↓</button>
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
                  <div className="font-medium text-sm">{card.title}</div>
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
          {hidden ? (
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center text-slate-400 text-sm">
              {SECTION_LABELS.voice} — masqué
            </div>
          ) : (
            <HomeVoiceButton />
          )}
        </div>
      );
    }

    if (id === "guide") {
      if (hidden && !editing) return null;
      return (
        <div key="guide">
          {hidden ? (
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center text-slate-400 text-sm">
              {SECTION_LABELS.guide} — masqué
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <h2 className="font-semibold mb-2">Comment ça marche</h2>
              <ol className="list-decimal list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
                <li>Renseigne ce que tu as dans le <Link href="/inventaire" className="text-blue-600 underline">Frigo et les Placards</Link>.</li>
                <li>Planifie tes repas dans le <Link href="/calendrier" className="text-blue-600 underline">Calendrier</Link>.</li>
                <li>Consulte la <Link href="/courses" className="text-blue-600 underline">Liste de courses</Link> : ce qui manque et ce que tu as déjà.</li>
              </ol>
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bienvenue 👋</h1>
          {!editing && (
            <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
              Gère ton frigo, planifie tes repas et laisse l&apos;appli calculer ta liste de courses.
            </p>
          )}
        </div>
        <button
          onClick={() => setEditing((e) => !e)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            editing
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
          }`}
        >
          {editing ? "✓ Terminer" : "✏️ Personnaliser"}
        </button>
      </div>

      {/* Panneau de personnalisation des sections */}
      {editing && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">Sections de l&apos;écran d&apos;accueil</p>
          {sectionOrder.map((id, idx) => {
            const hidden = hiddenSections.includes(id);
            return (
              <div key={id} className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                <span className="text-sm flex-1 text-slate-700 dark:text-slate-300">{SECTION_LABELS[id]}</span>
                <button
                  onClick={() => toggleSection(id)}
                  className={`text-xs px-2 py-1 rounded-md border transition ${
                    hidden
                      ? "border-slate-300 dark:border-slate-600 text-slate-400 bg-slate-50 dark:bg-slate-700"
                      : "border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900"
                  }`}
                >
                  {hidden ? "👁 Afficher" : "✓ Visible"}
                </button>
                <button onClick={() => moveSection(id, -1)} disabled={idx === 0}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 disabled:opacity-25 text-base flex items-center justify-center">↑</button>
                <button onClick={() => moveSection(id, 1)} disabled={idx === sectionOrder.length - 1}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 disabled:opacity-25 text-base flex items-center justify-center">↓</button>
              </div>
            );
          })}
          <p className="text-xs text-blue-600 dark:text-blue-400 pt-1">
            Dans le tableau de bord, clique sur ✏️ Personnaliser pour réordonner les cartes individuellement.
          </p>
        </div>
      )}

      {/* Rendu des sections dans l'ordre */}
      {sectionOrder.map((id) => renderSection(id))}
    </div>
  );
}
