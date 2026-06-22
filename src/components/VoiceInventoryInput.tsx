"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from "react";

type Loc = "frigo" | "placard" | "congelateur";

interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  location: Loc;
}

// ---------- Parsing NLP français amélioré ----------

function normalizeUnit(raw: string): string {
  const u = raw.toLowerCase().trim();
  if (/^(g|gramme?s?)$/.test(u)) return "g";
  if (/^(kg|kilo?s?|kilogramme?s?)$/.test(u)) return "kg";
  if (/^(l|litre?s?)$/.test(u)) return "L";
  if (/^(ml|millilitre?s?|cl|centilitre?s?)$/.test(u)) return "ml";
  if (/^(boîte?s?|boite?s?)$/.test(u)) return "boite";
  if (/^(tranche?s?)$/.test(u)) return "tranche";
  if (/^(gousse?s?)$/.test(u)) return "gousse";
  if (/^(sachet?s?)$/.test(u)) return "sachet";
  if (/^(pot?s?)$/.test(u)) return "pot";
  return "piece";
}

function parseQuantity(raw: string): number {
  const s = raw.toLowerCase().replace(",", ".");
  if (s === "un" || s === "une") return 1;
  if (/demi/.test(s)) return 0.5;
  if (/quart/.test(s)) return 0.25;
  if (/douzaine/.test(s)) return 12;
  if (/demi.douzaine/.test(s)) return 6;
  const n = parseFloat(s);
  return isNaN(n) ? 1 : n;
}

