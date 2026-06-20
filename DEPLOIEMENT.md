# Déployer "Courses & Repas" pour toute la famille (iPhone, Android, etc.)

Objectif : une URL unique (ex. `https://courses-repas-xxx.vercel.app`), accessible depuis
n'importe quel téléphone/ordinateur de la maison, avec une base de données partagée
hébergée chez Supabase (Postgres gratuit).

Tout le code est déjà prêt pour ça (`src/db/store.ts` utilise Postgres). Il ne reste que
de la configuration côté Supabase + Vercel — pas de code à écrire.

---

## 1. Créer la base de données sur Supabase

1. Va sur https://supabase.com et crée un compte (gratuit).
2. Clique sur **"New project"**.
   - Nom : `courses-repas` (ou ce que tu veux)
   - Mot de passe de la base : génère-en un et **note-le quelque part** (tu en auras besoin
     juste après). Tu peux utiliser un gestionnaire de mots de passe.
   - Région : choisis une région proche (ex. `eu-west-1` / Irlande, ou Frankfurt si
     disponible).
3. Attends ~1-2 minutes que le projet soit prêt.
4. Dans le menu de gauche, ouvre **SQL Editor** → **New query**.
5. Colle le contenu du fichier `supabase-setup.sql` (à la racine du projet) et clique
   **Run**. Ça crée la table `app_state` qui stockera toutes les données de l'appli.
6. Va dans **Project Settings** (icône engrenage) → **Database** → section
   **Connection string**.
   - Choisis l'onglet **"Transaction"** (port `6543`) — c'est le mode adapté à Vercel.
   - Copie l'URI, qui ressemble à :
     ```
     postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
     ```
   - Remplace `[YOUR-PASSWORD]` par le mot de passe de la base noté à l'étape 2.
   - Garde cette URL de côté, c'est ta variable `DATABASE_URL`.

---

## 2. (Optionnel) Tester en local avec Supabase avant de déployer

```bash
cp .env.local.example .env.local
```

Ouvre `.env.local` et colle ta `DATABASE_URL` (celle de l'étape 1.6).

```bash
npm install
npm run dev
```

Ouvre http://localhost:3000 — au premier chargement, l'appli remplit automatiquement la
table `app_state` avec les données de démo. Si l'inventaire de démo apparaît, la connexion
fonctionne.

---

## 3. Mettre le projet sur GitHub

Vercel déploie depuis un dépôt Git.

1. Crée un compte GitHub si tu n'en as pas (https://github.com).
2. Crée un nouveau dépôt (vide), par ex. `courses-repas`.
3. Depuis le dossier du projet :
   ```bash
   git init
   git add .
   git commit -m "Courses & Repas - MVP"
   git branch -M main
   git remote add origin https://github.com/<ton-pseudo>/courses-repas.git
   git push -u origin main
   ```

`.gitignore` exclut déjà `.env.local`, `node_modules`, etc. — ton mot de passe Supabase ne
part pas sur GitHub.

---

## 4. Déployer sur Vercel

1. Va sur https://vercel.com et crée un compte (tu peux te connecter avec GitHub
   directement).
2. Clique **"Add New..." → "Project"**, puis importe le dépôt `courses-repas`.
3. Avant de cliquer "Deploy", ouvre la section **"Environment Variables"** et ajoute :
   - Nom : `DATABASE_URL`
   - Valeur : ta connection string Supabase (celle de l'étape 1.6)
4. (Optionnel) Si tu veux l'extraction IA des recettes au lieu du mode "mock", ajoute aussi
   `ANTHROPIC_API_KEY` avec ta clé.
5. Clique **Deploy**. Au bout d'1-2 minutes, Vercel te donne une URL du type
   `https://courses-repas-xxx.vercel.app`.

---

## 5. Utiliser l'appli sur iPhone (et le reste de la famille)

1. Ouvre l'URL Vercel dans Safari sur l'iPhone.
2. Bouton **Partager** → **"Sur l'écran d'accueil"** : ça crée une icône comme une vraie
   app.
3. Envoie cette même URL aux autres membres de la famille — tout le monde lit/écrit dans
   la même base Supabase, donc les changements (inventaire, recettes, liste de courses)
   sont visibles par tous, en quasi temps réel (il faut recharger la page).

---

## Mises à jour futures

Toute modification du code : `git add . && git commit -m "..." && git push` → Vercel
redéploie automatiquement en 1-2 minutes.

## Limites connues

- Pas d'authentification : toute personne avec l'URL peut lire/modifier les données. Pour
  un usage familial privé, le principal risque est que l'URL Vercel fuite (elle est
  difficile à deviner mais pas secrète). Si besoin, on peut ajouter un mot de passe simple
  plus tard (Vercel propose une protection par mot de passe sur les plans payants, ou on
  peut coder une mini-auth maison).
- Le plan gratuit Supabase met le projet en pause après 1 semaine d'inactivité totale —
  une simple visite de l'appli le réactive (peut prendre quelques secondes la première
  fois).
