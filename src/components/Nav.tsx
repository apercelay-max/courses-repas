"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/inventaire", label: "Inventaire" },
  { href: "/calendrier", label: "Repas" },
  { href: "/courses", label: "Courses" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center h-12">
          <span className="font-bold text-base">🍽️ Repas &amp; Courses</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <div className="flex gap-1 pb-2 flex-wrap">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
