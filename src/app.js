// PlatePlan UI: plain render functions + one delegated click/change/submit handler. State lives in memory only.
import { RECIPES } from '../data/recipes.js';
import { buildPlan, swapOptions, applySwap, planCost, groceryList, dayFoodGroups, emptySlotReason, DAYS, SLOTS } from './engine.js';

const DEMOS = {
  maya: { name: 'Maya', goal: 'energy', diet: 'vegetarian', allergens: ['peanuts'], budget: 45, maxMinutes: 20, mealPrep: false },
  jordan: { name: 'Jordan', goal: 'muscle', diet: 'none', allergens: ['dairy'], budget: 70, maxMinutes: 45, mealPrep: true },
};
const BLANK = { name: '', goal: 'balanced', diet: 'none', allergens: [], budget: 50, maxMinutes: 30, mealPrep: false };
const GOALS = { balanced: 'Balanced', energy: 'More energy', muscle: 'Build muscle', 'weight-loss': 'Weight loss' };
const DIETS = { none: 'No restriction', vegetarian: 'Vegetarian', vegan: 'Vegan' };
const ALLERGENS = { dairy: 'Dairy', eggs: 'Eggs', fish: 'Fish', shellfish: 'Shellfish', 'tree-nuts': 'Tree nuts', peanuts: 'Peanuts', wheat: 'Wheat', soy: 'Soy', sesame: 'Sesame' };
const SLOT_ICON = { breakfast: '🥣', lunch: '🥪', dinner: '🍲', snack: '🍎' };
const SECTION_ICON = { Produce: '🥬', Pantry: '🥫', 'Dairy & Eggs': '🥚', 'Meat & Seafood': '🍗', Frozen: '🧊', Bakery: '🍞' };
const GROUPS = ['fruits', 'vegetables', 'grains', 'protein', 'dairy'];
const SOURCES = [
  ['USDA MyPlate', 'https://www.myplate.gov', 'the five food groups behind the daily plate check'],
  ['Dietary Guidelines for Americans, 2025-2030', 'https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines/current-dietary-guidelines', 'whole foods, less added sugar, protein for active goals'],
  ['FDA major food allergens', 'https://www.fda.gov/food/food-allergies/food-allergen-labeling-and-consumer-protection-act-2004-falcpa', 'the nine allergens you can mark, tracked per ingredient'],
  ['USDA FoodData Central', 'https://fdc.nal.usda.gov', 'the source of every nutrition estimate'],
];

const byId = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
const state = { profile: null, draft: { ...BLANK }, plan: null, view: 'start', day: 0, sheet: null, checked: new Map(), demo: null };

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const money = (n) => `$${n.toFixed(2)}`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const FRACTIONS = { 0.25: '¼', 0.33: '⅓', 0.5: '½', 0.67: '⅔', 0.75: '¾' };
function qty(n, unit) {
  const whole = Math.floor(n), frac = Math.round((n - whole) * 100) / 100;
  const num = FRACTIONS[frac] ? `${whole || ''}${FRACTIONS[frac]}` : String(Math.round(n * 100) / 100);
  return unit === 'each' ? num : `${num} ${unit}`;
}
const whose = (p) => (p.name ? `${esc(p.name)}’s` : 'Your');
const safetyLine = (p) => [p.diet !== 'none' && DIETS[p.diet].toLowerCase(), p.allergens.length && `free of ${p.allergens.map((a) => ALLERGENS[a].toLowerCase()).join(', ')}`].filter(Boolean).join(' and ');

// MyPlate glyph: four quadrants plus the dairy cup; groups eaten that day are filled in their MyPlate colour.
function plate(groups, size) {
  const on = (g) => (groups.has(g) ? `var(--${g})` : 'var(--miss)');
  return `<svg class="plate" viewBox="0 0 100 80" width="${size}" height="${size * 0.8}" aria-hidden="true">
    <path d="M40 40H6A34 34 0 0 1 40 6z" fill="${on('fruits')}"/><path d="M40 40V6a34 34 0 0 1 34 34z" fill="${on('grains')}"/>
    <path d="M40 40h34a34 34 0 0 1-34 34z" fill="${on('protein')}"/><path d="M40 40v34A34 34 0 0 1 6 40z" fill="${on('vegetables')}"/>
    <circle cx="87" cy="14" r="10" fill="${on('dairy')}"/></svg>`;
}

