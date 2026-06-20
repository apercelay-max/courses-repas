# Courses & Repas — MVP

App locale (Next.js 14 + TypeScript + Tailwind) pour gérer le frigo/placards, planifier des
repas dans un calendrier, et générer automatiquement la liste de courses (+ la liste inversée
"déjà en stock").

## Démarrage

La base de données est maintenant Postgres (Supabase) — voir `DEPLOIEMENT.md` pour créer
une base gratuite et obtenir ta `DATABASE_URL`.

```bash
cp .env.local.example .env.local   # puis colle ta DATABASE_URL Supabase dedans
npm install
npm run dev
```

Ouvre http://localhost:3000

Au premier lancement, l'appli remplit automatiquement la table `app_state` avec ~40
ingrédients de base et quelques articles d'inventaire de démo (pâtes, riz, œufs, lait,
oignons, ail, huile d'olive, sel, tomates concassées, fromage râpé).

## Build de production

```bash
npm run build
npm start
```

## Pages

- `/` — tableau de bord (résumés inventaire, repas planifiés, liste de courses)
- `/inventaire` — gestion Frigo / Placards (ajout, +/-, suppression, date de péremption)
- `/calendrier` — calendrier mensuel, planification de repas (texte libre → extraction
  automatique des ingrédients, ou recette déjà créée)
- `/courses` — liste de courses ("à acheter") + vue inversée ("déjà en stock ✅"), avec
  bouton "✓ Acheté" qui ajoute l'article à l'inventaire

## À propos de la base de données

La base est Postgres (Supabase). Pour garder le rewrite minimal, toute la "base" (tables
`ingredients`, `inventoryItems`, `recipes`, `recipeIngredients`, `mealPlanEntries`,
`shoppingListItems`, comme décrit dans `spec-app-courses-repas.md`) est stockée dans une
seule colonne JSONB d'une table `app_state` (une seule ligne, `id=1`). `src/db/store.ts`
lit/écrit ce blob ; le reste du code (logique métier, types) est inchangé. Migration future
vers un vrai schéma relationnel : éclater `app_state.data` en tables séparées suivant
`src/db/types.ts`.

Pour repartir d'une base vierge, vide la colonne `data` de la ligne `app_state` (id=1)
dans Supabase (SQL Editor) — l'appli la recrée avec les données de démo au prochain
chargement.

## Déploiement (accès partagé sur iPhone/Android)

Voir `DEPLOIEMENT.md` pour le guide complet : créer la base Supabase, pousser sur GitHub,
déployer sur Vercel, et accéder à l'appli depuis les téléphones de la famille.

## Extraction des ingrédients par IA

`src/lib/recipeExtractor.ts` :

- Si la variable d'environnement `ANTHROPIC_API_KEY` est définie, l'extraction utilise
  Claude (`claude-sonnet-4-6`) pour parser le texte libre de la recette et en extraire une
  liste structurée `{nom, quantité, unité}`.
- Sinon (par défaut), un mode "mock" est utilisé : il reconnaît une vingtaine de plats
  courants (bolognaise, carbonara, omelette, pizza, salade, riz cantonais, gratin
  dauphinois, tarte aux pommes, poulet rôti, soupe, etc.) et sait aussi parser des lignes du
  type `200g de riz`, `2 oignons`, etc.

Pour activer l'extraction réelle :

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

## Logique de la liste de courses

`src/lib/shoppingList.ts` :

1. Calcule les besoins agrégés (quantité par ingrédient) pour tous les repas planifiés à
   partir d'aujourd'hui.
2. Compare avec le stock (`inventoryItems`), en convertissant les unités vers une base
   commune (grammes, millilitres, ou unités).
3. **À acheter** : ce qui manque (besoin > stock), + les ajouts manuels.
4. **Déjà en stock** : ce qui est nécessaire ET déjà couvert par le stock — rien à acheter.

Marquer un article "✓ Acheté" l'ajoute directement à l'inventaire (placard par défaut).

## Vérification effectuée

- `npm run build` ✅ (build de production OK)
- `npm run dev` ✅, testé via API : inventaire (seed visible), création d'une recette
  "pâtes bolognaise" (extraction mock → pâtes, viande hachée, tomate concassée, oignon,
  ail, huile d'olive, parmesan...), planification du jour, et liste de courses générée
  correctement (manquants : huile d'olive, parmesan, viande hachée ; déjà en stock : ail,
  oignon, pâtes, tomate concassée).
