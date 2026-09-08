import { isNewerVersion } from './release-version.mjs';
import { boardUnits, rotatedBoardFootprint } from './geometry.mjs';

const { invoke } = window.__TAURI__.core;
const { listen, emit } = window.__TAURI__.event;

let cfg = await invoke('get_config');
const appVersion = await invoke('get_app_version');
await emit('macro-recording', false);
const $ = (id) => document.getElementById(id);
const restoredStatus = sessionStorage.getItem('keyaura-settings-status');
if (restoredStatus) {
  sessionStorage.removeItem('keyaura-settings-status');
  const status = $('settings-data-status');
  if (status) status.textContent = restoredStatus;
}

async function resetAllSettings() {
  const status = $('settings-data-status');
  if (status) status.textContent = 'Resetting…';
  try {
    cfg = await invoke('reset_config');
    if (status) status.textContent = 'Settings reset to defaults.';
    setTimeout(() => window.location.reload(), 1000);
  } catch (err) {
    if (status) status.textContent = `Reset failed: ${err}`;
  }
}

const tabSections = new Map([
  ['layout', 'General'], ['appearance', 'Appearance'],
]);
const settingSearch = $('settings-search');
const sidebarResizer = $('sidebar-resizer');
const sidebarMin = 200;
const sidebarMax = 360;
const savedSidebarWidth = Number(localStorage.getItem('keyaura-settings-sidebar-width'));
let sidebarWidth = Number.isFinite(savedSidebarWidth)
  ? Math.max(sidebarMin, Math.min(sidebarMax, savedSidebarWidth))
  : 240;
