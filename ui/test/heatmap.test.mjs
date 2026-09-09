import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Heatmap, restoreCounts, heatmapFill, HEATMAP_STORAGE_KEY, LEGACY_HEATMAP_STORAGE_KEY } from '../heatmap.mjs';

function fixture(saved = '[]') {
  const values = new Map([[HEATMAP_STORAGE_KEY, saved]]);
  const timers = new Map();
  const errors = [];
  let next = 0;
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const heatmap = new Heatmap(storage, fn => { timers.set(++next, fn); return next; }, id => timers.delete(id), (...error) => errors.push(error));
  return { heatmap, storage, timers, errors };
}

test('restores bounded physical counts, discarding malformed entries', () => {
  const counts = restoreCounts([1, -1, 1.5, '5', null, 0x100000000, NaN]);
  assert.equal(counts.length, 52);
  assert.deepEqual([...counts.slice(0, 7)], [1, 0, 0, 0, 0, 0xffffffff, 0]);
  assert.equal(restoreCounts({ count: 2 })[0], 0);
});

test('continuous typing retains the original save timer and persists across instances', () => {
  const { heatmap, timers, storage } = fixture();
  for (let i = 0; i < 100; i++) heatmap.record(24);
  assert.deepEqual([...timers.keys()], [1]);
  timers.get(1)();
  assert.equal(timers.size, 0);
  assert.equal(new Heatmap(storage).counts[24], 100);
  assert.equal(heatmap.record(52), false);
  assert.equal(heatmap.record(-1), false);
  assert.equal(heatmap.record('1'), false);
});

test('migrates the Layer HUD heatmap key to KeyAura without losing counts', () => {
  const values = new Map([[LEGACY_HEATMAP_STORAGE_KEY, JSON.stringify([12])]]);
  const storage = {
    getItem: key => values.get(key),
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  const heatmap = new Heatmap(storage);
  assert.equal(heatmap.counts[0], 12);
  heatmap.flush();
  assert.equal(JSON.parse(values.get(HEATMAP_STORAGE_KEY))[0], 12);
  assert.equal(values.has(LEGACY_HEATMAP_STORAGE_KEY), false);
});

test('reset cancels queued saves and survives restart; counts never wrap', () => {
  const { heatmap, timers, storage } = fixture(JSON.stringify([0xffffffff]));
  heatmap.record(0);
  assert.equal(heatmap.counts[0], 0xffffffff);
  heatmap.reset();
  assert.equal(timers.size, 0);
  assert.equal(new Heatmap(storage).counts.reduce((a, b) => a + b), 0);
});

test('corrupt or unavailable storage does not interrupt key tracking', () => {
  const { heatmap, errors } = fixture('{broken');
  heatmap.record(51);
  heatmap.flush();
  assert.equal(heatmap.counts[51], 1);
  assert.equal(errors.length, 1);
  heatmap.storage = { setItem() { throw Error('quota'); } };
  heatmap.flush();
  assert.equal(errors.length, 2);
});

test('color and saturation changes are computed from the current preferences', () => {
  assert.equal(heatmapFill(0, '#ff0000', 20, '#000000', 0.4), 'rgba(0,0,0,0.4)');
  assert.equal(heatmapFill(10, '#ff0000', 20, '#000000', 0.4), 'rgba(128,0,0,0.4)');
  assert.equal(heatmapFill(20, '#00ff00', 20, '#000000', 0.4), 'rgba(0,255,0,0.4)');
  assert.equal(heatmapFill(200, '#00ff00', 20, '#000000', 0.4), 'rgba(0,255,0,0.4)');
  assert.notEqual(heatmapFill(10, '#ff0000', 20), heatmapFill(10, '#0000ff', 20));
  assert.notEqual(heatmapFill(10, '#ff0000', 20), heatmapFill(10, '#ff0000', 40));
  assert.equal(heatmapFill(10, undefined, 20), heatmapFill(10, '#ff5c5c', 20));
  assert.equal(heatmapFill(20, '#00ff00', 20, '#000000', 0), 'rgba(0,255,0,0)');
  assert.equal(heatmapFill(20, '#00ff00', 20, '#000000', 1), 'rgba(0,255,0,1)');
});

test('default timers are called without binding them to the Heatmap instance', (t) => {
  let saved;
  let canceled;
  t.mock.method(globalThis, 'setTimeout', function (callback, delay) {
    assert.equal(this, undefined, 'a browser timer cannot use Heatmap as its Window receiver');
    assert.equal(delay, 250);
    saved = callback;
    return 123;
  });
  t.mock.method(globalThis, 'clearTimeout', function (id) {
    assert.equal(this, undefined);
    canceled = id;
  });
  const heatmap = new Heatmap();
  assert.equal(heatmap.record(51), true);
  assert.equal(heatmap.counts[51], 1);
  saved();
  assert.equal(canceled, 123);
  assert.equal(heatmap.timer, null);
  heatmap.record(51);
  heatmap.reset();
  assert.equal(heatmap.counts[51], 0);
});
