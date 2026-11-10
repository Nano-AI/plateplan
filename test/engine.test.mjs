import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isEligible, buildPlan, swapOptions, applySwap, planCost,
  groceryList, dayFoodGroups, emptySlotReason,
} from '../src/engine.js';

const ing = (name, qty, unit, section, allergens = []) => ({ name, qty, unit, section, allergens });
const r = (id, mealType, o = {}) => ({
  id, name: id, mealType, diets: ['vegetarian'], prepMinutes: 10, servings: 1,
  costPerServing: 2, mealPrep: false, foodGroups: ['grains'],
  ingredients: [ing('rolled oats', 0.5, 'cup', 'Pantry')], steps: [],
  nutrition: { calories: 400, protein: 10, carbs: 50, fat: 10, fiber: 5 }, source: 'test', ...o,
});
const profile = (o = {}) => ({
  name: 'T', goal: 'balanced', diet: 'none', allergens: [], budget: 1000, maxMinutes: 60, mealPrep: false, ...o,
});
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
const allIds = (plan) => plan.days.flatMap((d) => SLOTS.map((s) => d.meals[s]));

const PB = r('pb-toast', 'breakfast', { ingredients: [ing('bread', 2, 'slice', 'Bakery', ['wheat']), ing('peanut butter', 2, 'tbsp', 'Pantry', ['peanuts'])] });
const OATS = r('oats', 'breakfast', { ingredients: [ing('rolled oats', 0.5, 'cup', 'Pantry'), ing('banana', 1, 'whole', 'Produce')] });
const CHICKEN = r('chicken-bowl', 'dinner', { diets: [], ingredients: [ing('chicken breast', 6, 'oz', 'Meat & Seafood')] });
const SLOW = r('slow-stew', 'dinner', { prepMinutes: 90 });
const TOFU = r('tofu-stirfry', 'dinner', { diets: ['vegetarian', 'vegan'], ingredients: [ing('tofu', 7, 'oz', 'Produce', ['soy'])] });
const LUNCH = r('bean-wrap', 'lunch', { ingredients: [ing('black beans', 0.5, 'cup', 'Pantry'), ing('banana', 1, 'whole', 'Produce')] });
const SNACK = r('apple', 'snack', { foodGroups: ['fruits'], ingredients: [ing('apple', 1, 'whole', 'Produce')] });
const BASE = [PB, OATS, CHICKEN, SLOW, TOFU, LUNCH, SNACK];

test('isEligible: ingredient-level allergen, diet, and time filters', () => {
  assert.equal(isEligible(PB, profile({ allergens: ['peanuts'] })), false);
  assert.equal(isEligible(PB, profile({ allergens: ['dairy'] })), true);
  assert.equal(isEligible(CHICKEN, profile({ diet: 'vegetarian' })), false);
  assert.equal(isEligible(TOFU, profile({ diet: 'vegan' })), true);
  assert.equal(isEligible(SLOW, profile({ maxMinutes: 20 })), false);
  assert.equal(isEligible(SLOW, profile({ maxMinutes: 90 })), true);
});

