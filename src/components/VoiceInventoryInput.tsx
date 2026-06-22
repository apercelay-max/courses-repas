"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from "react";

interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  location: "frigo" | "placard" | "congelateur";
}

// ---------- Parsing NLP français ----------

function normalizeUnit(raw: string): string {
  const u = raw.toLowerCase().trim();
  if (/^(g|gramme?s?)$/.test(u)) return "g";
  if (/^(kg|kilo?s?|kilogramme?s?)$/.test(u)) return "kg";
  if (/^(l|litre?s?)$/.test(u)) return "L";
  if (/^(ml|millilitre?s?|cl|centilitre?s?)$/.test(u)) return "ml";
  if (/^(boîte?s?|boite?s?)$/.test(u)) return "boite";
  if (/^(tranche?s?)$/.test(u)) return "tranche";
  if (/^(gousse?s?)$/.test(u)) return "gousse";
  return "piece";
}

function parsePart(text: string, defaultLoc: "frigo" | "placard"): ParsedItem | null {
  const t = text.trim();
  if (t.length < 2) return null;
  const loc: "frigo" | "placard" | "congelateur" =
    /#congelateur/.test(t) ? "congelateur" : /#placard/.test(t) ? "placard" : /#frigo/.test(t) ? "frigo" : defaultLoc;
  const clean = t.replace(/#(frigo|placard)/g, "").trim();
  if (!clean) return null;

  // [quantité] [unité?] [de/du/d'/des?] nom
  const m = clean.match(
    /^(\d+(?:[.,]\d+)?)\s*(grammes?|g|kilos?|kg|kilogrammes?|litres?|l(?!a)|ml|millilitres?|cl|centilitres?|boîtes?|boites?|tranches?|gousses?|pièces?|pieces?)?\s*(?:de\s+|d[u']\s*|de la\s+|des\s+)?(.+)/i
  );
  if (m) {
    const qty = parseFloat(m[1].replace(",", "."));
    const unit = normalizeUnit(m[2] || "piece");
    const name = m[3].trim();
    if (name) return { name, quantity: qty, unit, location: loc };
  }

  // Pas de quantité : "du lait", "des oeufs"
  const m2 = clean.match(/^(?:du\s+|de la\s+|de l['']|d['']|des\s+|un\s+|une\s+)?(.+)/i);
  if (m2) {
    const name = m2[1].trim();
    if (name.length > 1) return { name, quantity: 1, unit: "piece", location: loc };
  }
  return null;
}

function parseTranscript(raw: string): ParsedItem[] {
  let text = raw.toLowerCase();
  text = text
    .replace(/dans le (frigo|réfrigérateur|frigidaire|réfrig)/g, "#frigo")
    .replace(/au (frigo|réfrigérateur|frigidaire)/g, "#frigo")
    .replace(/dans le (placard|garde-manger)/g, "#placard")
    .replace(/dans les placards/g, "#placard");

  const defaultLoc: "frigo" | "placard" =
    /acheté|fait les courses|épicerie/.test(text) ? "placard" : "frigo";

  text = text.replace(
    /^(j'ai|j ai|acheté|achète|ajouté|ajoute|mis|voilà|voila|il y a|j'ai mis)\s+/g,
    ""
  );

  const parts = text.split(/,|(?:\s+et\s+)|\s+puis\s+|\s+aussi\s+/);
  return parts
    .map((p) => parsePart(p.trim(), defaultLoc))
    .filter((x): x is ParsedItem => x !== null && x.name.length > 1);
}

// ---------- Composant React ----------

const UNITS = ["g", "kg", "ml", "L", "piece", "gousse", "tranche", "boite"];

export default function VoiceInventoryInput({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<"idle" | "listening" | "confirm" | "saving">("idle");
  const [transcript, setTranscript] = useState("");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [error, setError] = useState("");
  const recRef = useRef<any>(null);

  function startListening() {
    setError("");
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Votre navigateur ne supporte pas la voix. Utilisez Chrome ou Safari.");
      return;
    }
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      setItems(parseTranscript(text));
      setState("confirm");
    };
    rec.onerror = () => {
      setState("idle");
      setError("Erreur micro. Réessaie.");
    };
    recRef.current = rec;
    rec.start();
    setState("listening");
  }

  function stopListening() {
    recRef.current?.stop();
    setState("idle");
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
    setItems([]);
    setError("");
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎙️</span>
        <h2 className="font-semibold text-violet-800">Ajouter par la voix</h2>
      </div>

      {state === "idle" && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-slate-500 text-center">
            Ex : <em>&ldquo;500g de pâtes dans le placard et du lait dans le frigo&rdquo;</em>
          </p>
          <button
            onClick={startListening}
            className="w-16 h-16 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-lg text-2xl transition"
          >
            🎤
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      )}

      {state === "listening" && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-violet-700 font-medium animate-pulse">Écoute en cours…</p>
          <button
            onClick={stopListening}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg text-2xl"
          >
            ⏹️
          </button>
        </div>
      )}

      {(state === "confirm" || state === "saving") && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 italic">&ldquo;{transcript}&rdquo;</p>
          {items.length === 0 ? (
            <p className="text-sm text-red-500">Rien compris. Réessaie en parlant clairement.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item, idx) => (
                <li key={idx} className="flex flex-wrap gap-2 items-center bg-white rounded-lg px-3 py-2 border border-slate-200">
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
                    onChange={(e) => updateItem(idx, { location: e.target.value as "frigo" | "placard" })}
                  >
                    <option value="frigo">🧊 Frigo</option>
                    <option value="placard">🗄️ Placard</option>
                    <option value="congelateur">❄️ Congélateur</option>
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
