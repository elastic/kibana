/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupThreatsByFramework } from './group_threats_by_framework';
import { MITRE_ATLAS_FRAMEWORK, MITRE_ATTACK_FRAMEWORK } from './threat_framework';

const buildThreat = (framework?: string) => ({
  framework,
  tactic: { id: 'TA0001', name: 'x', reference: 'r' },
  technique: [],
});

describe('groupThreatsByFramework', () => {
  it('returns an empty array for empty, null, or undefined input', () => {
    expect(groupThreatsByFramework([])).toEqual([]);
    expect(groupThreatsByFramework(undefined)).toEqual([]);
    expect(groupThreatsByFramework(null)).toEqual([]);
  });

  it('groups a single ATT&CK framework', () => {
    const first = buildThreat(MITRE_ATTACK_FRAMEWORK);
    const second = buildThreat(MITRE_ATTACK_FRAMEWORK);

    expect(groupThreatsByFramework([first, second])).toEqual([
      {
        framework: 'enterprise',
        label: MITRE_ATTACK_FRAMEWORK,
        threats: [first, second],
      },
    ]);
  });

  it('orders enterprise before atlas regardless of input order', () => {
    const atlas = buildThreat(MITRE_ATLAS_FRAMEWORK);
    const attack = buildThreat(MITRE_ATTACK_FRAMEWORK);

    const groups = groupThreatsByFramework([atlas, attack]);

    expect(groups.map(({ framework }) => framework)).toEqual(['enterprise', 'atlas']);
    expect(groups[0].threats).toEqual([attack]);
    expect(groups[0].threats[0]).toBe(attack);
    expect(groups[1].threats).toEqual([atlas]);
    expect(groups[1].threats[0]).toBe(atlas);
  });

  it('places unknown frameworks after known ones in first-seen order with raw labels', () => {
    const unknownB = buildThreat('Custom B');
    const attack = buildThreat(MITRE_ATTACK_FRAMEWORK);
    const unknownA = buildThreat('Custom A');
    const unknownB2 = buildThreat('Custom B');

    const groups = groupThreatsByFramework([unknownB, attack, unknownA, unknownB2]);

    expect(groups.map(({ framework, label }) => ({ framework, label }))).toEqual([
      { framework: 'enterprise', label: MITRE_ATTACK_FRAMEWORK },
      { framework: undefined, label: 'Custom B' },
      { framework: undefined, label: 'Custom A' },
    ]);
    expect(groups[1].threats).toEqual([unknownB, unknownB2]);
    expect(groups[1].threats[0]).toBe(unknownB);
    expect(groups[1].threats[1]).toBe(unknownB2);
  });

  it('skips null holes and keeps sibling threats', () => {
    const first = buildThreat(MITRE_ATTACK_FRAMEWORK);
    const later = buildThreat(MITRE_ATTACK_FRAMEWORK);
    const threats = [first, null, later] as unknown as Array<ReturnType<typeof buildThreat>>;

    const groups = groupThreatsByFramework(threats);

    expect(groups).toHaveLength(1);
    expect(groups[0].threats).toEqual([first, later]);
    expect(groups[0].threats[0]).toBe(first);
    expect(groups[0].threats[1]).toBe(later);
  });

  it('treats a missing framework as the enterprise group', () => {
    const threat = buildThreat(undefined);

    expect(groupThreatsByFramework([threat])).toEqual([
      { framework: 'enterprise', label: MITRE_ATTACK_FRAMEWORK, threats: [threat] },
    ]);
  });

  it('treats an empty or blank framework string as the enterprise group', () => {
    const empty = buildThreat('');
    const blank = buildThreat('  ');

    expect(groupThreatsByFramework([empty, blank])).toEqual([
      { framework: 'enterprise', label: MITRE_ATTACK_FRAMEWORK, threats: [empty, blank] },
    ]);
  });

  it('keeps a non-empty unrecognized framework as an unknown group', () => {
    const threat = buildThreat('MITRE Mobile');

    expect(groupThreatsByFramework([threat])).toEqual([
      { framework: undefined, label: 'MITRE Mobile', threats: [threat] },
    ]);
  });
});
