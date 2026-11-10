# PlatePlan

A clickable prototype of a meal planner for college students. Answer a short questionnaire and get seven days of breakfast, lunch, dinner and snacks that fit your budget, cooking time, diet and allergies, plus one merged grocery list for the week.

It is a plain static site: `index.html` plus ES modules, with no build step, no frameworks and no dependencies. Nothing leaves the browser.

## Run it

From the project folder:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. It has to be served (ES modules don't load from `file://`). On a laptop the app sits in a phone frame; on a phone it fills the screen.

Tests for the planning engine: `node --test test/*.mjs`

## Files

| File | What it is |
|---|---|
| `data/recipes.js` | 40 recipes with per-ingredient allergens, cost and estimated nutrition |
| `src/engine.js` | Pure planning logic: eligibility, plan building, swaps, cost, grocery list, MyPlate check |
| `src/app.js` | The UI: render functions and one delegated event handler |
| `src/styles.css` | Styles |
| `docs/research.md` | Sources, competitor gaps and design decisions |
| `assets/` | Four sample fridge and pantry photos (Unsplash) for the mock scan |

## 2-minute demo script

1. **Questionnaire (20 s).** Point out the privacy line. Tap **Maya** (vegetarian, $45, 20 min, peanut allergy). The form fills in. Tap **Build my week**.
2. **Plan (30 s).** Show the budget bar ($44.80 of $45) and the little MyPlate plate on each day: every day of Maya's week fills all five food groups. Tap **Thu**.
3. **Recipe detail (20 s).** Tap Thursday's dinner (Veggie Pita Pizza). Show ingredients, steps, time, cost and the **Estimated nutrition** panel with its USDA FoodData Central source line.
4. **Grocery list, before (15 s).** Close the sheet, open **Groceries**: 31 items merged and grouped by aisle, with "Used in" hints. Tick **spinach** and **mozzarella cheese**.
5. **Swap (25 s).** Back to **Plan**, Thursday dinner, **Swap this meal**. The sheet says every option is vegetarian and free of peanuts, with estimated nutrition. Pick **Veggie Marinara Pasta**. The toast confirms and the budget drops to $44.40.
6. **Grocery list, after (10 s).** Open **Groceries**: now 29 items. Mozzarella and bell pepper are gone (only the pizza used them), and spinach is still ticked because other meals still need it.
7. **Jordan (20 s).** Open **Profile**, tap **Jordan** (dairy-free, $70, 45 min, Sunday meal prep), then **Rebuild my plan**. Lunches and dinners now repeat in "Batch cook" runs, the meals are protein-heavy ($60.80 of $70), and no dairy appears on the grocery list.
8. **Snap your fridge (30 s, optional, after the numbers above).** Open **Profile**, tap **Maya**, then under **Snap your fridge** tap the **Farmers-market haul** sample. After a short "Scanning…" it lists 8 ingredients as chips; remove one with its ✕ or add one from **+ add item**. Point out the "Mock scan" label: there is no real image recognition. **Rebuild my plan**: still $44.80, Thursday dinner is now Cheesy Broccoli Quinoa (meals using what you have rank a little higher), and on **Groceries** bell pepper, broccoli, cucumber, spinach and sweet potato say "Have it" and start ticked. **Upload fridge photo** takes your own picture (on a phone it offers the camera); it gets a preset "typical fridge" list and never leaves the browser.

Tips:
- When projecting, zoom the browser to 125–150% so the phone frame is readable from the back of the room.
- Don't lower Jordan's budget live: the budget step can split his meal-prep runs.
- Swaps only drop an ingredient when no other meal still uses it. Thursday dinner is the clearest example; swapping a meal whose ingredients appear elsewhere in the week changes quantities but keeps the items.
- The **Pantry shelf** sample includes peanut butter. With Maya's peanut allergy it still never appears in her plan or swaps: the photo only reorders safe meals.
- To show the empty-slot cards, set Diet to Vegan and Max cook time to 5: they explain why nothing fits.

Profiles are fictional. Nutrition values are estimates, not medical advice.