function parsePart(text: string, defaultLoc: Loc): ParsedItem | null {
  const t = text.trim();
  if (t.length < 2) return null;

  const loc: Loc =
    /#congelateur/.test(t) ? "congelateur"
    : /#placard/.test(t) ? "placard"
    : /#frigo/.test(t) ? "frigo"
    : defaultLoc;

  // Retire TOUS les tags de localisation
  const clean = t.replace(/#(frigo|placard|congelateur)/g, "").trim();
  if (!clean) return null;

  // Motif avec quantité numérique : "500g de pâtes", "2 litres de lait"
  const numMatch = clean.match(
    /^(\d+(?:[.,]\d+)?)\s*(grammes?|g|kilos?|kg|kilogrammes?|litres?|l(?![a-z])|ml|millilitre?s?|cl|centilitre?s?|boîtes?|boites?|tranches?|gousses?|sachets?|pots?|pièces?|pieces?)?\s*(?:de\s+|d[u']\s*|de la\s+|des\s+)?(.+)/i
  );
  if (numMatch) {
    const qty = parseFloat(numMatch[1].replace(",", "."));
    const unit = normalizeUnit(numMatch[2] || "piece");
    const name = numMatch[3].replace(/\s*#\w+/g, "").trim();
    if (name.length > 1) return { name, quantity: qty, unit, location: loc };
  }

  // Quantité en toutes lettres : "une douzaine d'oeufs", "un demi kilo de beurre"
  const wordQtyMatch = clean.match(
    /^(un(?:e)?\s+(?:demi(?:-douzaine|)?|quart|douzaine)|demi(?:-douzaine)?|quart|douzaine)\s+(?:de\s+|d[u']\s*|de la\s+|des\s+)?(.+)/i
  );
  if (wordQtyMatch) {
    const qty = parseQuantity(wordQtyMatch[1]);
    const name = wordQtyMatch[2].replace(/\s*#\w+/g, "").trim();
    const unit = /douzaine/.test(wordQtyMatch[1]) ? "piece" : /kilo/.test(wordQtyMatch[1]) ? "kg" : "piece";
    if (name.length > 1) return { name, quantity: qty, unit, location: loc };
  }

  // Pas de quantité : "du lait", "des pâtes", "lait"
  const noQtyMatch = clean.match(
    /^(?:du\s+|de la\s+|de l['']|d['']|des\s+|un peu de\s+|un\s+|une\s+)?(.+)/i
  );
  if (noQtyMatch) {
    const name = noQtyMatch[1].replace(/\s*#\w+/g, "").trim();
    if (name.length > 1) return { name, quantity: 1, unit: "piece", location: loc };
  }
  return null;
}

function parseTranscript(raw: string): ParsedItem[] {
  let text = raw.toLowerCase()
    // Normalise les apostrophes
    .replace(/['']/g, "'")
    // Localisation → tags
    .replace(/(?:dans le?|au?)\s+(congélateur|congel|congélo|freezer)/g, "#congelateur")
    .replace(/(?:dans le?|au?)\s+(frigo|réfrigérateur|frigidaire|réfrig|frais)/g, "#frigo")
    .replace(/(?:dans le?s?|au?)\s+(placard|garde-manger|réserve|cuisine)/g, "#placard")
    // Mots parasites en début
    .replace(/^(?:alors\s+|bon\s+|voilà\s+|voila\s+|donc\s+|ok\s+)+/, "")
    .replace(/^(?:j['']ai\s+|j ai\s+|il y a\s+)+/, "")
    .replace(/^(?:acheté\s+|achète\s+|ajouté\s+|ajoute\s+|mis\s+)+/, "");

  const defaultLoc: Loc =
    /acheté|fait les courses|épicerie|supermarché/.test(raw.toLowerCase()) ? "placard" : "frigo";

  // Séparateurs
  const parts = text.split(/\s*,\s*|\s+et\s+|\s+puis\s+|\s+aussi\s+|\s+ainsi que\s+/);

  return parts
    .map((p) => parsePart(p.trim(), defaultLoc))
    .filter((x): x is ParsedItem => x !== null && x.name.length > 1);
}

// ---------- Composant ----------

const UNITS = ["g", "kg", "ml", "L", "piece", "gousse", "tranche", "boite", "sachet", "pot"];
const LOC_LABELS: Record<Loc, string> = { frigo: "🧊 Frigo", placard: "🗄️ Placard", congelateur: "❄️ Congélateur" };

export default function VoiceInventoryInput({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<"idle" | "listening" | "confirm" | "saving">("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [error, setError] = useState("");
  const recRef = useRef<any>(null);

  function startListening() {
    setError("");
    setInterim("");
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Votre navigateur ne supporte pas la voix. Utilisez Chrome ou Safari.");
      return;
    }
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.continuous = false;
    rec.interimResults = true; // Résultats en temps réel

    rec.onresult = (e: any) => {
      let final = "";
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else inter += e.results[i][0].transcript;
      }
      if (inter) setInterim(inter);
      if (final) {
        setTranscript(final);
        setInterim("");
        setItems(parseTranscript(final));
        setState("confirm");
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === "no-speech") setError("Rien entendu. Réessaie.");
      else setError(`Erreur micro (${e.error}). Réessaie.`);
      setState("idle");
    };

    rec.onend = () => {
      if (state === "listening") setState("idle");
    };

    recRef.current = rec;
    rec.start();
    setState("listening");
  }

  function stopListening() {
    recRef.current?.stop();
    setState("idle");
    setInterim("");
  }

  function updateItem(idx: number, patch: Partial<ParsedItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function confirm() {
    setState("saving");
    for (const item of items) {
      await fetch("/api/inventory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ingredientName: item.name,
          quantity: item.quantity,
          unit: item.unit,
          location: item.location,
          expiryDate: null,
        }),
      });
    }
    setState("idle");
    setTranscript("");
    setItems([]);
    onDone();
  }

  function reset() {
    recRef.current?.stop();
    setState("idle");
    setTranscript("");
    setInterim("");
    setItems([]);
    setError("");
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950 dark:to-indigo-950 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎙️</span>
        <h2 className="font-semibold text-violet-800 dark:text-violet-300">Ajouter par la voix</h2>
      </div>

      {state === "idle" && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-slate-500 text-center">
            Ex : <em>&ldquo;500g de pâtes dans le placard, du lait et 6 oeufs dans le frigo&rdquo;</em>
          </p>
          <button
            onClick={startListening}
            className="w-16 h-16 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-lg text-2xl transition active:scale-95"
          >
            🎤
          </button>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>
      )}

      {state === "listening" && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1 items-end h-8">
            {[4,7,5,9,6,8,4,6,9,5].map((h, i) => (
              <div key={i}
                className="w-1.5 bg-violet-500 rounded-full animate-pulse"
                style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          {interim && (
            <p className="text-sm text-violet-700 dark:text-violet-300 italic text-center max-w-xs">
              &ldquo;{interim}&rdquo;
            </p>
          )}
          <button
            onClick={stopListening}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow text-xl active:scale-95"
          >
            ⏹️
          </button>
          <p className="text-xs text-slate-400">Parle, puis arrête quand tu as fini</p>
        </div>
      )}

      {(state === "confirm" || state === "saving") && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 italic">&ldquo;{transcript}&rdquo;</p>
          {items.length === 0 ? (
            <div className="text-sm text-center space-y-2">
              <p className="text-red-500">Rien compris. Réessaie en parlant clairement.</p>
              <p className="text-slate-400 text-xs">Conseil : parle lentement, dis les unités clairement (grammes, kilos…)</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item, idx) => (
                <li key={idx} className="flex flex-wrap gap-2 items-center bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                  <input
                    className="border border-slate-300 rounded px-2 py-1 text-sm w-32 capitalize"
                    value={item.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                  />
                  <input
                    type="number"
                    className="border border-slate-300 rounded px-2 py-1 text-sm w-16"
                    value={item.quantity}
                    min={0}
                    step="any"
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                  />
                  <select
                    className="border border-slate-300 rounded px-2 py-1 text-sm"
                    value={item.unit}
                    onChange={(e) => updateItem(idx, { unit: e.target.value })}
                  >
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <select
                    className="border border-slate-300 rounded px-2 py-1 text-sm"
                    value={item.location}
                    onChange={(e) => updateItem(idx, { location: e.target.value as Loc })}
                  >
                    {(Object.entries(LOC_LABELS) as [Loc, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-sm ml-auto">✕</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 mt-2 flex-wrap">
            <button
              onClick={confirm}
              disabled={items.length === 0 || state === "saving"}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              {state === "saving" ? "Ajout…" : `✅ Ajouter ${items.length} ingrédient${items.length > 1 ? "s" : ""}`}
            </button>
            <button onClick={reset} className="text-slate-500 hover:text-slate-700 text-sm px-3 py-2">Annuler</button>
            <button onClick={startListening} className="text-violet-600 hover:text-violet-800 text-sm px-3 py-2 ml-auto">🎤 Réessayer</button>
          </div>
        </div>
      )}
    </div>
  );
}
