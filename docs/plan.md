# PlatePlan — Build Plan

Spec: the student's request (summarized in "Spec" below — it is the binding authority).
Deadline context: working checkpoint now, final presentation Nov 12 2026.

## Spec

PlatePlan is a clickable meal-planning prototype for college students. Demo flow, start to finish:

1. **Questionnaire**: goal, dietary preference, allergies, weekly grocery budget, max cooking time.
2. **Weekly plan**: 7 days × breakfast / lunch / dinner / snack. Fill as many slots as the eligible recipes allow; when a slot can't be filled, show an empty-state card that says why. Answers visibly change which meals get suggested. **The plan AND the swap options must never include a recipe that contains an allergen the user marked.**
3. **Recipe detail**: ingredients, steps, prep time, estimated cost, and nutrition clearly labeled as an *estimate* (with its source).
4. **Swap**: replace any meal or snack with another eligible option of the same meal type. The plan and the grocery list update automatically. Ingredients still used by other meals stay on the list (and keep their checked state).
5. **Grocery list**: whole week, duplicate ingredients combined (same name + unit → summed quantity), grouped by store section, with shopping checkboxes.
6. **Two fictional demo profiles**, one tap each:
   - **Maya**: vegetarian, $45/week budget, 20 min max cook time, goal "more energy / balanced", allergic to peanuts.
   - **Jordan**: dairy-free (dairy marked as allergen), meal-preps on Sundays, $70/week, 45 min max, goal "build muscle".
7. **Health sources**: recipes and guidance draw on credible sources (USDA MyPlate, the Dietary Guidelines for Americans, FDA major food allergens, USDA FoodData Central for nutrition estimates). Show a small "Sources" section in the app and a per-day MyPlate food-group check.
8. **Privacy**: fictional profiles only, no backend, no data leaves the browser, and nothing is collected beyond the questionnaire. Say so in one line on the questionnaire.

## Global Constraints

- Plain static site: `index.html` + ES modules. **No build step, no frameworks, no npm dependencies.** It must open from a simple static server (`python3 -m http.server`) and be presentable on a laptop. Mobile-first layout (phone-frame feel), with a 16px gutter at phone width.
- Files (and only these, unless a task says otherwise):
  - `data/recipes.js`: `export const RECIPES = [...]` (Task 1)
  - `src/engine.js`: pure logic, no DOM (Task 2)
  - `test/engine.test.mjs`: `node --test` tests using `node:assert` (Task 2)
  - `index.html`, `src/app.js`, `src/styles.css`: UI (Task 3)
  - `docs/research.md`: sources + design notes (Task 1, extended by Task 3)
  - `README.md`: how to run + demo script (Task 3)
- Allergen filtering is the safety-critical path: it is done at the **ingredient** level (each ingredient lists its allergens), never by a recipe-level flag alone.
- Nutrition is always shown with the word "Estimated" and the source.

### Recipe schema (shared by Tasks 1, 2, 3, verbatim)

```
{
  id: "kebab-case-unique",
  name: "Overnight Oats with Berries",
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  diets: ["vegetarian", "vegan"],        // which diets it satisfies; [] if contains meat/fish
  prepMinutes: 10,                        // total active+cook time
  servings: 1,                            // servings the ingredient list yields
  costPerServing: 2.10,                   // USD estimate
  mealPrep: true,                         // batch-cooks well / keeps 3-4 days
  foodGroups: ["grains", "fruits", "dairy"], // MyPlate: fruits, vegetables, grains, protein, dairy
  ingredients: [
    { name: "rolled oats", qty: 0.5, unit: "cup", section: "Pantry", allergens: [] },
    { name: "milk", qty: 0.75, unit: "cup", section: "Dairy & Eggs", allergens: ["dairy"] }
  ],
  steps: ["...", "..."],
  nutrition: { calories: 380, protein: 14, carbs: 60, fat: 9, fiber: 8 }, // per serving, grams
  source: "Nutrition estimated from USDA FoodData Central"
}
```

Allergen vocabulary (FDA major 9): `dairy, eggs, fish, shellfish, tree-nuts, peanuts, wheat, soy, sesame`.
Store sections: `Produce, Pantry, Dairy & Eggs, Meat & Seafood, Frozen, Bakery`.
Ingredient names are lowercase and singular-consistent across recipes, so duplicates merge (e.g. always "rolled oats", never "oats").

### Profile schema (Tasks 2, 3)

```
{ name, goal: "balanced" | "muscle" | "weight-loss" | "energy",
  diet: "none" | "vegetarian" | "vegan",
  allergens: [...FDA vocab],
  budget: 45,          // USD per week
  maxMinutes: 20,      // max prepMinutes per recipe
  mealPrep: false }    // prefers Sunday batch cooking
```

## Tasks

### Task 1: Research + recipe dataset

Research credible online health sources (USDA MyPlate, Dietary Guidelines for Americans, FDA major allergens, USDA FoodData Central, plus 2–3 existing meal-planning apps for a competitor gap list). Produce:

