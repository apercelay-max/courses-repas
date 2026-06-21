"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VoiceInventoryInput from "./VoiceInventoryInput";

export default function HomeVoiceButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleDone() {
    setOpen(false);
    router.refresh(); // recharge les chiffres de la home
  }

  if (open) {
    return (
      <div>
        <VoiceInventoryInput onDone={handleDone} />
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="w-full flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl px-5 py-4 shadow-md transition text-left"
    >
      <span className="text-3xl">🎤</span>
      <div>
        <div className="font-semibold text-lg">Ajouter par la voix</div>
        <div className="text-sm text-violet-200">
          &ldquo;500g de pâtes dans le placard et du lait au frigo&rdquo;
        </div>
      </div>
    </button>
  );
}
