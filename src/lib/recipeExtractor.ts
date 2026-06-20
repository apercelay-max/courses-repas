// Service d'extraction des ingrédients d'une recette.
//
// - Si ANTHROPIC_API_KEY est défini dans l'environnement, on appelle l'API
//   Claude (tool use / structured output) pour analyser le texte de la recette.
// - Sinon, on utilise un extracteur "mock" local : dictionnaire de plats
//   courants + parsing de lignes type "200g de riz". Suffisant pour faire
//   tourner l'appli sans clé API, et remplaçable sans changer le reste du code
//   (même signature de fonction).

export interface ExtractedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export async function extractIngredients(rawInput: string): Promise<ExtractedIngredient[]> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await extractWithClaude(rawInput);
    } catch (err) {
      console.error("Extraction Claude échouée, fallback mock:", err);
      return mockExtract(rawInput);
    }
  }
  return mockExtract(rawInput);
}

// --- Implémentation réelle (Claude API) ------------------------------------

async function extractWithClaude(rawInput: string): Promise<ExtractedIngredient[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [
        {
          name: "extract_ingredients",
          description: "Extrait la liste des ingrédients et quantités nécessaires pour une recette.",
          input_schema: {
            type: "object",
            properties: {
              ingredients: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Nom de l'ingrédient en français, singulier" },
                    quantity: { type: "number" },
                    unit: { type: "string", description: "g, kg, ml, l, piece, gousse, tranche, boite, etc." },
                  },
                  required: ["name", "quantity", "unit"],
                },
              },
            },
            required: ["ingredients"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "extract_ingredients" },
      messages: [
        {
          role: "user",
          content: `Analyse cette recette (ou cette idée de plat) et liste les ingrédients nécessaires avec leurs quantités pour 4 personnes : "${rawInput}"`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  const toolUse = (data.content ?? []).find((c: { type: string }) => c.type === "tool_use");
  if (!toolUse) throw new Error("Pas de tool_use dans la réponse Claude");
  return toolUse.input.ingredients as ExtractedIngredient[];
}

// --- Mock local --------------------------------------------------------------

// Quelques plats courants -> ingrédients types pour 4 personnes.
// Clé = mot-clé recherché (insensible à la casse) dans le texte saisi.
const DISH_TEMPLATES: Array<{ keywords: string[]; ingredients: ExtractedIngredient[] }> = [
  {
    keywords: ["bolognaise", "spaghetti bolo"],
    ingredients: [
      { name: "pâtes", quantity: 400, unit: "g" },
      { name: "viande hachée", quantity: 400, unit: "g" },
      { name: "tomate concassée", quantity: 400, unit: "g" },
      { name: "oignon", quantity: 1, unit: "piece" },
      { name: "ail", quantity: 2, unit: "gousse" },
      { name: "huile d'olive", quantity: 2, unit: "piece" },
      { name: "parmesan", quantity: 50, unit: "g" },
    ],
  },
  {
    keywords: ["carbonara"],
    ingredients: [
      { name: "pâtes", quantity: 400, unit: "g" },
      { name: "lardons", quantity: 200, unit: "g" },
      { name: "œuf", quantity: 3, unit: "piece" },
      { name: "crème fraîche", quantity: 100, unit: "ml" },
      { name: "parmesan", quantity: 50, unit: "g" },
    ],
  },
  {
    keywords: ["omelette"],
    ingredients: [
      { name: "œuf", quantity: 6, unit: "piece" },
      { name: "beurre", quantity: 20, unit: "g" },
      { name: "sel", quantity: 5, unit: "g" },
      { name: "poivre", quantity: 2, unit: "g" },
    ],
  },
  {
    keywords: ["pizza"],
    ingredients: [
      { name: "pâte à pizza", quantity: 1, unit: "piece" },
      { name: "tomate concassée", quantity: 200, unit: "g" },
      { name: "mozzarella", quantity: 200, unit: "g" },
      { name: "basilic", quantity: 5, unit: "g" },
    ],
  },
  {
    keywords: ["salade"],
    ingredients: [
      { name: "salade verte", quantity: 1, unit: "piece" },
      { name: "tomate", quantity: 3, unit: "piece" },
      { name: "avocat", quantity: 1, unit: "piece" },
      { name: "huile d'olive", quantity: 2, unit: "piece" },
    ],
  },
  {
    keywords: ["riz cantonais"],
    ingredients: [
      { name: "riz", quantity: 300, unit: "g" },
      { name: "œuf", quantity: 2, unit: "piece" },
      { name: "jambon", quantity: 100, unit: "tranche" },
      { name: "carotte", quantity: 1, unit: "piece" },
      { name: "oignon", quantity: 1, unit: "piece" },
    ],
  },
  {
    keywords: ["gratin dauphinois", "gratin de pomme"],
    ingredients: [
      { name: "pomme de terre", quantity: 1000, unit: "g" },
      { name: "crème fraîche", quantity: 300, unit: "ml" },
      { name: "fromage râpé", quantity: 100, unit: "g" },
      { name: "ail", quantity: 1, unit: "gousse" },
    ],
  },
  {
    keywords: ["tarte aux pommes", "tarte pomme"],
    ingredients: [
      { name: "pâte à pizza", quantity: 1, unit: "piece" }, // proxy pâte à tarte
      { name: "pomme", quantity: 6, unit: "piece" },
      { name: "sucre", quantity: 100, unit: "g" },
      { name: "beurre", quantity: 30, unit: "g" },
    ],
  },
  {
    keywords: ["poulet rôti", "poulet roti", "poulet au four"],
    ingredients: [
      { name: "poulet", quantity: 1200, unit: "g" },
      { name: "pomme de terre", quantity: 800, unit: "g" },
      { name: "ail", quantity: 4, unit: "gousse" },
      { name: "huile d'olive", quantity: 2, unit: "piece" },
    ],
  },
  {
    keywords: ["soupe"],
    ingredients: [
      { name: "carotte", quantity: 4, unit: "piece" },
      { name: "pomme de terre", quantity: 2, unit: "piece" },
      { name: "oignon", quantity: 1, unit: "piece" },
      { name: "bouillon cube", quantity: 1, unit: "piece" },
    ],
  },
];

// Parse les lignes type "200g de riz", "- 3 tomates", "2 gousses d'ail"
const LINE_REGEX = /^[\-\*•\d\.\)\s]*([\d]+(?:[.,][\d]+)?)\s*(kg|g|ml|cl|l|litre|litres|gousses?|tranches?|piece|pi[eè]ces?|unit[eé]s?|boites?|bo[iî]tes?)?\s*(?:de |d'|du |des )?(.+)$/i;

function mockExtract(rawInput: string): ExtractedIngredient[] {
  const lines = rawInput
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const fromLines: ExtractedIngredient[] = [];
  for (const line of lines) {
    const m = line.match(LINE_REGEX);
    if (m) {
      const quantity = parseFloat(m[1].replace(",", "."));
      const unit = (m[2] ?? "piece").toLowerCase();
      const name = m[3].trim();
      if (name.length > 1) {
        fromLines.push({ name, quantity, unit });
      }
    }
  }
  if (fromLines.length > 0) return fromLines;

  // Pas de lignes structurées -> on cherche un plat connu par mot-clé
  const lower = rawInput.toLowerCase();
  for (const dish of DISH_TEMPLATES) {
    if (dish.keywords.some((k) => lower.includes(k))) {
      return dish.ingredients;
    }
  }

  // Rien trouvé : pas bloquant, l'utilisateur pourra ajouter les ingrédients
  // manuellement depuis l'écran de la recette.
  return [];
}
