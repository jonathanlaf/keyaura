import { LAYER_ACTIONS, layerTriggerList } from './layer-actions.mjs';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const $ = (id) => document.getElementById(id);

// Keep the descriptive key name for instructions, but draw the same compact
// symbols used by the keyboard overlay when a trigger is on a special key.
const KEY_GLYPHS = {
  ENTER: '⏎', SPACE: '␣', BACKSPACE: '⌫', DELETE: '⌦', TAB: '⇥', ESCAPE: '⎋',
};

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function actionLabel(slot) {
  const action = LAYER_ACTIONS[slot];
  const label = element('span', undefined, 'action');
  const icon = element('span', undefined, 'action-icon');
  icon.style.setProperty('--action-icon', `url('icons/${action.icon}.svg')`);
  icon.setAttribute('aria-hidden', 'true');
  label.append(icon, element('span', action.name));
  return label;
}

for (const slot of ['tap', 'tapHold', 'hold', 'doubleTap']) $('action-legend').append(actionLabel(slot));
const shiftLegend = element('span', undefined, 'action');
const shiftIcon = element('span', undefined, 'action-icon');
shiftIcon.style.setProperty('--action-icon', "url('icons/shift.svg')");
shiftIcon.setAttribute('aria-hidden', 'true');
shiftLegend.append(shiftIcon, element('span', 'Alternate character (Shift)'));
$('action-legend').append(shiftLegend);

function render(layers) {
  const fragment = document.createDocumentFragment();
  for (const layer of layerTriggerList(layers)) {
    const item = element('li');
    const defaultTitle = `Layer ${layer.position}`;
    const heading = layer.title && layer.title !== defaultTitle
      ? `Layer ${layer.position} - ${layer.title}`
      : defaultTitle;
    item.append(element('strong', heading));
    if (layer.triggers.length) {
      for (const trigger of layer.triggers) {
        const action = LAYER_ACTIONS[trigger.slot];
        const route = element('div', undefined, 'layer-route');
        const icon = element('span', undefined, 'action-icon');
        icon.style.setProperty('--action-icon', `url('icons/${action.icon}.svg')`);
        icon.setAttribute('aria-label', action.name);
        const glyph = KEY_GLYPHS[trigger.keyLabel];
        const key = element('strong', glyph || trigger.keyLabel, 'key-chip');
        if (glyph) key.classList.add('key-glyph');
        key.setAttribute('aria-label', `${trigger.keyLabel} key`);
        key.title = `${trigger.keyLabel} key`;
        const description = `${action.instruction[0].toUpperCase()}${action.instruction.slice(1)} the ${trigger.keyLabel} key`;
        route.append(icon, key, element('span', description, 'route-description'));
        if (trigger.sourcePosition !== 0) route.append(element('small', `(from Layer ${trigger.sourcePosition})`));
        item.append(route);
      }
    } else {
      item.append(element('div', layer.position === 0
        ? 'Base layer — release a held layer key to return when applicable.'
        : 'No direct key shortcut configured.', 'route-description'));
    }
    fragment.append(item);
  }
  $('layers').replaceChildren(fragment);
}

let loadVersion = 0;
async function reload() {
  const version = ++loadVersion;
  $('status').textContent = 'Loading layout…';
  try {
    const layout = await invoke('load_layout');
    if (version !== loadVersion) return;
    const layers = layout?.data?.layout?.revision?.layers;
    if (!Array.isArray(layers)) throw new Error('Layout has no layer data.');
    render(layers);
    $('layers-description').textContent = layers.length
      ? `Your keyboard has ${layers.length} layers configured; here’s how to access them individually.`
      : 'Your keyboard has no layers configured.';
    $('status').textContent = '';
  } catch (error) {
    if (version !== loadVersion) return;
    $('layers').replaceChildren();
    $('status').textContent = `Could not load layers. Connect your Voyager and refresh the layout from the Developer menu. ${error}`;
  } finally {
    // Layout refreshes arrive from the tray or HID watcher.
  }
}

// Install before loading, because the initial fetch can itself refresh the cache.
try {
  await listen('layout-refreshed', reload);
} catch (error) {
  console.error('Could not listen for layout refreshes:', error);
}
await reload();