const setSidebarWidth = (width) => {
  sidebarWidth = Math.max(sidebarMin, Math.min(sidebarMax, width));
  document.body.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  sidebarResizer?.setAttribute('aria-valuenow', String(Math.round(sidebarWidth)));
  localStorage.setItem('keyaura-settings-sidebar-width', String(Math.round(sidebarWidth)));
};
setSidebarWidth(sidebarWidth);
if (sidebarResizer) {
  let resizing = false;
  sidebarResizer.addEventListener('pointerdown', (event) => {
    resizing = true;
    sidebarResizer.setPointerCapture(event.pointerId);
    document.body.classList.add('resizing');
    event.preventDefault();
  });
  sidebarResizer.addEventListener('pointermove', (event) => {
    if (!resizing) return;
    const bodyRect = document.body.getBoundingClientRect();
    setSidebarWidth(event.clientX - bodyRect.left - 10);
  });
  const stopResizing = (event) => {
    if (!resizing) return;
    resizing = false;
    if (sidebarResizer.hasPointerCapture(event.pointerId)) sidebarResizer.releasePointerCapture(event.pointerId);
    document.body.classList.remove('resizing');
  };
  sidebarResizer.addEventListener('pointerup', stopResizing);
  sidebarResizer.addEventListener('pointercancel', stopResizing);
  sidebarResizer.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      setSidebarWidth(sidebarWidth + (event.key === 'ArrowRight' ? 10 : -10));
      event.preventDefault();
    }
  });
}
const tooltip = document.createElement('div');
tooltip.className = 'setting-tooltip';
document.body.append(tooltip);
const headings = [...document.querySelectorAll('h2')];
for (const row of document.querySelectorAll('.row:has(input[type="range"])')) {
  const label = row.querySelector(':scope > label');
  if (!label) continue;
  const nextRow = row.nextElementSibling;
  const nextHint = nextRow?.querySelector('.hint');
  const nextRowHasControl = !!nextRow?.querySelector('input, select, button');
  const info = document.createElement('span');
  info.className = 'setting-info';
  info.textContent = 'i';
  const description = nextHint && !nextRowHasControl
    ? nextHint.textContent.trim()
    : `Adjust ${label.textContent.trim().toLowerCase()}.`;
  info.dataset.tooltip = description;
  info.tabIndex = 0;
  info.setAttribute('aria-label', description);
  const placeTooltip = () => {
    const rect = info.getBoundingClientRect();
    const width = 240;
    tooltip.textContent = description;
    tooltip.classList.add('visible');
    const height = tooltip.getBoundingClientRect().height;
    const left = Math.max(8, Math.min(rect.left + 18, window.innerWidth - width - 8));
    const above = rect.top - height - 8;
    const top = above >= 8 ? above : Math.min(window.innerHeight - height - 8, rect.bottom + 8);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(8, top)}px`;
  };
  const hideTooltip = () => tooltip.classList.remove('visible');
  info.addEventListener('mouseenter', placeTooltip);
  info.addEventListener('focus', placeTooltip);
  info.addEventListener('mouseleave', hideTooltip);
  info.addEventListener('blur', hideTooltip);
  label.append(info);
}
for (const info of document.querySelectorAll('[data-manual-tooltip]')) {
  const description = info.dataset.manualTooltip;
  info.tabIndex = 0;
  const placeTooltip = () => {
    const rect = info.getBoundingClientRect();
    const width = 240;
    tooltip.textContent = description;
    tooltip.classList.add('visible');
    const height = tooltip.getBoundingClientRect().height;
    const left = Math.max(8, Math.min(rect.left + 18, window.innerWidth - width - 8));
    const above = rect.top - height - 8;
    const top = above >= 8 ? above : Math.min(window.innerHeight - height - 8, rect.bottom + 8);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(8, top)}px`;
  };
  const hideTooltip = () => tooltip.classList.remove('visible');
  info.addEventListener('mouseenter', placeTooltip);
  info.addEventListener('focus', placeTooltip);
  info.addEventListener('mouseleave', hideTooltip);
  info.addEventListener('blur', hideTooltip);
}
for (const [tab, title] of tabSections) {
  const heading = headings.find((node) => node.textContent.trim() === title);
  if (!heading) continue;
  heading.dataset.tabSection = tab;
  heading.nextElementSibling?.setAttribute('data-tab-section', tab);
}
function setActiveTreeItem(item) {
  document.querySelectorAll('.tree-item.active').forEach((node) => {
    node.classList.remove('active');
    node.style.removeProperty('--active-offset');
  });
  document.querySelectorAll('.tree-node-row.active').forEach((node) => {
    node.classList.remove('active');
    node.style.removeProperty('--active-offset');
  });
  item?.classList.add('active');
  const sidebar = document.querySelector('.settings-tree');
  const extendToSidebar = (target) => {
    if (!sidebar || !target) return;
    const offset = Math.max(0, target.getBoundingClientRect().left - sidebar.getBoundingClientRect().left);
    target.style.setProperty('--active-offset', `${offset}px`);
  };
  let node = item?.closest('.tree-node');
  while (node) {
    const row = node.querySelector(':scope > .tree-node-row');
    row?.classList.add('active');
    extendToSidebar(row);
    node.querySelector(':scope > .tree-node-row > .tree-item')?.classList.add('active');
    node = node.parentElement.closest('.tree-node');
  }
  extendToSidebar(item);
}
let focusTimer;
function focusTreeTarget(target) {
  document.querySelectorAll('.setting-focus').forEach((node) => node.classList.remove('setting-focus'));
  // Keep the transition on the element itself so it also applies after the
  // focus class is removed; otherwise the browser can skip the fade-out.
  target.style.transition = 'background-color 180ms ease, box-shadow 180ms ease';
  target.classList.remove('setting-focus');
  void target.offsetWidth;
  target.classList.add('setting-focus');
  clearTimeout(focusTimer);
  focusTimer = setTimeout(() => target.classList.remove('setting-focus'), 3000);
}
function setTreeNodeCollapsed(node, collapsed) {
  node.classList.toggle('collapsed', collapsed);
  const toggle = node.querySelector(':scope > .tree-node-row > .tree-node-toggle');
  const children = node.querySelector(':scope > .tree-node-children');
  toggle.setAttribute('aria-expanded', String(!collapsed));
  toggle.setAttribute('aria-label', `${collapsed ? 'Expand' : 'Collapse'} ${node.dataset.treeTitle}`);
  children.hidden = collapsed;
}
function createTreeNode(tab, text, target, itemClass) {
  const node = document.createElement('div');
  node.className = 'tree-node';
  node.dataset.treeTitle = text;
  const row = document.createElement('div');
  row.className = 'tree-node-row';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'tree-node-toggle';
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-label', `Collapse ${text}`);
  toggle.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5" /></svg>';
  const item = document.createElement('button');
  item.type = 'button';
  item.className = itemClass;
  item.textContent = text;
  item.title = text;
  item.addEventListener('click', () => {
    setActiveTreeItem(item);
    selectTab(tab);
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    focusTreeTarget(target);
  });
  const children = document.createElement('div');
  children.className = 'tree-node-children';
  toggle.addEventListener('click', () => setTreeNodeCollapsed(node, !node.classList.contains('collapsed')));
  row.append(toggle, item);
  node.append(row, children);
  return { node, children };
}
function createTreeItem(tab, text, target, className = 'tree-item') {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = className;
  item.textContent = text;
  item.title = text;
  item.addEventListener('click', () => {
    setActiveTreeItem(item);
    selectTab(tab);
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    focusTreeTarget(target);
  });
  return item;
}
for (const [tab] of tabSections) {
  const category = document.querySelector(`.tab-button[data-tab="${tab}"]`);
  const items = document.createElement('div');
  items.className = 'tree-items';
  items.dataset.treeTab = tab;
  const cards = [...document.querySelectorAll(`[data-tab-section="${tab}"]`)].filter((node) => node.matches('.card'));
  const seen = new Set();
  const addControlRow = (row, container, className = 'tree-item') => {
    const label = row.querySelector('label[for]');
    const control = label ? $(label.htmlFor) : row.querySelector('[id]');
    if (!control || seen.has(control.id) || control.id.endsWith('-val')) return;
    const fallback = row.querySelector(':scope > span:first-child');
    const labelText = label
      ? (() => {
        const copy = label.cloneNode(true);
        copy.querySelectorAll('.setting-info').forEach((node) => node.remove());
        return copy.textContent;
      })()
      : '';
    const text = (labelText || row.querySelector('strong')?.textContent || fallback?.textContent || '').trim();
    if (fallback?.classList.contains('hint') || !text) return;
    seen.add(control.id);
    container.append(createTreeItem(tab, text, row, className));
  };
  for (const card of cards) {
    const sectionHeading = card.previousElementSibling;
    const groups = [...card.querySelectorAll(':scope > .key-style-group')];
    if (sectionHeading?.classList.contains('settings-section-heading')) {
      const section = createTreeNode(tab, sectionHeading.textContent.trim(), sectionHeading, 'tree-item tree-section-item');
      items.append(section.node);
      for (const group of groups) {
        const title = group.querySelector(':scope > .key-style-group-title')?.textContent.trim();
        if (!title) continue;
        const subgroup = createTreeNode(tab, title, group, 'tree-item tree-group-item');
        section.children.append(subgroup.node);
        for (const row of group.querySelectorAll('.row')) addControlRow(row, subgroup.children, 'tree-item tree-control-item');
      }
      continue;
    }
    const cardTitle = card.querySelector(':scope > .card-section-title');
    if (cardTitle) {
      const subgroup = createTreeNode(tab, cardTitle.textContent.trim(), cardTitle, 'tree-item tree-group-item');
      items.append(subgroup.node);
      for (const row of card.querySelectorAll('.row')) addControlRow(row, subgroup.children, 'tree-item tree-control-item');
      continue;
    }
    for (const row of card.querySelectorAll('.row')) addControlRow(row, items);
  }
  category?.closest('.tab-category')?.after(items);
}
const categoryRow = (category) => category.closest('.tab-category');
const categoryItems = (category) => categoryRow(category)?.nextElementSibling;
function setCategoryCollapsed(row, collapsed) {
  row.classList.toggle('collapsed', collapsed);
  const category = row.querySelector('.tab-button');
  const toggle = row.querySelector('.tab-collapse-toggle');
  const items = row.nextElementSibling;
  toggle.setAttribute('aria-expanded', String(!collapsed));
  toggle.setAttribute('aria-label', `${collapsed ? 'Expand' : 'Collapse'} ${category.textContent.trim()}`);
  if (items?.classList.contains('tree-items')) items.hidden = collapsed;
}
for (const toggle of document.querySelectorAll('.tab-collapse-toggle')) {
  toggle.addEventListener('click', () => {
    const row = toggle.closest('.tab-category');
    setCategoryCollapsed(row, !row.classList.contains('collapsed'));
    if (settingSearch.value) settingSearch.dispatchEvent(new Event('input'));
  });
}
$('collapse-all').addEventListener('click', () => {
  for (const row of document.querySelectorAll('.tab-category')) setCategoryCollapsed(row, true);
  for (const node of document.querySelectorAll('.tree-node')) setTreeNodeCollapsed(node, true);
});
$('expand-all').addEventListener('click', () => {
  for (const row of document.querySelectorAll('.tab-category')) setCategoryCollapsed(row, false);
  for (const node of document.querySelectorAll('.tree-node')) setTreeNodeCollapsed(node, false);
});
settingSearch.addEventListener('input', () => {
  const query = settingSearch.value.trim().toLowerCase();
  for (const category of document.querySelectorAll('.tab-button')) {
    const row = categoryRow(category);
    const items = categoryItems(category);
    if (!items?.classList.contains('tree-items')) continue;
    let visible = 0;
    for (const item of items.querySelectorAll('.tree-item')) {
      const match = !query || item.textContent.toLowerCase().includes(query);
      item.hidden = !match;
      if (match) visible += 1;
    }
    for (const node of [...items.querySelectorAll('.tree-node')].reverse()) {
      const hasMatch = [...node.querySelectorAll('.tree-item')].some((item) => !item.hidden);
      node.hidden = !!query && !hasMatch;
      const title = node.querySelector(':scope > .tree-node-row > .tree-item');
      if (query && hasMatch) title.hidden = false;
      const children = node.querySelector(':scope > .tree-node-children');
      if (query && hasMatch) children.hidden = false;
      else if (!query) children.hidden = node.classList.contains('collapsed');
    }
    row.hidden = !!query && visible === 0;
    items.hidden = query ? visible === 0 : row.classList.contains('collapsed');
  }
});
function selectTab(tab) {
  const title = tabSections.get(tab);
  if (title) {
    void invoke('set_settings_title', { title }).catch(() => {});
    document.title = `KeyAura Settings — ${title}`;
  }
  for (const button of document.querySelectorAll('.tab-button')) {
    const active = button.dataset.tab === tab;
    button.classList.toggle('active', active);
    button.closest('.tab-category').classList.toggle('active', active);
    button.setAttribute('aria-selected', active);
  }
  for (const node of document.querySelectorAll('[data-tab-section]')) {
    node.hidden = node.dataset.tabSection !== tab;
  }
  // The navigation tree stays expanded across sections. Collapsing is an
  // explicit sidebar action rather than a side effect of changing sections.
  for (const items of document.querySelectorAll('[data-tree-tab]')) {
    const row = items.previousElementSibling;
    items.hidden = row?.classList.contains('collapsed');
  }
  if (settingSearch.value) settingSearch.dispatchEvent(new Event('input'));
}
document.querySelectorAll('.tab-button').forEach((button) => {
  button.addEventListener('click', () => {
    setActiveTreeItem(categoryItems(button)?.querySelector('.tree-section-item'));
    document.querySelectorAll('.setting-focus').forEach((node) => node.classList.remove('setting-focus'));
    selectTab(button.dataset.tab);
  });
});
selectTab('layout');

