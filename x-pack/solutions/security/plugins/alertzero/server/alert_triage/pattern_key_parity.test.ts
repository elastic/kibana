/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPatternKeys, getDetection, getField } from './pattern_key';
import { PARITY_ALERTS } from './pattern_key_parity_fixture';

interface FixtureAlert {
  id: string;
  doc: Record<string, unknown>;
  strict: number | null;
  wide: number | null;
}

// The fixture holds the groups an offline reference implementation gave (see the fixture header). Two alerts must share
// a key here exactly when they share it there, so Grouping, Decisions and the back-test cannot drift
// from the reference the replay numbers were computed with. Registry hive names and SIDs are not in it:
// only this module normalises them (see pattern_key.test.ts).
describe('pattern keys match the reference implementation', () => {
  const alerts: FixtureAlert[] = PARITY_ALERTS;

  const partition = (keyOf: (alert: FixtureAlert) => string | number | null | undefined) => {
    const groups = new Map<string | number, string[]>();
    alerts.forEach((alert) => {
      const key = keyOf(alert);
      if (key === null || key === undefined) return;
      groups.set(key, [...(groups.get(key) ?? []), alert.id]);
    });
    return [...groups.values()].map((ids) => ids.sort()).sort();
  };

  it('puts the same alerts together under the strict key', () => {
    expect(partition((alert) => buildPatternKeys(alert.doc).strict)).toEqual(
      partition((alert) => alert.strict)
    );
  });

  it('puts the same alerts together under the wide key', () => {
    expect(partition((alert) => buildPatternKeys(alert.doc).wide)).toEqual(
      partition((alert) => alert.wide)
    );
  });

  it('has no strict key for exactly the alerts the reference has none for', () => {
    const noStrict = (keyOf: (alert: FixtureAlert) => unknown) =>
      alerts.filter((alert) => keyOf(alert) == null).map(({ id }) => id);
    expect(noStrict((alert) => buildPatternKeys(alert.doc).strict)).toEqual(
      noStrict((alert) => alert.strict)
    );
    expect(noStrict((alert) => alert.strict).length).toBeGreaterThan(0);
  });

  it('gives every alert a wide key', () => {
    expect(alerts.every((alert) => typeof buildPatternKeys(alert.doc).wide === 'string')).toBe(
      true
    );
  });
});

describe('getField and getDetection read the alerts index shape', () => {
  it('reads a flat dotted key and a nested object the same way', () => {
    expect(getField({ 'a.b': 1 }, 'a.b')).toBe(1);
    expect(getField({ a: { b: 1 } }, 'a.b')).toBe(1);
  });

  it('takes the first element of a list at any level', () => {
    expect(getField({ a: [{ b: [7, 8] }] }, 'a.b')).toBe(7);
  });

  it('has no detection without a name override, whatever rule.id says', () => {
    expect(getDetection({ rule: { id: 'd1' } })).toBe('');
  });

  it('is rule.id, else event.code, for a rule that overrides the name', () => {
    const base = { 'kibana.alert.rule.rule_name_override': 'message' };
    expect(getDetection({ ...base, rule: { id: 'd1' }, event: { code: 'c' } })).toBe('d1');
    expect(getDetection({ ...base, event: { code: 'c' } })).toBe('c');
    expect(getDetection(base)).toBe('');
  });
});
