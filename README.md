# PlatePlan

A clickable prototype of a meal planner for college students. Answer a short questionnaire and get seven days of breakfast, lunch, dinner and snacks that fit your budget, cooking time, diet and allergies, plus one merged grocery list for the week.

It is a plain static site: `index.html` plus ES modules, with no build step, no frameworks and no dependencies. Nothing leaves the browser.

## Run it

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. It has to be served (ES modules don't load from `file://`). On a laptop the app sits in a phone frame; on a phone it fills the screen.

Tests for the planning engine: `node --test test/*.mjs`

## Files

| File | What it is |
|---|---|
| `data/recipes.js` | 36 recipes with per-ingredient allergens, cost and estimated nutrition |
| `src/engine.js` | Pure planning logic: eligibility, plan building, swaps, cost, grocery list, MyPlate check |
| `src/app.js` | The UI: render functions and one delegated event handler |
| `src/styles.css` | Styles |
| `docs/research.md` | Sources, competitor gaps and design decisions |

## 2-minute demo script

1. **Questionnaire (20 s).** Point out the privacy line. Tap **Maya** (vegetarian, $45, 20 min, peanut allergy). The form fills in. Tap **Build my week**.
2. **Plan (30 s).** Show the budget bar ($45.00 of $45), the little MyPlate plate on each day, and Sunday's note: "4 of 5 MyPlate groups, missing fruits."
3. **Recipe detail (20 s).** Tap Sunday's breakfast (Tofu Scramble). Show ingredients, steps, time, cost and the **Estimated nutrition** panel with its USDA FoodData Central source line.
4. **Swap (30 s).** Tap **Swap this meal**. The list says every option is vegetarian and peanut-free. Pick **Overnight Oats with Berries**. The toast confirms, Sunday's plate fills to 5 of 5, and the budget bar moves to $45.30, turning red because it's $0.30 over.
5. **Grocery list (20 s).** Open **Groceries**: items are merged and grouped by aisle, with "Used in" hints. Milk is now on the list because of the oats. Tick spinach, go back and swap the breakfast again, and spinach stays ticked.
6. **Jordan (20 s).** Open **Profile**, tap **Jordan** (dairy-free, $70, 45 min, Sunday meal prep), then **Rebuild my plan**. Lunches and dinners now repeat in "Batch cook" runs, the meals are protein-heavy, and no dairy appears on the grocery list.

Optional: set Diet to Vegan and Max cook time to 5 to show the empty-slot cards explaining why nothing fits.

Profiles are fictional. Nutrition values are estimates, not medical advice.