function sources() {
  return `<details class="sources"><summary>Sources and notes</summary>
    <ul>${SOURCES.map(([name, url, use]) => `<li><a href="${url}" target="_blank" rel="noopener">${name}</a>: ${use}.</li>`).join('')}</ul>
    <p><strong>Nutrition values are estimates, not medical advice.</strong></p></details>`;
}

function formView() {
  const p = state.draft, first = !state.plan;
  const radios = (name, opts) => Object.entries(opts).map(([v, label]) =>
    `<label class="chip"><input type="radio" name="${name}" value="${v}" ${p[name] === v ? 'checked' : ''}><span>${label}</span></label>`).join('');
  const demo = (key, icon, blurb) => `<button type="button" class="demo" id="demo-${key}" data-action="demo" data-arg="${key}" aria-pressed="${state.demo === key}">
      <span class="avatar" aria-hidden="true">${icon}</span><span><strong>${DEMOS[key].name}</strong><small>${blurb}</small></span></button>`;
  return `
  ${first
    ? `<div class="hero"><h1 tabindex="-1">What’s on your plate this week?</h1>
       <p>Tell PlatePlan your budget, cooking time and allergies. It builds seven days of meals and one grocery list to match.</p></div>`
    : `<div class="hero small"><h1 tabindex="-1">Your profile</h1><p>Change anything, then rebuild. The grocery checklist starts fresh.</p></div>`}
  <section class="demos" aria-labelledby="demo-h"><h2 id="demo-h">Try a demo profile</h2>
    ${demo('maya', '🥑', 'Vegetarian, $45 a week, 20 min, peanut allergy')}
    ${demo('jordan', '🍗', 'Dairy-free, $70 a week, 45 min, Sunday meal prep')}
  </section>
  <form id="profile-form" class="form">
    <label class="field">Name <input name="name" maxlength="30" autocomplete="off" value="${esc(p.name)}" placeholder="Optional"></label>
    <fieldset><legend>Main goal</legend><div class="chips">${radios('goal', GOALS)}</div></fieldset>
    <fieldset><legend>Diet</legend><div class="chips">${radios('diet', DIETS)}</div></fieldset>
    <fieldset><legend>Allergies <small>No meal or swap will contain these.</small></legend><div class="chips">
      ${Object.entries(ALLERGENS).map(([v, label]) => `<label class="chip"><input type="checkbox" name="allergens" value="${v}" ${p.allergens.includes(v) ? 'checked' : ''}><span>${label}</span></label>`).join('')}
    </div></fieldset>
    <div class="pair">
      <label class="field">Weekly grocery budget <span class="affix"><span aria-hidden="true">$</span><input type="number" name="budget" min="10" max="500" step="1" required value="${p.budget}"></span></label>
      <label class="field">Max cook time <span class="affix"><input type="number" name="maxMinutes" min="5" max="120" step="5" required value="${p.maxMinutes}"><span aria-hidden="true">min</span></span></label>
    </div>
    <label class="toggle"><input type="checkbox" role="switch" name="mealPrep" ${p.mealPrep ? 'checked' : ''}>
      <span><strong>I meal-prep on Sundays</strong><small>Lunches and dinners repeat so you can cook them in batches.</small></span></label>
    <button type="submit" class="btn primary">${first ? 'Build my week' : 'Rebuild my plan'}</button>
    <p class="privacy"><span aria-hidden="true">🔒</span> Nothing you enter leaves this browser: no account, no server, and the demo people are fictional.</p>
  </form>
  ${sources()}`;
}

