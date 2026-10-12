/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildValidBrief, FIXTURE_EVIDENCE } from './__fixtures__/evidence';
import { verifyBrief } from './verify_brief';

describe('verifyBrief', () => {
  it('keeps a valid brief intact', () => {
    const brief = buildValidBrief();
    const result = verifyBrief(brief, FIXTURE_EVIDENCE, { range: '7d' });
    expect(result.structuralErrors).toEqual([]);
    expect(result.summary).toEqual({ dropped: {}, flags: [] });
    expect(result.brief).toEqual(brief);
  });

  it('drops failing items, renumbers action threat references and flag paths', () => {
    const brief = buildValidBrief();
    // Threat 1 invents a number and is dropped; threat 2 becomes threat 1.
    brief.threats[0].narrative = 'ENT-1 raised 4,000 alerts.';
    // Weak relation on threat 2: kept, flagged.
    brief.threats[1].whyItMatters = 'ENT-5 administers ENT-6.';
    // Action 1 has no valid evidence and is dropped.
    brief.actions[0].evidence = ['F-77'];

    const result = verifyBrief(brief, FIXTURE_EVIDENCE, { range: '7d' });

    expect(result.structuralErrors).toEqual([]);
    expect(result.brief.threats.map(({ title }) => title)).toEqual([
      'Unusual alerts on a marketing laptop',
    ]);
    expect(result.brief.actions).toEqual([
      expect.objectContaining({ action: 'Review the alerts on ENT-6', threat: 1 }),
    ]);
    expect(result.summary.dropped).toEqual({ number: 1, citation: 1 });
    expect(result.summary.flags).toEqual([
      expect.objectContaining({ path: 'threats[0].whyItMatters', check: 'relation' }),
    ]);
    expect(result.notes.some((note) => note.startsWith('dropped threats[0] (number)'))).toBe(true);
  });

  it('unlinks an action from a dropped threat but keeps it', () => {
    const brief = buildValidBrief();
    brief.threats[1].narrative = 'ENT-5 compromised ENT-6.';
    const result = verifyBrief(brief, FIXTURE_EVIDENCE);
    expect(result.brief.threats).toHaveLength(1);
    expect(result.brief.actions[1]).not.toHaveProperty('threat');
    expect(result.brief.actions[0].threat).toBe(1);
  });

  it('reports a structural error when every proposed threat fails', () => {
    const brief = buildValidBrief();
    brief.threats.forEach((threat) => {
      threat.evidence = [];
      threat.keyEvents = [];
    });
    const result = verifyBrief(brief, FIXTURE_EVIDENCE);
    expect(result.structuralErrors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('none of the 2 threats passed verification'),
        expect.stringContaining('verdict.level: "urgent" needs at least one threat'),
      ])
    );
  });

  it('reports verdict problems as structural without dropping the verdict', () => {
    const brief = buildValidBrief();
    brief.verdict.evidence = ['F-500'];
    const result = verifyBrief(brief, FIXTURE_EVIDENCE);
    expect(result.structuralErrors).toEqual([expect.stringMatching(/^verdict: /)]);
    expect(result.brief.verdict.headline).toBe(brief.verdict.headline);
  });
});
