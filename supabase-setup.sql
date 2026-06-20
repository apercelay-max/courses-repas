-- À exécuter une fois dans Supabase : Project > SQL Editor > New query > Run
-- Crée la table qui stockera toute la "base" de l'appli (1 seule ligne, en JSON).
-- L'appli la remplit elle-même au premier chargement si elle est vide.

create table if not exists app_state (
  id int primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