function slotCard(slot) {
  const id = state.plan.days[state.day].meals[slot];
  if (!id) {
    const why = emptySlotReason(RECIPES, state.profile, slot) || `No ${slot} option fits right now.`;
    return `<li class="slot empty" id="slot-${slot}"><span class="slot-icon" aria-hidden="true">${SLOT_ICON[slot]}</span>
      <div><p class="slot-type">${cap(slot)}</p><p class="slot-why">${esc(why)}${/longer than/.test(why) ? ' Try raising your max cook time.' : ''}</p>
      <button type="button" class="link" data-action="view" data-arg="profile">Edit profile</button></div></li>`;
  }
  const r = byId[id], prep = state.profile.mealPrep && r.mealPrep && (slot === 'lunch' || slot === 'dinner');
  return `<li><button type="button" class="slot" id="slot-${slot}" data-action="detail" data-arg="${slot}">
    <span class="slot-icon" aria-hidden="true">${SLOT_ICON[slot]}</span>
    <span class="slot-main"><span class="slot-type">${cap(slot)}${prep ? ' <span class="tag">Batch cook</span>' : ''}</span>
      <span class="slot-name">${r.name}</span>
      <span class="slot-meta"><span>${r.prepMinutes} min</span><span>${money(r.costPerServing)}</span></span></span>
    <span class="chev" aria-hidden="true">›</span></button></li>`;
}

function planView() {
  const p = state.profile, cost = planCost(state.plan, RECIPES), over = cost > p.budget;
  const groups = dayFoodGroups(state.plan, state.day, RECIPES), missing = GROUPS.filter((g) => !groups.has(g));
  return `
  <div class="hero small"><h1 tabindex="-1">${whose(p)} week</h1><p>${GOALS[p.goal]}, up to ${p.maxMinutes} min per meal${p.mealPrep ? ', Sunday meal prep' : ''}.</p></div>
  <section class="budget ${over ? 'over' : ''}" aria-label="Weekly cost">
    <p><strong>${money(cost)}</strong> of your $${p.budget} weekly budget</p>
    <div class="bar" aria-hidden="true"><span style="width:${Math.min(100, (cost / p.budget) * 100)}%"></span></div>
    <p class="note">${over ? `${money(cost - p.budget)} over budget. Swap a pricier meal for a cheaper one to get back under.` : cost === p.budget ? 'Right on budget.' : `${money(p.budget - cost)} left for coffee or extras.`}</p>
  </section>
  <div class="days" role="group" aria-label="Day">
    ${DAYS.map((d, i) => `<button type="button" class="day" id="day-${i}" data-action="day" data-arg="${i}" aria-pressed="${i === state.day}" aria-label="${d}, ${dayFoodGroups(state.plan, i, RECIPES).size} of 5 food groups">
      ${plate(dayFoodGroups(state.plan, i, RECIPES), 30)}<span>${d.slice(0, 3)}</span></button>`).join('')}
  </div>
  <section class="myplate" aria-labelledby="mp-h">
    ${plate(groups, 64)}
    <div><h2 id="mp-h">${DAYS[state.day]}: ${groups.size} of 5 MyPlate groups</h2>
      <p>${missing.length ? `Missing ${missing.join(' and ')}. A swap can fill the gap.` : 'Every food group is on the plate today.'}</p>
      <ul class="legend">${GROUPS.map((g) => `<li class="${groups.has(g) ? 'on' : ''}"><i style="background:var(--${g})"></i>${cap(g)}</li>`).join('')}</ul></div>
  </section>
  <ul class="slots">${SLOTS.map(slotCard).join('')}</ul>
  ${sources()}`;
}

