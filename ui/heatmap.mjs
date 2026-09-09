export const HEATMAP_STORAGE_KEY = 'keyaura-heatmap-v1';
export const LEGACY_HEATMAP_STORAGE_KEY = 'layer-hud-heatmap-v1';
const MAX_COUNT = 0xffffffff;

export function restoreCounts(saved, size = 52) {
  const counts = new Uint32Array(size);
  if (Array.isArray(saved)) saved.slice(0, size).forEach((count, index) => {
    if (Number.isSafeInteger(count) && count > 0) counts[index] = Math.min(MAX_COUNT, count);
  });
  return counts;
}

export function heatmapFill(count, color, peak, baseColor = '#ffffff', opacity = 0) {
  const strength = Math.min(1, Math.max(0, count) / Math.max(1, peak));
  const rgb = (hex, fallback) => {
    const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : fallback;
    const n = parseInt(safe.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const base = rgb(baseColor, '#ffffff');
  const hot = rgb(color, '#ff5c5c');
  // Heat changes the fill's RGB, never its configured transparency.
  const fill = base.map((channel, i) => Math.round(channel + (hot[i] - channel) * strength));
  return `rgba(${fill.join(',')},${Math.min(1, Math.max(0, opacity))})`;
}

export class Heatmap {
  constructor(storage, schedule = (callback, delay) => setTimeout(callback, delay), cancel = timer => clearTimeout(timer), onError = console.warn) {
    this.storage = storage;
    // Browser timer functions require a Window receiver. Wrappers keep them
    // from being invoked as Heatmap methods (which throws in WKWebView).
    this.schedule = schedule;
    this.cancel = cancel;
    this.onError = onError;
    this.timer = null;
    let saved;
    try {
      const current = storage?.getItem(HEATMAP_STORAGE_KEY);
      const legacy = storage?.getItem(LEGACY_HEATMAP_STORAGE_KEY);
      saved = JSON.parse(current || legacy || '[]');
    }
    catch (error) { onError('Could not load heatmap history', error); }
    this.counts = restoreCounts(saved);
  }

  record(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.counts.length) return false;
    this.counts[index] = Math.min(MAX_COUNT, this.counts[index] + 1);
    // Throttle, rather than debounce: continuous typing must still reach disk.
    if (this.timer === null) this.timer = this.schedule(() => this.flush(), 250);
    return true;
  }

  flush() {
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
    try {
      this.storage?.setItem(HEATMAP_STORAGE_KEY, JSON.stringify([...this.counts]));
      this.storage?.removeItem?.(LEGACY_HEATMAP_STORAGE_KEY);
    }
    catch (error) { this.onError('Could not save heatmap history', error); }
  }

  reset() {
    this.counts.fill(0);
    this.flush();
  }
}