- `docs/research.md`: sources with URLs, key takeaways that shaped the app, and the competitor gap list.
- `data/recipes.js`: **32–40 simple, realistic, college-budget recipes** matching the schema exactly. Coverage requirements, so both demo profiles get a full week with swap choices:
  - Every mealType has **≥4 recipes that are vegetarian, ≤20 min, peanut-free, and ≤$3.50/serving** (Maya).
  - Every mealType has **≥4 recipes with no dairy ingredient and ≤45 min**, of which, for lunch and dinner, **≥3 are `mealPrep: true`** and protein-forward (≥25 g protein) (Jordan).
  - Include some recipes with meat/fish, some containing peanuts or dairy, and some over 20 min, so the profiles visibly diverge.
  - Nutrition values are plausible per-serving estimates grounded in FoodData Central-style values; cost estimates are plausible US grocery prices.
- Write a tiny node check (`test/recipes.test.mjs`, `node --test`) that asserts every recipe matches the schema (required fields, valid enums, allergen vocab) and that the coverage counts above hold.

### Task 2: Planning engine (TDD)

`src/engine.js` exports pure functions:

- `isEligible(recipe, profile)`: false if any ingredient's allergens intersect `profile.allergens`; false if `profile.diet` is not "none" and not in `recipe.diets`; false if `prepMinutes > profile.maxMinutes`.
- `buildPlan(recipes, profile)` returns `{ days: [{ day: "Sunday".."Saturday", meals: { breakfast, lunch, dinner, snack } }] }`, where each meal is a recipe id or `null`. Rules:
  - Only eligible recipes. Slot is `null` if no eligible recipe of that mealType exists.
  - Score by goal: muscle → protein; weight-loss → lower calories; energy → fiber + carbs; balanced → number of foodGroups. Then rotate through the top options so the week has variety (no recipe on more than 3 days for breakfast/snack; up to 4 for lunch/dinner when `mealPrep`).
  - Budget: if the week's total cost exceeds `profile.budget`, replace the most expensive slots with cheaper eligible options until it fits or no cheaper option exists (a best-effort cap).
  - `mealPrep: true`: prefer `mealPrep` recipes for lunch/dinner and repeat each one in a run of consecutive days (batch-cook Sunday, eat through the week).
  - Deterministic (no Math.random) so demos are repeatable.
- `swapOptions(recipes, profile, plan, dayIndex, slot)` returns eligible recipes of that slot's mealType, excluding the current one, sorted by the same goal score.
- `applySwap(plan, dayIndex, slot, recipeId)` returns a **new** plan object (does not mutate).
- `planCost(plan, recipes)` returns the total USD.
- `groceryList(plan, recipes)` returns `[{ section, items: [{ key, name, qty, unit, usedIn: [recipeName...] }] }]`: one entry per recipe occurrence in the plan, merged by `name + unit` (quantities summed, scaled by occurrences / servings), with `key = name + "|" + unit` so the UI can persist checkbox state across swaps. Sections sorted in the fixed store order.
- `dayFoodGroups(plan, dayIndex, recipes)` returns the set of MyPlate groups covered that day.

Tests (`test/engine.test.mjs`) use small inline fixtures (not the real dataset) and must cover: allergen exclusion in plan AND in swapOptions (ingredient-level); diet and time filtering; null slots when nothing fits; budget cap reduces cost; applySwap immutability; grocery merge of duplicates; ingredient that's still used by another meal stays after a swap, while one used only by the swapped-out meal disappears; determinism.

### Task 3: UI (AI-assisted design)

Use the `frontend-design` skill (AI-assisted design is part of the student's deliverable). Build `index.html`, `src/app.js`, and `src/styles.css`, importing `data/recipes.js` and `src/engine.js`. Screens (a single page with view switching; bottom tab bar Plan / Groceries / Profile once a plan exists):

1. **Welcome / Questionnaire**: two "Try a demo profile" buttons (Maya, Jordan) that prefill the form, plus the form itself (goal, diet, allergen checkboxes, budget, max minutes, meal-prep toggle). One-line privacy note. Submit builds the plan.
2. **Weekly plan**: day selector or a scrollable week; each slot is a card (name, time, cost); a weekly cost vs. budget bar; a per-day MyPlate group indicator; empty slots explain why ("No vegetarian snacks under 20 min, so try raising cook time").
3. **Recipe detail** (sheet/modal): ingredients, steps, prep time, cost, an "Estimated nutrition" panel with its source line, and a **Swap** button.
4. **Swap sheet**: options list (name, time, cost, key nutrient for the goal); choosing one updates the plan and grocery list immediately, with a brief confirmation toast.
5. **Grocery list**: grouped by section, merged quantities, "used in" hint, checkboxes; checked state is kept in a Map keyed by item `key`, so it survives swaps for items still on the list; estimated total.
6. **Sources & notes**: short list of the health sources (from research.md) and a one-line "Nutrition values are estimates, not medical advice."

State lives in memory (no localStorage needed). Accessible basics: real buttons/labels, focus visible, sufficient contrast. Also write `README.md` (run instructions + a 2-minute demo script: Maya → swap → grocery update → Jordan) and append a "Design decisions" section to `docs/research.md` (how swapping affects the plan and list, the allergen safety approach, privacy).

### Task 4: End-to-end browser verification

Serve the site and walk the full demo in a real browser for both profiles: questionnaire → plan → recipe detail → swap → grocery list updated (shared ingredient retained, its checkbox still checked; the swapped-out-only ingredient removed). Confirm that no peanut recipe ever appears for Maya and no dairy for Jordan, in the plan or in swap options. Report the bugs found; fixes go through the fix loop.