function groceryView() {
  const list = groceryList(state.plan, RECIPES), items = list.flatMap((s) => s.items);
  return `
  <div class="hero small"><h1 tabindex="-1">Groceries</h1><p>The whole week in one trip. Repeated ingredients are combined; round up at the store.</p></div>
  <section class="budget" aria-label="Grocery total"><p>Estimated total <strong>${money(planCost(state.plan, RECIPES))}</strong></p>
    <p class="note" id="progress">${progress(items)}</p></section>
  ${list.map((s) => `<section class="aisle" aria-labelledby="sec-${s.section.replace(/\W/g, '')}">
    <h2 id="sec-${s.section.replace(/\W/g, '')}"><span aria-hidden="true">${SECTION_ICON[s.section]}</span> ${s.section}</h2>
    <ul>${s.items.map((i) => `<li><label class="item"><input type="checkbox" data-key="${esc(i.key)}" ${state.checked.get(i.key) ? 'checked' : ''}>
      <span class="item-name">${i.name}</span><span class="item-qty">${qty(i.qty, i.unit)}</span>
      <span class="item-used">Used in ${i.usedIn.join(', ')}</span></label></li>`).join('')}</ul></section>`).join('')}`;
}
const progress = (items) => `${items.filter((i) => state.checked.get(i.key)).length} of ${items.length} items in your cart`;

function detailSheet() {
  const { day, slot } = state.sheet, r = byId[state.plan.days[day].meals[slot]], n = r.nutrition;
  return `<div class="sheet-body">
    <div class="sheet-top"><p class="sheet-where">${DAYS[day]} ${slot}</p><button type="button" class="x" data-action="close" aria-label="Close">✕</button></div>
    <h2 id="sheet-title" tabindex="-1">${r.name}</h2>
    <ul class="facts"><li><strong>${r.prepMinutes} min</strong>prep and cook</li><li><strong>${money(r.costPerServing)}</strong>per serving</li><li><strong>${r.servings}</strong>${r.servings > 1 ? 'servings' : 'serving'}</li></ul>
    <p class="groups">${r.foodGroups.map((g) => `<span><i style="background:var(--${g})"></i>${cap(g)}</span>`).join('')}</p>
    <h3>Ingredients <small>for the whole recipe</small></h3>
    <ul class="ing">${r.ingredients.map((i) => `<li><span>${qty(i.qty, i.unit)}</span>${i.name}</li>`).join('')}</ul>
    <h3>Steps</h3><ol class="steps">${r.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
    <section class="nutri" aria-labelledby="nutri-h"><h3 id="nutri-h">Estimated nutrition <small>per serving</small></h3>
      <dl><div><dt>Calories</dt><dd>${n.calories}</dd></div><div><dt>Protein</dt><dd>${n.protein} g</dd></div><div><dt>Carbs</dt><dd>${n.carbs} g</dd></div><div><dt>Fat</dt><dd>${n.fat} g</dd></div><div><dt>Fiber</dt><dd>${n.fiber} g</dd></div></dl>
      <p class="src">${r.source}. Estimates, not medical advice.</p></section>
  </div>
  <div class="sheet-foot"><button type="button" class="btn primary" data-action="swap">Swap this meal</button></div>`;
}

function keyNutrient(r) {
  const n = r.nutrition, g = state.profile.goal;
  if (g === 'muscle') return `est. ${n.protein} g protein`;
  if (g === 'weight-loss') return `est. ${n.calories} cal`;
  if (g === 'energy') return `est. ${n.carbs} g carbs, ${n.fiber} g fiber`;
  return `${r.foodGroups.length} food groups`;
}

function swapSheet() {
  const { day, slot } = state.sheet, opts = swapOptions(RECIPES, state.profile, state.plan, day, slot), safe = safetyLine(state.profile);
  return `<div class="sheet-body">
    <div class="sheet-top"><button type="button" class="link" data-action="back">‹ Back to recipe</button><button type="button" class="x" data-action="close" aria-label="Close">✕</button></div>
    <h2 id="sheet-title" tabindex="-1">Swap ${DAYS[day]} ${slot}</h2>
    <p class="sheet-note">${opts.length} options${safe ? `, all ${safe}` : ''}. Best match for “${GOALS[state.profile.goal]}” first.</p>
    ${opts.length ? `<ul class="options">${opts.map((r) => `<li><button type="button" class="option" data-action="choose" data-arg="${r.id}">
      <span class="option-name">${r.name}</span>
      <span class="slot-meta"><span>${r.prepMinutes} min</span><span>${money(r.costPerServing)}</span><span class="key">${keyNutrient(r)}</span></span></button></li>`).join('')}</ul>
    <p class="src">Estimated nutrition per serving, from USDA FoodData Central.</p>`
    : `<p>No other ${slot} options fit your profile.</p>`}
  </div>`;
}

