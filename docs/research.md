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
