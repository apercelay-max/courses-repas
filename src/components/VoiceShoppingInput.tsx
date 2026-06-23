"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from "react";

interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
}

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

function parsePart(text: string): ParsedItem | null {
  const clean = text.trim();
  if (clean.length < 2) return null;

  const numMatch = clean.match(
    /^(\d+(?:[.,]\d+)?)\s*(grammes?|g|kilos?|kg|kilogrammes?|litres?|l(?![a-z])|ml|millilitre?s?|cl|centilitre?s?|boîtes?|boites?|tranches?|gousses?|sachets?|pots?|pièces?|pieces?)?\s*(?:de\s+|d[u']\s*|de la\s+|des\s+)?(.+)/i
  );
  if (numMatch) {
    const qty = parseFloat(numMatch[1].replace(",", "."));
    const unit = normalizeUnit(numMatch[2] || "piece");
    const name = numMatch[3].trim();
    if (name.length > 1) return { name, quantity: qty, unit };
  }

  const wordQtyMatch = clean.match(
    /^(un(?:e)?\s+(?:demi(?:-douzaine|)?|quart|douzaine)|demi(?:-douzaine)?|quart|douzaine)\s+(?:de\s+|d[u']\s*|de la\s+|des\s+)?(.+)/i
  );
  if (wordQtyMatch) {
    const qty = parseQuantity(wordQtyMatch[1]);
    const name = wordQtyMatch[2].trim();
    const unit = /douzaine/.test(wordQtyMatch[1]) ? "piece" : /kilo/.test(wordQtyMatch[1]) ? "kg" : "piece";
    if (name.length > 1) return { name, quantity: qty, unit };
  }

  const noQtyMatch = clean.match(
    /^(?:du\s+|de la\s+|de l['']|d['']|des\s+|un peu de\s+|un\s+|une\s+)?(.+)/i
  );
  if (noQtyMatch) {
    const name = noQtyMatch[1].trim();
    if (name.length > 1) return { name, quantity: 1, unit: "piece" };
  }
  return null;
}

function parseTranscript(raw: string): ParsedItem[] {
  const text = raw.toLowerCase()
    .replace(/['']/g, "'")
    .replace(/^(?:alors\s+|bon\s+|voilà\s+|voila\s+|donc\s+|ok\s+)+/, "")
    .replace(/^(?:j['']ai\s+|j ai\s+|il me faut\s+|il faut\s+|achète\s+|acheter\s+)+/, "");

  const parts = text.split(/\s*,\s*|\s+et\s+|\s+puis\s+|\s+aussi\s+|\s+ainsi que\s+/);
  return parts
    .map((p) => parsePart(p.trim()))
    .filter((x): x is ParsedItem => x !== null && x.name.length > 1);
}

const UNITS = ["g", "kg", "ml", "L", "piece", "gousse", "tranche", "boite", "sachet", "pot"];

export default function VoiceShoppingInput({ onDone }: { onDone: () => void }) {
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
    rec.interimResults = true;

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
      else setError(`Erreur micro (${e.error}).`);
      setState("idle");
    };

    rec.onend = () => { if (state === "listening") setState("idle"); };
    recRef.current = rec;
    rec.start();
    setState("listening");
  }

  function stopListening() { recRef.current?.stop(); setState("idle"); setInterim(""); }

  function updateItem(idx: number, patch: Partial<ParsedItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function confirm() {
    setState("saving");
    for (const item of items) {
      await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ingredientName: item.name, quantity: item.quantity, unit: item.unit }),
      });
    }
    setState("idle");
    setTranscript("");
    setItems([]);
    onDone();
  }

  function reset() {
    recRef.current?.stop();
    setState("idle"); setTranscript(""); setInterim(""); setItems([]); setError("");
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎙️</span>
        <h2 className="font-semibold text-blue-800 dark:text-blue-300">Ajouter par la voix</h2>
      </div>

      {state === "idle" && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-slate-500 text-center">
            Ex : <em>&ldquo;du lait, 6 oeufs et du pain de mie&rdquo;</em>
          </p>
          <button onClick={startListening}
            className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg text-2xl transition active:scale-95">
            🎤
          </button>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>
      )}

      {state === "listening" && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1 items-end h-8">
            {[4,7,5,9,6,8,4,6,9,5].map((h, i) => (
              <div key={i} className="w-1.5 bg-blue-500 rounded-full animate-pulse"
                style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          {interim && (
            <p className="text-sm text-blue-700 dark:text-blue-300 italic text-center max-w-xs">
              &ldquo;{interim}&rdquo;
            </p>
          )}
          <button onClick={stopListening}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow text-xl active:scale-95">
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
              <p className="text-red-500">Rien compris. Réessaie.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item, idx) => (
                <li key={idx} className="flex flex-wrap gap-2 items-center bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                  <input className="border border-slate-300 rounded px-2 py-1 text-sm w-32 capitalize"
                    value={item.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
                  <input type="number" className="border border-slate-300 rounded px-2 py-1 text-sm w-16"
                    value={item.quantity} min={0} step="any"
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} />
                  <select className="border border-slate-300 rounded px-2 py-1 text-sm"
                    value={item.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-sm ml-auto">✕</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 mt-2 flex-wrap">
            <button onClick={confirm} disabled={items.length === 0 || state === "saving"}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium">
              {state === "saving" ? "Ajout…" : `✅ Ajouter ${items.length} article${items.length > 1 ? "s" : ""}`}
            </button>
            <button onClick={reset} className="text-slate-500 hover:text-slate-700 text-sm px-3 py-2">Annuler</button>
            <button onClick={startListening} className="text-blue-600 hover:text-blue-800 text-sm px-3 py-2 ml-auto">🎤 Réessayer</button>
          </div>
        </div>
      )}
    </div>
  );
}