function render(focusId) {
  const screen = $('#screen');
  screen.innerHTML = state.view === 'plan' ? planView() : state.view === 'groceries' ? groceryView() : formView();
  $('#tabs').hidden = !state.plan;
  for (const b of $('#tabs').children) b.setAttribute('aria-current', b.dataset.arg === state.view ? 'page' : 'false');
  if (focusId) document.getElementById(focusId)?.focus();
}

function go(view) {
  if (view === 'profile') state.draft = structuredClone(state.profile);
  state.demo = null;
  state.view = view;
  render();
  $('#screen').scrollTop = 0;
  $('#screen h1').focus({ preventScroll: true });
}

function openSheet(type) {
  state.sheet.type = type;
  const d = $('#sheet');
  d.innerHTML = type === 'detail' ? detailSheet() : swapSheet();
  if (!d.open) d.showModal();
  d.querySelector('.sheet-body').scrollTop = 0;
  $('#sheet-title').focus();
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

document.addEventListener('click', (e) => {
  if (e.target === $('#sheet')) return $('#sheet').close(); // backdrop tap
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const arg = b.dataset.arg;
  switch (b.dataset.action) {
    case 'demo':
      state.draft = structuredClone(DEMOS[arg]);
      state.demo = arg;
      render(`demo-${arg}`);
      toast(`${DEMOS[arg].name}’s answers are filled in. Check them, then build the week.`);
      break;
    case 'view': go(arg); break;
    case 'day': state.day = Number(arg); render(`day-${arg}`); break;
    case 'detail': state.sheet = { day: state.day, slot: arg }; openSheet('detail'); break;
    case 'swap': openSheet('swap'); break;
    case 'back': openSheet('detail'); break;
    case 'close': $('#sheet').close(); break;
    case 'choose': {
      const { day, slot } = state.sheet;
      // Only ids the engine offered for this slot are accepted (keeps the allergen guarantee).
      if (!swapOptions(RECIPES, state.profile, state.plan, day, slot).some((r) => r.id === arg)) return;
      state.plan = applySwap(state.plan, day, slot, arg);
      // Forget checkmarks for items that left the list, so they don't come back pre-ticked later.
      const onList = new Set(groceryList(state.plan, RECIPES).flatMap((s) => s.items.map((i) => i.key)));
      for (const k of state.checked.keys()) if (!onList.has(k)) state.checked.delete(k);
      $('#sheet').close();
      render(`slot-${slot}`);
      toast(`Swapped in ${byId[arg].name}. Grocery list updated.`);
      break;
    }
  }
});

$('#sheet').addEventListener('close', () => {
  const slot = state.sheet?.slot;
  state.sheet = null;
  if (slot) document.getElementById(`slot-${slot}`)?.focus();
});

document.addEventListener('change', (e) => {
  const key = e.target.dataset?.key;
  if (!key) return;
  state.checked.set(key, e.target.checked);
  $('#progress').textContent = progress(groceryList(state.plan, RECIPES).flatMap((s) => s.items));
});

// Editing any answer means the form no longer matches the demo profile that was loaded.
document.addEventListener('input', (e) => {
  if (!state.demo || e.target.form?.id !== 'profile-form') return;
  state.demo = null;
  for (const b of document.querySelectorAll('.demo')) b.setAttribute('aria-pressed', 'false');
});

document.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target), rebuilt = !!state.plan;
  state.profile = {
    name: f.get('name').trim(), goal: f.get('goal'), diet: f.get('diet'), allergens: f.getAll('allergens'),
    budget: Number(f.get('budget')), maxMinutes: Number(f.get('maxMinutes')), mealPrep: f.has('mealPrep'),
  };
  state.plan = buildPlan(RECIPES, state.profile);
  state.checked = new Map();
  state.day = 0;
  go('plan');
  if (rebuilt) toast(`Plan rebuilt for ${state.profile.name || 'you'}.`);
});

render();