async function refreshKeyboardOverview() {
  const details = await invoke('get_keyboard_details');
  $('keyboard-model').textContent = `${details.model || 'Unknown'} by ${details.manufacturer || 'Unknown'}`;
  $('layout-name').textContent = details.layout_name || details.revision_name || 'Not detected';
  $('layout-identity').textContent = details.layout && details.revision ? `${details.layout}/${details.revision}` : 'Not detected';
  const connected = !!details.online;
  $('connection-status').textContent = connected ? 'Connected' : 'Disconnected';
  const button = $('connection-toggle');
  button.textContent = connected ? 'Disconnect' : 'Connect';
  button.classList.toggle('connected', connected);
  button.classList.toggle('disconnected', !connected);
}
$('app-version').textContent = `Version ${appVersion}`;
await refreshKeyboardOverview().catch(() => {});
for (const event of ['keyboard-online', 'keyboard-offline']) listen(event, () => refreshKeyboardOverview().catch(() => {}));
$('connection-toggle').addEventListener('click', async () => {
  const details = await invoke('get_keyboard_details');
  await invoke('set_keyboard_connection', { connected: !details.online });
  await refreshKeyboardOverview();
});
fetch('https://api.github.com/repos/jonathanlaf/keyaura/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
  .then((response) => response.ok ? response.json() : null)
  .then((release) => {
    if (release?.tag_name && isNewerVersion(release.tag_name, appVersion)) {
      $('update-status').textContent = `Update available: ${release.tag_name}`;
      $('update-status').classList.add('available');
    } else if (release?.tag_name) {
      $('update-status').textContent = 'Up to date';
      $('update-status').classList.add('current');
    }
  }).catch(() => {});

for (const prefix of ['key', 'legend', 'layer_name', 'offline']) {
  const family = $(`${prefix.replace('_', '-')}-font-family`);
  if (family) family.value = cfg[`${prefix}_font_family`] || '';
}
$('font-ligatures').checked = cfg.font_ligatures !== false;
for (const button of document.querySelectorAll('[data-font-style]')) {
  const prefix = button.dataset.fontStyle;
  button.classList.toggle('active', button.dataset.style === 'bold' ? !!cfg[`${prefix}_font_bold`] : !!cfg[`${prefix}_font_italic`]);
  button.addEventListener('click', () => { const field = `${prefix}_font_${button.dataset.style}`; cfg[field] = !cfg[field]; button.classList.toggle('active', cfg[field]); push(); });
}
$('font-ligatures').addEventListener('change', (e) => commit('font_ligatures', e.target.checked));

const MOD_LABELS = { cmd: '⌘', alt: '⌥', ctrl: '⌃', shift: '⇧' };
const MOD_ORDER = ['cmd', 'alt', 'ctrl', 'shift'];
const comboText = (arr) => arr.map((m) => MOD_LABELS[m]).join('') || '—';

$('bg-color').value = cfg.bg_color;
$('key-fill-color').value = cfg.key_fill_color;
$('text-color').value = cfg.text_color;
$('legend-color').value = cfg.legend_color;
$('shift-color').value = cfg.shift_color;
$('alternate-color').value = cfg.alternate_color;
$('border-color').value = cfg.border_color;
$('pressed-key-color').value = cfg.pressed_key_color;
$('pressed-key-border-color').value = cfg.pressed_key_border_color;
$('key-shadow-color').value = cfg.key_shadow_color;
$('pressed-key-shadow-color').value = cfg.pressed_key_shadow_color;
$('heatmap-color').value = cfg.heatmap_color;
$('base-outline-color').value = cfg.base_outline_color;
$('grab-outline-color').value = cfg.grab_outline_color;
$('layer-pill-text-color').value = cfg.layer_pill_text_color;
$('layer-pill-fill-color').value = cfg.layer_pill_fill_color;
$('layer-pill-border-color').value = cfg.layer_pill_border_color;
$('offline-pill-text-color').value = cfg.offline_pill_text_color;
$('offline-pill-fill-color').value = cfg.offline_pill_fill_color;
$('offline-pill-border-color').value = cfg.offline_pill_border_color;
$('colors-toggle').checked = cfg.use_oryx_colors;
$('start-hidden').checked = cfg.start_hidden;
$('layer-action-icons').checked = cfg.show_layer_action_icons;
$('layer-indicator').value = cfg.layer_indicator ?? 'icon';
$('shift-icons').checked = cfg.show_shift_icons;
$('alternate-action-icons').checked = cfg.show_alternate_action_icons;
$('heatmap-toggle').checked = cfg.show_heatmap;
$('heatmap-counts-toggle').checked = cfg.show_heatmap_counts;
$('key-shadows').checked = cfg.show_key_shadows;
$('pressed-key-shadow').checked = cfg.show_pressed_key_shadow;
$('key-shadow-position').value = cfg.key_shadow_position ?? 'glow';
$('pressed-key-shadow-position').value = cfg.pressed_key_shadow_position ?? 'glow';
$('base-outline-enabled').checked = cfg.base_outline_enabled;
$('grab-outline-enabled').checked = cfg.grab_outline_enabled;
$('combo-display').textContent = comboText(cfg.grab_combo);
$('hide-side').value = cfg.hide_side;

const macroLabel = (macro) => macro?.length ? macro.map((index) => `Key ${index}`).join(' → ') : 'Not configured';
$('toggle-macro-display').textContent = macroLabel(cfg.toggle_macro);

// Serialized so rapid-fire commits (e.g. fast typing, each one a separate
// read-modify-write) can never resolve out of order and let a stale value
// overwrite a newer one.
let pushChain = Promise.resolve();
function push() {
  // Swallow a prior link's rejection before chaining the next one — .then()
  // on an already-rejected promise never runs its callback, so without this
  // a single failed invoke() would silently stop every future commit from
  // persisting for the rest of the session.
  // set_config preserves whatever window rect is already on disk itself
  // (the overlay's drag/resize handler owns that field), so this doesn't
  // need to re-fetch it first — that used to be a client-side workaround
  // for a race the backend now closes with its own lock.
  const snapshot = structuredClone(cfg);
  const attempt = pushChain.catch(() => {}).then(() => invoke('set_config', { config: snapshot })).then(() => {
    $('settings-save-status').textContent = '';
    return true;
  }).catch(error => {
    $('settings-save-status').textContent = `Could not save settings: ${error}`;
    return false;
  });
  pushChain = attempt;
  return attempt;
}

// Shared mutate-then-persist step used by every binding below, so there's
// one place that owns "a setting changed" instead of each binding re-deriving it.
async function commit(field, value) {
  cfg[field] = value;
  await push();
}

const bind = (id, field) => {
  $(id).addEventListener('input', (e) => commit(field, e.target.value));
};
bind('bg-color', 'bg_color');
bind('key-fill-color', 'key_fill_color');
bind('text-color', 'text_color');
bind('legend-color', 'legend_color');
bind('shift-color', 'shift_color');
bind('alternate-color', 'alternate_color');
bind('border-color', 'border_color');
bind('pressed-key-color', 'pressed_key_color');
bind('pressed-key-border-color', 'pressed_key_border_color');
bind('key-shadow-color', 'key_shadow_color');
bind('pressed-key-shadow-color', 'pressed_key_shadow_color');
bind('heatmap-color', 'heatmap_color');
bind('base-outline-color', 'base_outline_color');
bind('grab-outline-color', 'grab_outline_color');
bind('layer-pill-text-color', 'layer_pill_text_color');
bind('layer-pill-fill-color', 'layer_pill_fill_color');
bind('layer-pill-border-color', 'layer_pill_border_color');
bind('offline-pill-text-color', 'offline_pill_text_color');
bind('offline-pill-fill-color', 'offline_pill_fill_color');
bind('offline-pill-border-color', 'offline_pill_border_color');

// Numeric settings: slider + manual text entry, kept in sync both ways.
// Every keystroke commits immediately (like the slider) so a value typed
// then the window closed before blur isn't lost; the box's own text is only
// touched when a keystroke actually needed sanitizing, so the caret isn't
// forced to the end on ordinary typing.
const clampNum = (v, min, max) => Math.min(max, Math.max(min, v));
const bindNumeric = (id, field) => {
  const slider = $(id);
  const box = $(id + '-val');
  const min = Number(slider.min);
  const max = Number(slider.max);
  const step = Number(slider.step) || 1;
  const stepDecimals = (String(step).split('.')[1] || '').length;
  const roundToStep = (v) => Number((Math.round(v / step) * step).toFixed(stepDecimals));
  slider.value = cfg[field];
  box.value = cfg[field];
  // The one place that owns "this field's value changed": mutate, sync the
  // slider, persist. Both the slider and the box route through this instead
  // of each re-deriving the same three steps.
  const applyValue = (v) => {
    cfg[field] = v;
    slider.value = v;
    return push();
  };
  slider.addEventListener('input', (e) => {
    applyValue(Number(e.target.value));
    box.value = slider.value;
  });
  box.addEventListener('input', () => {
    const before = box.value;
    const digitsAndDot = before.replace(/[^0-9.]/g, '');
    const firstDot = digitsAndDot.indexOf('.');
    const sanitized = firstDot === -1
      ? digitsAndDot
      : digitsAndDot.slice(0, firstDot + 1) + digitsAndDot.slice(firstDot + 1).replace(/\./g, '');
    if (sanitized !== before) {
      const caret = box.selectionStart - (before.length - sanitized.length);
      box.value = sanitized;
      box.setSelectionRange(caret, caret);
    }
    const v = parseFloat(sanitized);
    if (!Number.isFinite(v)) return;
    const clamped = clampNum(roundToStep(v), min, max);
    // Out-of-range or off-step: show the corrected value immediately (so the
    // box never displays a number other than the one actually applied),
    // preserving the caret the same way the sanitize step above does.
    if (clamped !== v) {
      const corrected = String(clamped);
      const caret = box.selectionStart - (box.value.length - corrected.length);
      box.value = corrected;
      box.setSelectionRange(caret, caret);
    }
    applyValue(clamped);
  });
  box.addEventListener('change', () => {
    // Always renormalize on blur, even when the typed text parses to the
    // already-committed number (e.g. "3.", "007") — otherwise a malformed
    // but numerically-equal string can stay displayed indefinitely.
    const v = parseFloat(box.value);
    box.value = Number.isFinite(v) ? clampNum(roundToStep(v), min, max) : cfg[field];
  });
};
const bindNumericSelect = (id, field) => {
  const select = $(id);
  const values = [...select.options].map(option => Number(option.value));
  const current = Number(cfg[field]);
  const nearest = values.reduce((best, value) => Math.abs(value - current) < Math.abs(best - current) ? value : best, values[0]);
  select.value = String(values.includes(current) ? current : nearest);
  select.addEventListener('change', (event) => commit(field, Number(event.target.value)));
};
async function refreshFontSizeLabels() {
  try {
    const { width, height } = await invoke('get_overlay_geometry');
    const padding = Number(cfg.padding ?? 10);
    // Mirror hud.js's computeLayout: the overlay's actual window height is
    // inflated by the backend to fit the rotated board (app.rs's
    // overlay_height_for_width), so the preview unit must divide by that same
    // rotated footprint or these labels drift from what's actually rendered.
    const units = boardUnits(Number(cfg.keyboard_halves_distance ?? 1.6));
    const { w: rotatedWidth, h: rotatedHeight } = rotatedBoardFootprint(units.w, Number(cfg.keyboard_halves_rotation) || 0);
    const unit = Math.max(8, Math.min(
      (Number(width) - 2 * padding) / rotatedWidth,
      (Number(height) - 2 * padding) / rotatedHeight,
    ));
    for (const [id, ratio] of [['key-font-size', 0.258], ['legend-font-size', 0.145]]) {
      for (const option of $(id).options) {
        option.textContent = `${Math.round(unit * ratio * Number(option.value))} px`;
      }
    }
  } catch (error) {
    console.warn('Could not calculate current font pixel sizes:', error);
  }
}
for (const [id, field] of [
  ['opacity', 'opacity'],
  ['char-opacity', 'char_opacity'],
  ['pressed-char-opacity', 'pressed_char_opacity'],
  ['alternate-char-opacity', 'alternate_char_opacity'],
  ['border-opacity', 'border_opacity'],
  ['key-fill-opacity', 'key_fill_opacity'],
  ['border-width', 'border_width'],
  ['padding', 'padding'],
  ['shift-icon-scale', 'shift_icon_scale'],
  ['alternate-action-icon-scale', 'alternate_action_icon_scale'],
  ['heatmap-peak', 'heatmap_peak'],
  ['pressed-key-fill-opacity', 'pressed_key_fill_opacity'],
  ['pressed-key-border-opacity', 'pressed_key_border_opacity'],
  ['pressed-key-border-width', 'pressed_key_border_width'],
  ['base-outline-opacity', 'base_outline_opacity'],
  ['base-outline-width', 'base_outline_width'],
  ['grab-outline-opacity', 'grab_outline_opacity'],
  ['grab-outline-width', 'grab_outline_width'],
  ['key-border-radius', 'key_border_radius'],
  ['layer-pill-border-radius', 'layer_pill_border_radius'],
  ['offline-pill-border-radius', 'offline_pill_border_radius'],
  ['layer-pill-text-opacity', 'layer_pill_text_opacity'],
  ['layer-pill-fill-opacity', 'layer_pill_fill_opacity'],
  ['layer-pill-border-opacity', 'layer_pill_border_opacity'],
  ['layer-pill-border-width', 'layer_pill_border_width'],
  ['offline-pill-text-opacity', 'offline_pill_text_opacity'],
  ['offline-pill-fill-opacity', 'offline_pill_fill_opacity'],
  ['offline-pill-border-opacity', 'offline_pill_border_opacity'],
  ['offline-pill-border-width', 'offline_pill_border_width'],
  ['key-shadow-opacity', 'key_shadow_opacity'],
  ['pressed-key-shadow-opacity', 'pressed_key_shadow_opacity'],
  ['key-shadow-distance', 'key_shadow_distance'],
  ['pressed-key-shadow-distance', 'pressed_key_shadow_distance'],
  ['key-shadow-diffusion', 'key_shadow_diffusion'],
  ['pressed-key-shadow-diffusion', 'pressed_key_shadow_diffusion'],
  ['key-spacing', 'key_spacing'],
  ['keyboard-halves-distance', 'keyboard_halves_distance'],
  ['keyboard-halves-rotation', 'keyboard_halves_rotation'],
  ['layer-pill-horizontal', 'layer_pill_horizontal'],
  ['layer-pill-vertical', 'layer_pill_vertical'],
  ['offline-pill-horizontal', 'offline_pill_horizontal'],
  ['offline-pill-vertical', 'offline_pill_vertical'],
  ['hide-reveal', 'hide_reveal'],
  ['hide-animation-ms', 'hide_animation_ms'],
]) bindNumeric(id, field);
for (const [id, field] of [
  ['key-font-size', 'key_font_size'],
  ['legend-font-size', 'legend_font_size'],
  ['layer-name-font-size', 'layer_name_font_size'],
  ['offline-font-size', 'offline_font_size'],
]) bindNumericSelect(id, field);
await refreshFontSizeLabels();

for (const prefix of ['key', 'legend', 'layer_name', 'offline']) {
  const id = `${prefix.replace('_', '-')}-font-family`;
  $(id).addEventListener('change', (e) => commit(`${prefix}_font_family`, e.target.value));
}

$('colors-toggle').addEventListener('change', async (e) => {
  cfg.use_oryx_colors = e.target.checked;
  await push();
});
$('start-hidden').addEventListener('change', (e) => commit('start_hidden', e.target.checked));

$('layer-action-icons').addEventListener('change', (e) => {
  commit('show_layer_action_icons', e.target.checked);
});
$('layer-indicator').addEventListener('change', (e) => commit('layer_indicator', e.target.value));

$('shift-icons').addEventListener('change', (e) => {
  commit('show_shift_icons', e.target.checked);
});

$('alternate-action-icons').addEventListener('change', (e) => {
  commit('show_alternate_action_icons', e.target.checked);
});
const syncHeatmapControls = (enabled) => {
  $('heatmap-peak').disabled = !enabled;
  $('heatmap-peak-val').disabled = !enabled;
};
syncHeatmapControls(cfg.show_heatmap);
$('heatmap-toggle').addEventListener('change', (e) => {
  syncHeatmapControls(e.target.checked);
  commit('show_heatmap', e.target.checked);
});
$('heatmap-counts-toggle').addEventListener('change', (e) => commit('show_heatmap_counts', e.target.checked));
$('heatmap-reset').addEventListener('click', async () => {
  try {
    await emit('heatmap-reset');
    $('heatmap-reset').textContent = 'Reset';
  } catch (err) {
    $('heatmap-reset').textContent = 'Failed';
    setTimeout(() => { $('heatmap-reset').textContent = 'Reset'; }, 1200);
  }
});
await listen('heatmap-stats', (event) => {
  const total = Number(event.payload?.total ?? 0);
  const keys = Number(event.payload?.keys ?? 0);
  $('heatmap-count').textContent = `${total.toLocaleString()} presses · ${keys} keys`;
});
try { await emit('heatmap-request'); } catch {}
$('key-shadows').addEventListener('change', (e) => commit('show_key_shadows', e.target.checked));
$('pressed-key-shadow').addEventListener('change', (e) => commit('show_pressed_key_shadow', e.target.checked));
const syncShadowDistance = (prefix) => {
  const isGlow = $(`${prefix}-shadow-position`).value === 'glow';
  const slider = $(`${prefix}-shadow-distance`);
  const value = $(`${prefix}-shadow-distance-val`);
  slider.disabled = isGlow;
  value.disabled = isGlow;
  const explanation = isGlow ? 'Distance is not used by a glow.' : '';
  slider.title = explanation;
  value.title = explanation;
};
for (const prefix of ['key', 'pressed-key']) {
  syncShadowDistance(prefix);
  $(`${prefix}-shadow-position`).addEventListener('change', (e) => {
    syncShadowDistance(prefix);
    commit(`${prefix.replace('-', '_')}_shadow_position`, e.target.value);
  });
}
$('base-outline-enabled').addEventListener('change', (e) => commit('base_outline_enabled', e.target.checked));
$('grab-outline-enabled').addEventListener('change', (e) => commit('grab_outline_enabled', e.target.checked));
$('hide-side').addEventListener('change', (e) => commit('hide_side', e.target.value));

await listen('config-changed', (event) => {
  if (!event.payload) return;
  cfg = event.payload;
  const indicator = $('layer-indicator');
  if (indicator) indicator.value = cfg.layer_indicator ?? 'icon';
  const slider = $('keyboard-halves-distance');
  const box = $('keyboard-halves-distance-val');
  if (slider && box) {
    slider.value = cfg.keyboard_halves_distance;
    box.value = cfg.keyboard_halves_distance;
  }
  const rotation = $('keyboard-halves-rotation');
  const rotationValue = $('keyboard-halves-rotation-val');
  if (rotation && rotationValue) {
    rotation.value = cfg.keyboard_halves_rotation;
    rotationValue.value = cfg.keyboard_halves_rotation;
  }
  for (const prefix of ['key', 'pressed-key']) {
    const select = $(`${prefix}-shadow-position`);
    if (select) select.value = cfg[`${prefix.replace('-', '_')}_shadow_position`] ?? 'glow';
    syncShadowDistance(prefix);
  }
  refreshFontSizeLabels();
});
await listen('overlay-geometry-changed', refreshFontSizeLabels);

let toggleMacroRecording = false;
let recordedToggleMacro = [];
$('toggle-macro-record').addEventListener('click', async () => {
  await emit('macro-recording', true);
  toggleMacroRecording = true;
  recordedToggleMacro = [];
  $('toggle-macro-display').textContent = 'Recording…';
  $('toggle-macro-record').disabled = true;
  $('toggle-macro-stop').disabled = false;
});
$('toggle-macro-stop').addEventListener('click', async () => {
  toggleMacroRecording = false;
  cfg.toggle_macro = recordedToggleMacro;
  await push();
  await emit('macro-recording', false);
  $('toggle-macro-display').textContent = macroLabel(cfg.toggle_macro);
  $('toggle-macro-record').disabled = false;
  $('toggle-macro-stop').disabled = true;
});
await listen('key-event', (event) => {
  if (!toggleMacroRecording || !event.payload?.pressed || !Number.isInteger(event.payload.index) || recordedToggleMacro.length >= 64) return;
  recordedToggleMacro.push(Number(event.payload.index));
  $('toggle-macro-display').textContent = macroLabel(recordedToggleMacro);
});

window.addEventListener('pagehide', () => { emit('macro-recording', false).catch(console.warn); });

try {
  $('autostart').checked = await invoke('plugin:autostart|is_enabled');
} catch { $('autostart').disabled = true; }
$('autostart').addEventListener('change', async (e) => {
  try {
    await invoke(e.target.checked ? 'plugin:autostart|enable' : 'plugin:autostart|disable');
  } catch {
    e.target.checked = !e.target.checked;
  }
});

let recording = false;
let maxMods = new Set();

const heldMods = (e) => {
  const s = new Set();
  if (e.metaKey) s.add('cmd');
  if (e.altKey) s.add('alt');
  if (e.ctrlKey) s.add('ctrl');
  if (e.shiftKey) s.add('shift');
  return s;
};

$('record').addEventListener('click', () => {
  recording = true;
  maxMods = new Set();
  $('record-hint').textContent = 'Hold modifiers, release to save · Esc cancels';
  $('combo-display').textContent = '…';
});

for (const type of ['keydown', 'keyup']) {
  window.addEventListener(type, async (e) => {
    if (!recording) return;
    e.preventDefault();
    if (e.key === 'Escape') {
      recording = false;
      $('record-hint').textContent = 'Cancelled';
      $('combo-display').textContent = comboText(cfg.grab_combo);
      setTimeout(() => { $('record-hint').textContent = 'Hold to move and resize the overlay'; }, 1500);
      return;
    }
    const held = heldMods(e);
    held.forEach((m) => maxMods.add(m));
    $('combo-display').textContent = comboText(MOD_ORDER.filter((m) => maxMods.has(m)));
    if (type === 'keyup' && held.size === 0 && maxMods.size > 0) {
      recording = false;
      cfg.grab_combo = MOD_ORDER.filter((m) => maxMods.has(m));
      $('record-hint').textContent = 'Saved';
      $('combo-display').textContent = comboText(cfg.grab_combo);
      await push();
      setTimeout(() => { $('record-hint').textContent = 'Hold to move and resize the overlay'; }, 1500);
    }
  });
}

async function alignWindow(axis) {
  try {
    await invoke('align_window', { axis });
  } catch (err) {
    console.warn('KeyAura: could not align window:', err);
  }
}
$('center-horizontal').addEventListener('click', () => alignWindow('horizontal'));
$('center-vertical').addEventListener('click', () => alignWindow('vertical'));
$('align-top').addEventListener('click', () => alignWindow('top'));
$('align-bottom').addEventListener('click', () => alignWindow('bottom'));
$('reset-position').addEventListener('click', async () => {
  const status = $('settings-data-status');
  if (status) status.textContent = 'Resetting layout…';
  try {
    await invoke('reset_window_positions');
    if (status) status.textContent = 'Layout position, size, and keyboard spacing reset.';
  } catch (err) {
    if (status) status.textContent = `Position reset failed: ${err}`;
    console.warn('KeyAura: could not reset window positions:', err);
  }
});

$('export-settings').addEventListener('click', async () => {
  try {
    await pushChain;
    const path = await invoke('export_config');
    $('settings-data-status').textContent = `Exported to ${path}`;
  }
  catch (err) { $('settings-data-status').textContent = String(err); }
});
$('import-settings').addEventListener('click', async () => {
  $('import-file').value = '';
  $('import-file').click();
});
$('import-file').addEventListener('change', async (e) => {
  const file = e.target.files?.[0]; if (!file) return;
  try {
    await pushChain;
    await invoke('import_config', { contents: await file.text() });
    sessionStorage.setItem('keyaura-settings-status', `Imported ${file.name}`);
    window.location.reload();
  }
  catch (err) { $('settings-data-status').textContent = String(err); }
});
$('reset-settings').addEventListener('click', async () => {
  $('reset-dialog').hidden = false;
});
$('reset-cancel').addEventListener('click', () => { $('reset-dialog').hidden = true; });
$('reset-confirm').addEventListener('click', async () => {
  $('reset-dialog').hidden = true;
  await pushChain;
  await resetAllSettings();
});
