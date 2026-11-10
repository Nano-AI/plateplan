# PlatePlan Research

## Sources and how the app used them

| Source | URL | What PlatePlan took from it |
|---|---|---|
| USDA MyPlate | https://www.myplate.gov | Five food groups (fruits, vegetables, grains, protein, dairy) tag every recipe (`foodGroups`) and drive the per-day food-group check. Half the plate fruits and vegetables shaped the produce-heavy recipes. |
| Dietary Guidelines for Americans, 2025-2030 (HHS/USDA) | https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines/current-dietary-guidelines | Emphasis on whole, nutrient-dense foods and limiting highly processed foods and added sugar: recipes are cooked from basic staples (beans, oats, eggs, produce), with no sugary or ultra-processed items. Protein-forward options for the muscle goal. |
| FDA major food allergens | https://www.fda.gov/food/food-allergies/food-allergen-labeling-and-consumer-protection-act-2004-falcpa (sesame added by the FASTER Act, 2021) | The allergen vocabulary is the nine FDA majors: milk, egg, fish, crustacean shellfish, tree nuts, peanuts, wheat, soy, sesame. Allergens are stored per ingredient (soy sauce is soy + wheat), and the plan and swaps filter at that level. |
| USDA FoodData Central | https://fdc.nal.usda.gov | Calories, protein, carbs, fat and fiber per serving are estimates built from FoodData Central values for the ingredients, always labeled "Estimated" with this source. They are not lab-measured. |

## Competitor gap list

Sources: https://www.mealime.com, https://www.eatthismuch.com, https://www.plantoeat.com. Pricing and feature notes come from reviews and vary by source, so verify before quoting.

| Gap | Observed | PlatePlan response |
|---|---|---|
| Cost | Eat This Much weekly plans and grocery automation are paid (about $9/mo or $60/yr); Mealime Pro and Plan to Eat run about $50/yr. Plan to Eat has no free tier. | Free, and a weekly budget is a first-class input. |
| Student constraints | Apps center on families or macro targets, not "$45 a week, 20 minutes, one burner". | Questionnaire asks for budget and max cook time and filters recipes on both. |
| Allergen safety | Allergies usually appear as a preference filter. | Ingredient-level allergens; no meal or swap option can contain a marked allergen. |
| Reuse across the week | Lists are per recipe. | Staples are shared across recipes and merged into one grocery list by section. |
| Trust and privacy | Account and sign-up required. | No backend, nothing leaves the browser, fictional demo profiles. |
| Explain empty slots | Not visible. | Empty slots say why (for example "no peanut-free snack under 20 min"). |

## Principles applied

1. **MyPlate balance**: each day is checked against the five food groups.
2. **Whole foods first** (DGA): simple staple ingredients over processed products.
3. **Protein for goals** (DGA): muscle profile gets meal-prep recipes with 25 g+ protein per serving.
4. **Allergen-aware by construction** (FDA): FDA nine, tracked per ingredient.
5. **Honest nutrition**: values are estimates and cite FoodData Central.

## Image credits

Sample photos for the mock "Snap your fridge" scan, all free to use under the [Unsplash License](https://unsplash.com/license). Stored in `assets/`, resized to 800 px, never hotlinked.

| File | Photo | Photographer | Source |
|---|---|---|---|
| `assets/fridge.jpg` | Fridge with fresh fruits and vegetables | Onur Burak Akın | https://unsplash.com/photos/gC-cKJebRhg |
| `assets/pantry.jpg` | Row of jars of grains and lentils | Steven Ungermann | https://unsplash.com/photos/e6PwBakXOJM |
| `assets/market.jpg` | Basket of tomatoes and vegetables, Paris farmers market | Anurag Arora | https://unsplash.com/photos/4_TruUQJWnY |
| `assets/dorm-fridge.jpg` | Refrigerator filled with food containers | Matheus Araujo | https://unsplash.com/photos/tOneNg7t0cM |

## Design decisions

- **Swapping.** A swap replaces one meal on one day with another recipe of the same meal type. The options come from the same eligibility filter as the plan (diet, allergens, cook time), ranked by the profile's goal, so a swap can never bring in a marked allergen. The app only accepts recipe ids that the swap list offered. The plan is the single source of truth: the cost bar, the per-day MyPlate check and the grocery list are recomputed from it after every swap, so nothing can drift out of sync. Swapping a meal-prep day breaks that day out of its batch run; the rest of the run stays.
- **Grocery list after a swap.** Ingredients are merged by name + unit across the week. Shopping checkmarks are stored by that item key, not by position, so an item still needed after a swap keeps its checkmark (its quantity may change), and an item no longer needed simply drops off. Rebuilding the plan from the profile clears the checkmarks.
- **Allergen safety.** Allergens are tracked per ingredient (FDA nine), and a recipe is excluded if any ingredient carries a marked allergen. The UI repeats this where it matters: the allergy question says no meal or swap will contain them, and the swap sheet states that every option is free of them. When nothing fits a slot, the card names the filter that ruled everything out instead of quietly loosening a safety rule.
- **Privacy.** No backend, no accounts, no storage: the profile and plan live in page memory and vanish on reload. The demo people are fictional, and the questionnaire says in one line that nothing leaves the browser.
- **Visual design (AI-assisted).** Designed with Claude's frontend-design skill. Green gingham tablecloth backdrop with a phone frame, basil/celery/yolk palette, Bricolage Grotesque headings and Atkinson Hyperlegible body text (built for legibility). The signature element is a small MyPlate plate on each day that fills in each food group's colour, so the week's balance is visible at a glance. Accessibility basics: real buttons, labels and fieldsets, visible focus rings, a native `<dialog>` for sheets (focus trap and Esc), and reduced motion respected.
- **Snap your fridge (mock).** The proposal says a plan should use "as much of a plan as the food they have allows", so the questionnaire has an optional fridge photo step. There is no image recognition: each sample photo maps to a preset list of ingredient names from the recipe data, and an uploaded photo gets a preset "typical fridge" list. The screen says so ("Mock scan"), and the chips can be removed or added to match the photo. The uploaded image stays in the browser as an object URL and is never sent anywhere. In the engine, each pantry ingredient a recipe uses lifts its goal score by 10%, which is enough to break near ties without beating a much better match. Allergen, diet and time filtering run first and are unchanged, so a pantry item can never bring in an unsafe recipe. Pantry items show "Have it" on the grocery list and start ticked.
