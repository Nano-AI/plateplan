// PlatePlan planning engine: pure functions, no DOM, deterministic.

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
export const SECTIONS = ['Produce', 'Pantry', 'Dairy & Eggs', 'Meat & Seafood', 'Frozen', 'Bakery'];

const hasAllergen = (recipe, allergens) =>
  recipe.ingredients.some((i) => i.allergens.some((a) => allergens.includes(a)));
const fitsDiet = (recipe, diet) => diet === 'none' || recipe.diets.includes(diet);

export function isEligible(recipe, profile) {
  return !hasAllergen(recipe, profile.allergens) && fitsDiet(recipe, profile.diet) && recipe.prepMinutes <= profile.maxMinutes;
}

function score(recipe, goal) {
  const n = recipe.nutrition;
  if (goal === 'muscle') return n.protein;
  if (goal === 'weight-loss') return -n.calories;
  if (goal === 'energy') return n.fiber + n.carbs;
  return recipe.foodGroups.length;
}

// Pantry bonus: each pantry ingredient a recipe uses lifts its goal score by 10% (of its size, so it
// scales across goals). Modest on purpose: it breaks near ties, it does not beat a much better match.
function pantryScore(recipe, profile) {
  const s = score(recipe, profile.goal), pantry = profile.pantry ?? [];
  return s + 0.1 * Math.abs(s) * recipe.ingredients.filter((i) => pantry.includes(i.name)).length;
}

// Eligible recipes of one meal type, best score first (id breaks ties so output is stable).
// Eligibility (allergens, diet, time) filters first; the pantry only reorders what is left.
function ranked(recipes, profile, mealType) {
  return recipes
    .filter((r) => r.mealType === mealType && isEligible(r, profile))
    .sort((a, b) => pantryScore(b, profile) - pantryScore(a, profile) || a.id.localeCompare(b.id));
}

const capFor = (slot, profile) => (profile.mealPrep && (slot === 'lunch' || slot === 'dinner') ? 4 : 3);

export function buildPlan(recipes, profile) {
  const days = DAYS.map((day) => ({ day, meals: {} }));
  const pools = {};
  for (const slot of SLOTS) {
    let pool = ranked(recipes, profile, slot);
    const cap = capFor(slot, profile);
    const prep = cap === 4;
    if (prep) pool = [...pool.filter((r) => r.mealPrep), ...pool.filter((r) => !r.mealPrep)];
    pools[slot] = pool;
    // Use just enough top options to fill 7 days within the cap; fewer exist -> repeats.
    const top = pool.slice(0, Math.ceil(7 / cap));
    days.forEach((d, i) => {
      // mealPrep: consecutive runs (Sun-Wed, Thu-Sat); otherwise rotate day by day.
      const pick = prep ? top[Math.min(Math.floor(i / cap), top.length - 1)] : top[i % top.length];
      d.meals[slot] = pick ? pick.id : null;
    });
  }

  // Budget: best-effort. Swap the priciest slot for the best-scored cheaper eligible option
  // that stays within the variety cap, until it fits or nothing can get cheaper.
  const byId = Object.fromEntries(recipes.map((r) => [r.id, r]));
  const plan = { days };
  while (planCost(plan, recipes) > profile.budget) {
    const filled = days.flatMap((d) => SLOTS.filter((s) => d.meals[s]).map((s) => ({ d, s, cost: byId[d.meals[s]].costPerServing })));
    filled.sort((a, b) => b.cost - a.cost);
    const swap = filled.find(({ d, s, cost }) => {
      const used = (id) => days.filter((x) => x.meals[s] === id).length;
      const alt = pools[s].find((r) => r.costPerServing < cost && used(r.id) < capFor(s, profile));
      if (alt) d.meals[s] = alt.id;
      return alt;
    });
    if (!swap) break;
  }
  return plan;
}

export function swapOptions(recipes, profile, plan, dayIndex, slot) {
  const current = plan.days[dayIndex].meals[slot];
  return ranked(recipes, profile, slot).filter((r) => r.id !== current);
}

export function applySwap(plan, dayIndex, slot, recipeId) {
  const next = structuredClone(plan);
  next.days[dayIndex].meals[slot] = recipeId;
  return next;
}

const round2 = (x) => Math.round(x * 100) / 100;

// Each filled slot -> its recipe (one entry per occurrence).
const occurrences = (plan, recipes) =>
  plan.days.flatMap((d) => SLOTS.map((s) => recipes.find((r) => r.id === d.meals[s])).filter(Boolean));

export function planCost(plan, recipes) {
  return round2(occurrences(plan, recipes).reduce((sum, r) => sum + r.costPerServing, 0));
}

export function groceryList(plan, recipes) {
  const items = new Map();
  for (const r of occurrences(plan, recipes)) {
    for (const i of r.ingredients) {
      const key = `${i.name}|${i.unit}`;
      if (!items.has(key)) items.set(key, { key, name: i.name, qty: 0, unit: i.unit, section: i.section, usedIn: [] });
      const item = items.get(key);
      item.qty += i.qty / r.servings;
      if (!item.usedIn.includes(r.name)) item.usedIn.push(r.name);
    }
  }
  const all = [...items.values()].sort((a, b) => a.name.localeCompare(b.name));
  return SECTIONS.map((section) => ({
    section,
    items: all.filter((x) => x.section === section).map(({ section: _, ...x }) => ({ ...x, qty: round2(x.qty) })),
  })).filter((s) => s.items.length);
}

export function dayFoodGroups(plan, dayIndex, recipes) {
  const day = { days: [plan.days[dayIndex]] };
  return new Set(occurrences(day, recipes).flatMap((r) => r.foodGroups));
}

// Why a slot is empty: the filter that removed the last candidates. null if something fits.
export function emptySlotReason(recipes, profile, mealType) {
  let pool = recipes.filter((r) => r.mealType === mealType);
  if (!pool.length) return `No ${mealType} recipes in the library yet.`;
  pool = pool.filter((r) => !hasAllergen(r, profile.allergens));
  if (!pool.length) return `Every ${mealType} option contains an allergen you marked (${profile.allergens.join(', ')}).`;
  pool = pool.filter((r) => fitsDiet(r, profile.diet));
  if (!pool.length) return `No allergen-safe ${mealType} option is ${profile.diet}.`;
  pool = pool.filter((r) => r.prepMinutes <= profile.maxMinutes);
  if (!pool.length) return `Every remaining ${mealType} option takes longer than ${profile.maxMinutes} minutes.`;
  return null;
}
