import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDecay, applyVisit, levelFromLoad } from './recovery-model.mjs';

test('low credibility visit increases load', () => {
  const load = applyVisit(10, 4.0, 6.0);
  assert.ok(load > 10);
});

test('high credibility visit reduces load quickly', () => {
  const load = applyVisit(60, 8.5, 6.0);
  assert.equal(load, 38);
});

test('decay reduces load over time', () => {
  const now = Date.now();
  const { load } = applyDecay(50, now - (2 * 60 * 60 * 1000), now, 10);
  assert.ok(load <= 30.1 && load >= 29.9);
});

test('guidance levels map correctly', () => {
  assert.equal(levelFromLoad(20, 'standard'), 'normal');
  assert.equal(levelFromLoad(55, 'standard'), 'elevated');
  assert.equal(levelFromLoad(80, 'standard'), 'high');
});
