/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTacticLookup, loadTacticLookup } from './mitre_tactics';
import { TEST_TACTICS, createTestLookup } from './test_helpers';

describe('tactic lookup', () => {
  const lookup = createTestLookup();

  it('keeps ids as they are', () => {
    expect(lookup.resolveId('TA0008')).toBe('TA0008');
  });

  it('aliases v18 and v19 names to the same id', () => {
    expect(lookup.resolveId('Defense Evasion')).toBe('TA0005');
    expect(lookup.resolveId('Stealth')).toBe('TA0005');
    expect(lookup.resolveId('defense-evasion')).toBe('TA0005');
    expect(lookup.resolveId('Lateral Movement')).toBe('TA0008');
    expect(lookup.resolveId('Defense Impairment')).toBe('TA0112');
  });

  it('returns undefined for unknown names', () => {
    expect(lookup.resolveId('Not A Tactic')).toBeUndefined();
  });

  it('displays the current (v19) name and orders by position', () => {
    expect(lookup.nameOf('TA0005')).toBe('Stealth');
    expect(lookup.nameOf('TA9999')).toBe('TA9999');
    expect(lookup.positionOf('TA0001')).toBeLessThan(lookup.positionOf('TA0008'));
    expect(lookup.positionOf('TA9999')).toBe(Number.MAX_SAFE_INTEGER);
    expect(lookup.ordered.map(({ id }) => id)).toEqual(TEST_TACTICS.map(({ id }) => id));
  });

  it('builds from managed tactic data without being given any', () => {
    expect(buildTacticLookup([]).resolveId('Execution')).toBe('TA0002');
  });

  it('falls back to bundled MITRE data when no data client is provided', async () => {
    const loaded = await loadTacticLookup();
    expect(loaded.byId.get('TA0008')?.name).toBe('Lateral Movement');
    expect(loaded.resolveId('Defense Evasion')).toBe('TA0005');
  });
});
