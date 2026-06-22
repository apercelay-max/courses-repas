"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/inventaire", label: "Inventaire" },
  { href: "/calendrier", label: "Calendrier" },
  { href: "/courses", label: "Liste de courses" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 h-14">
        <span className="font-bold text-lg mr-4">🛒 Courses & Repas</span>
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <ThemeToggle />
      </div>
    </nav>
  );
}