test('buildPlan: 7 days Sunday..Saturday with 4 slots each', () => {
  const plan = buildPlan(BASE, profile());
  assert.deepEqual(plan.days.map((d) => d.day), ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  for (const d of plan.days) assert.deepEqual(Object.keys(d.meals).sort(), [...SLOTS].sort());
});

test('buildPlan: allergen recipes never appear in the plan', () => {
  const plan = buildPlan(BASE, profile({ allergens: ['peanuts', 'soy'] }));
  const ids = allIds(plan);
  assert.ok(!ids.includes('pb-toast'));
  assert.ok(!ids.includes('tofu-stirfry'));
  assert.ok(ids.includes('oats'));
});

test('buildPlan: diet and time filtering', () => {
  const ids = allIds(buildPlan(BASE, profile({ diet: 'vegetarian', maxMinutes: 20 })));
  assert.ok(!ids.includes('chicken-bowl'));
  assert.ok(!ids.includes('slow-stew'));
  assert.ok(ids.includes('tofu-stirfry'));
});

test('buildPlan: null slots when nothing fits, and emptySlotReason explains why', () => {
  const p = profile({ diet: 'vegan', maxMinutes: 20, allergens: ['soy'] });
  const plan = buildPlan(BASE, p);
  assert.ok(plan.days.every((d) => d.meals.dinner === null));
  assert.ok(plan.days.every((d) => d.meals.lunch === null)); // bean-wrap is vegetarian only
  assert.match(emptySlotReason(BASE, p, 'dinner'), /diet|vegan|allerg|soy|time/i);
  assert.match(emptySlotReason(BASE, profile({ allergens: ['soy'], diet: 'vegan' }), 'dinner'), /soy|allerg/i);
  assert.match(emptySlotReason([SLOW], profile({ maxMinutes: 20 }), 'dinner'), /20|minute|time/i);
  assert.match(emptySlotReason([CHICKEN], profile({ diet: 'vegetarian' }), 'dinner'), /vegetarian/i);
  assert.match(emptySlotReason([], profile(), 'snack'), /snack/i);
  assert.equal(emptySlotReason(BASE, profile(), 'snack'), null);
});

test('buildPlan: no nulls when a small pool exists (repeats allowed)', () => {
  const plan = buildPlan([OATS], profile());
  assert.ok(plan.days.every((d) => d.meals.breakfast === 'oats'));
});

test('buildPlan: variety caps (3 days normally, 4 for lunch/dinner with mealPrep)', () => {
  const many = ['a', 'b', 'c', 'd', 'e'].flatMap((x, i) => [
    r(`b-${x}`, 'breakfast', { nutrition: { calories: 300, protein: 10 + i, carbs: 40, fat: 5, fiber: 4 } }),
    r(`d-${x}`, 'dinner', { mealPrep: i < 3, nutrition: { calories: 500, protein: 20 + i, carbs: 50, fat: 10, fiber: 6 } }),
  ]);
  const count = (plan, slot) => {
    const c = {};
    for (const d of plan.days) c[d.meals[slot]] = (c[d.meals[slot]] || 0) + 1;
    return Math.max(...Object.values(c));
  };
  const normal = buildPlan(many, profile({ goal: 'muscle' }));
  assert.ok(count(normal, 'breakfast') <= 3);
  assert.ok(count(normal, 'dinner') <= 3);
  const prep = buildPlan(many, profile({ goal: 'muscle', mealPrep: true }));
  assert.ok(count(prep, 'dinner') <= 4);
  assert.ok(count(prep, 'breakfast') <= 3);
});

test('buildPlan: mealPrep uses mealPrep recipes in consecutive runs starting Sunday', () => {
  const recipes = [
    r('d-prep1', 'dinner', { mealPrep: true }), r('d-prep2', 'dinner', { mealPrep: true }),
    r('d-fresh', 'dinner', { foodGroups: ['grains', 'protein', 'vegetables'] }),
  ];
  const dinners = buildPlan(recipes, profile({ mealPrep: true })).days.map((d) => d.meals.dinner);
  assert.ok(!dinners.includes('d-fresh'));
  const runs = dinners.filter((id, i) => id !== dinners[i - 1]).length;
  assert.equal(runs, 2);
  assert.equal(dinners[0], dinners[3]);
});

test('buildPlan: goal changes which recipe ranks first', () => {
  const hiP = r('hi-protein', 'breakfast', { nutrition: { calories: 600, protein: 40, carbs: 30, fat: 20, fiber: 2 } });
  const lowCal = r('low-cal', 'breakfast', { nutrition: { calories: 150, protein: 5, carbs: 20, fat: 2, fiber: 3 } });
  const fiber = r('hi-fiber', 'breakfast', { nutrition: { calories: 450, protein: 8, carbs: 80, fat: 5, fiber: 15 } });
  const groups = r('many-groups', 'breakfast', { foodGroups: ['grains', 'fruits', 'dairy', 'protein'] });
  const rs = [hiP, lowCal, fiber, groups];
  assert.equal(buildPlan(rs, profile({ goal: 'muscle' })).days[0].meals.breakfast, 'hi-protein');
  assert.equal(buildPlan(rs, profile({ goal: 'weight-loss' })).days[0].meals.breakfast, 'low-cal');
  assert.equal(buildPlan(rs, profile({ goal: 'energy' })).days[0].meals.breakfast, 'hi-fiber');
  assert.equal(buildPlan(rs, profile({ goal: 'balanced' })).days[0].meals.breakfast, 'many-groups');
});

test('buildPlan: budget cap reduces cost without violating eligibility', () => {
  const rs = [
    r('pricey', 'breakfast', { costPerServing: 9, foodGroups: ['grains', 'fruits', 'dairy'] }),
    r('pricey2', 'breakfast', { costPerServing: 8, foodGroups: ['grains', 'fruits', 'dairy'] }),
    r('pricey3', 'breakfast', { costPerServing: 7, foodGroups: ['grains', 'fruits', 'dairy'] }),
    r('cheap', 'breakfast', { costPerServing: 1 }),
    r('cheap2', 'breakfast', { costPerServing: 1.5 }),
    r('cheap3', 'breakfast', { costPerServing: 1.2 }),
    r('cheap-peanut', 'breakfast', { costPerServing: 0.1, ingredients: [ing('peanut butter', 1, 'tbsp', 'Pantry', ['peanuts'])] }),
  ];
  const free = buildPlan(rs, profile({ budget: 1000, allergens: ['peanuts'] }));
  const capped = buildPlan(rs, profile({ budget: 15, allergens: ['peanuts'] }));
  assert.ok(planCost(capped, rs) < planCost(free, rs));
  assert.ok(planCost(capped, rs) <= 15);
  assert.ok(!allIds(capped).includes('cheap-peanut'));
  assert.ok(capped.days.every((d) => d.meals.breakfast !== null));
});

test('swapOptions: same mealType, eligible only (ingredient allergens), excludes current, goal-sorted', () => {
  const extra = r('greek-yogurt', 'breakfast', { foodGroups: ['dairy', 'fruits', 'grains'], ingredients: [ing('greek yogurt', 1, 'cup', 'Dairy & Eggs', ['dairy'])] });
  const rs = [...BASE, extra, r('toast', 'breakfast', { foodGroups: ['grains', 'fruits'] })];
  const p = profile({ allergens: ['peanuts'] });
  const plan = buildPlan(rs, p);
  const current = plan.days[0].meals.breakfast;
  const opts = swapOptions(rs, p, plan, 0, 'breakfast');
  const ids = opts.map((x) => x.id);
  assert.ok(!ids.includes('pb-toast'));
  assert.ok(!ids.includes(current));
  assert.ok(opts.every((x) => x.mealType === 'breakfast'));
  assert.deepEqual(ids, ids.slice().sort((a, b) => rs.find((x) => x.id === b).foodGroups.length - rs.find((x) => x.id === a).foodGroups.length || a.localeCompare(b)));
  const noDairy = swapOptions(rs, profile({ allergens: ['dairy'] }), plan, 0, 'breakfast').map((x) => x.id);
  assert.ok(!noDairy.includes('greek-yogurt'));
});

test('applySwap returns a new plan and does not mutate', () => {
  const plan = buildPlan(BASE, profile());
  const before = JSON.stringify(plan);
  const next = applySwap(plan, 2, 'breakfast', 'pb-toast');
  assert.equal(JSON.stringify(plan), before);
  assert.notEqual(next, plan);
  assert.equal(next.days[2].meals.breakfast, 'pb-toast');
});

const mkPlan = (rows) => ({ days: rows.map((meals, i) => ({ day: `D${i}`, meals: { breakfast: null, lunch: null, dinner: null, snack: null, ...meals } })) });

test('planCost sums costPerServing over filled slots', () => {
  const plan = mkPlan([{ breakfast: 'oats', snack: 'apple' }, { breakfast: 'oats' }]);
  assert.equal(planCost(plan, [r('oats', 'breakfast', { costPerServing: 1.25 }), r('apple', 'snack', { costPerServing: 0.5 })]), 3);
});

test('groceryList merges duplicates by name+unit, scales by occurrences/servings, sorts sections', () => {
  const batch = r('chili', 'dinner', { servings: 4, ingredients: [ing('black beans', 2, 'cup', 'Pantry'), ing('onion', 1, 'whole', 'Produce')] });
  const rs = [OATS, LUNCH, batch];
  const plan = mkPlan([{ breakfast: 'oats', lunch: 'bean-wrap', dinner: 'chili' }, { breakfast: 'oats', dinner: 'chili' }]);
  const list = groceryList(plan, rs);
  assert.deepEqual(list.map((s) => s.section), ['Produce', 'Pantry']);
  const items = list.flatMap((s) => s.items);
  const banana = items.find((x) => x.key === 'banana|whole');
  assert.equal(banana.qty, 3); // 2 oats + 1 wrap
  assert.deepEqual(banana.usedIn.sort(), ['bean-wrap', 'oats']);
  assert.equal(items.find((x) => x.key === 'black beans|cup').qty, 1.5); // 0.5 wrap + 2*2/4 chili
  assert.equal(items.find((x) => x.key === 'onion|whole').qty, 0.5);
  assert.equal(items.find((x) => x.key === 'rolled oats|cup').qty, 1);
  assert.equal(new Set(items.map((x) => x.key)).size, items.length);
});

test('groceryList after swap: shared ingredient stays, exclusive one disappears', () => {
  const plan = mkPlan([{ breakfast: 'oats', lunch: 'bean-wrap' }]);
  const swapped = applySwap(plan, 0, 'lunch', 'apple'); // apple is a snack recipe but fine for list math
  const keys = groceryList(swapped, BASE).flatMap((s) => s.items.map((x) => x.key));
  assert.ok(keys.includes('banana|whole')); // still used by oats
  assert.ok(!keys.includes('black beans|cup')); // only in bean-wrap
  assert.ok(keys.includes('apple|whole'));
});

test('dayFoodGroups returns the set of MyPlate groups for that day', () => {
  const plan = mkPlan([{ breakfast: 'oats', snack: 'apple' }]);
  assert.deepEqual([...dayFoodGroups(plan, 0, BASE)].sort(), ['fruits', 'grains']);
});

test('buildPlan is deterministic', () => {
  const p = profile({ goal: 'muscle', mealPrep: true, budget: 20 });
  assert.deepEqual(buildPlan(BASE, p), buildPlan(BASE, p));
});

test('pantry: a modest bonus for recipes using pantry ingredients changes ranking in buildPlan and swapOptions', () => {
  const plain = r('a-plain', 'breakfast', { nutrition: { calories: 400, protein: 21, carbs: 50, fat: 10, fiber: 5 } });
  const usesPantry = r('b-banana', 'breakfast', { nutrition: { calories: 400, protein: 20, carbs: 50, fat: 10, fiber: 5 },
    ingredients: [ing('rolled oats', 0.5, 'cup', 'Pantry'), ing('banana', 1, 'whole', 'Produce')] });
  const strong = r('c-strong', 'breakfast', { nutrition: { calories: 400, protein: 40, carbs: 50, fat: 10, fiber: 5 } });
  const rs = [plain, usesPantry];
  assert.equal(buildPlan(rs, profile({ goal: 'muscle' })).days[0].meals.breakfast, 'a-plain');
  const p = profile({ goal: 'muscle', pantry: ['banana'] });
  const plan = buildPlan(rs, p);
  assert.equal(plan.days[0].meals.breakfast, 'b-banana');
  const all = [...rs, strong];
  const opts = (pr) => swapOptions(all, pr, mkPlan([{ breakfast: 'x' }]), 0, 'breakfast').map((x) => x.id);
  assert.deepEqual(opts(profile({ goal: 'muscle' })), ['c-strong', 'a-plain', 'b-banana']);
  // Modest: the pantry recipe moves past a near tie, not past a much better match.
  assert.deepEqual(opts(p), ['c-strong', 'b-banana', 'a-plain']);
  assert.deepEqual(opts(profile({ goal: 'muscle', pantry: [] })), opts(profile({ goal: 'muscle' })));
});

test('pantry: never makes an ineligible recipe eligible (allergens, diet)', () => {
  const p = profile({ allergens: ['peanuts'], diet: 'vegetarian', pantry: ['peanut butter', 'bread', 'chicken breast'] });
  const plan = buildPlan(BASE, p);
  assert.ok(!allIds(plan).includes('pb-toast'));
  assert.ok(!allIds(plan).includes('chicken-bowl'));
  for (const [i, slot] of [[0, 'breakfast'], [3, 'dinner']]) {
    const ids = swapOptions(BASE, p, plan, i, slot).map((x) => x.id);
    assert.ok(!ids.includes('pb-toast') && !ids.includes('chicken-bowl'));
  }
});
