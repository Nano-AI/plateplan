import test from "node:test";
import assert from "node:assert";
import { RECIPES } from "../data/recipes.js";

const TYPES = ["breakfast", "lunch", "dinner", "snack"];
const ALLERGENS = ["dairy", "eggs", "fish", "shellfish", "tree-nuts", "peanuts", "wheat", "soy", "sesame"];
const SECTIONS = ["Produce", "Pantry", "Dairy & Eggs", "Meat & Seafood", "Frozen", "Bakery"];
const GROUPS = ["fruits", "vegetables", "grains", "protein", "dairy"];
const MEAT = ["chicken breast", "ground turkey", "salmon fillet", "canned tuna"];
const NON_VEGAN = [...MEAT, "egg", "milk", "plain greek yogurt", "cottage cheese", "cheddar cheese", "feta cheese", "mozzarella cheese"];

test("dataset size and unique ids", () => {
  assert.ok(RECIPES.length >= 32 && RECIPES.length <= 40, `count ${RECIPES.length}`);
  assert.strictEqual(new Set(RECIPES.map((r) => r.id)).size, RECIPES.length);
});

test("every recipe matches the schema", () => {
  for (const r of RECIPES) {
    assert.match(r.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(r.name && TYPES.includes(r.mealType), r.id);
    assert.ok(r.diets.every((d) => ["vegetarian", "vegan"].includes(d)), r.id);
    assert.ok(Number.isInteger(r.prepMinutes) && r.prepMinutes > 0, r.id);
    assert.ok(Number.isInteger(r.servings) && r.servings > 0, r.id);
    assert.ok(typeof r.costPerServing === "number" && r.costPerServing > 0, r.id);
    assert.strictEqual(typeof r.mealPrep, "boolean");
    assert.ok(r.foodGroups.length && r.foodGroups.every((g) => GROUPS.includes(g)), r.id);
    assert.ok(r.steps.length >= 2 && r.steps.every((s) => typeof s === "string" && s), r.id);
    assert.ok(r.source.includes("FoodData Central"), r.id);
    for (const k of ["calories", "protein", "carbs", "fat", "fiber"]) {
      assert.ok(typeof r.nutrition[k] === "number" && r.nutrition[k] >= 0, `${r.id} ${k}`);
    }
    assert.ok(r.ingredients.length > 0);
    for (const i of r.ingredients) {
      assert.ok(i.name === i.name.toLowerCase() && i.qty > 0 && i.unit, `${r.id} ${i.name}`);
      assert.ok(SECTIONS.includes(i.section), `${r.id} ${i.name}`);
      assert.ok(i.allergens.every((a) => ALLERGENS.includes(a)), `${r.id} ${i.name}`);
    }
  }
});

test("same ingredient name always has same unit, section, allergens", () => {
  const seen = new Map();
  for (const i of RECIPES.flatMap((r) => r.ingredients)) {
    const sig = JSON.stringify([i.unit, i.section, i.allergens]);
    assert.strictEqual(seen.get(i.name) ?? sig, sig, i.name);
    seen.set(i.name, sig);
  }
});

test("diet tags and allergen spot checks are truthful", () => {
  for (const r of RECIPES) {
    const names = r.ingredients.map((i) => i.name);
    if (names.some((n) => MEAT.includes(n))) assert.deepStrictEqual(r.diets, [], r.id);
    if (r.diets.includes("vegan")) assert.ok(!names.some((n) => NON_VEGAN.includes(n)), r.id);
    if (!r.diets.includes("vegetarian")) assert.ok(names.some((n) => MEAT.includes(n)), `${r.id} untagged but meatless`);
  }
  const must = { "whole wheat bread": "wheat", "whole wheat pasta": "wheat", "whole wheat tortilla": "wheat", "whole wheat pita": "wheat",
    "soy sauce": "soy", "firm tofu": "soy", "peanut butter": "peanuts", "milk": "dairy", "cheddar cheese": "dairy",
    "plain greek yogurt": "dairy", "egg": "eggs", "canned tuna": "fish", "salmon fillet": "fish", "tahini": "sesame", "almond butter": "tree-nuts" };
  for (const i of RECIPES.flatMap((r) => r.ingredients)) {
    if (must[i.name]) assert.ok(i.allergens.includes(must[i.name]), i.name);
  }
});

test("Maya coverage: >=4 vegetarian, <=20 min, peanut-free, <=$3.50 per meal type", () => {
  const peanutFree = (r) => !r.ingredients.some((i) => i.allergens.includes("peanuts"));
  for (const t of TYPES) {
    const n = RECIPES.filter((r) => r.mealType === t && r.diets.includes("vegetarian") && r.prepMinutes <= 20 && peanutFree(r) && r.costPerServing <= 3.5).length;
    assert.ok(n >= 4, `${t}: ${n}`);
  }
});

test("Jordan coverage: >=4 dairy-free <=45 min; lunch/dinner >=3 mealPrep protein>=25", () => {
  const dairyFree = (r) => !r.ingredients.some((i) => i.allergens.includes("dairy"));
  for (const t of TYPES) {
    const pool = RECIPES.filter((r) => r.mealType === t && dairyFree(r) && r.prepMinutes <= 45);
    assert.ok(pool.length >= 4, `${t}: ${pool.length}`);
    if (t === "lunch" || t === "dinner") {
      const prep = pool.filter((r) => r.mealPrep && r.nutrition.protein >= 25).length;
      assert.ok(prep >= 3, `${t} prep: ${prep}`);
    }
  }
});

test("profiles diverge: dataset has meat/fish, peanuts, dairy, and >20 min recipes", () => {
  assert.ok(RECIPES.some((r) => r.diets.length === 0));
  assert.ok(RECIPES.some((r) => r.ingredients.some((i) => i.allergens.includes("peanuts"))));
  assert.ok(RECIPES.some((r) => r.ingredients.some((i) => i.allergens.includes("dairy"))));
  assert.ok(RECIPES.some((r) => r.prepMinutes > 20));
});
