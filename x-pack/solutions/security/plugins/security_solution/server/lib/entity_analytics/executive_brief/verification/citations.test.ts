/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Brief } from '../../../../../common/entity_analytics/executive_brief/brief';
import { buildValidBrief, FIXTURE_EVIDENCE, ROD } from './__fixtures__/evidence';
import { checkCitations } from './citations';
import { buildEvidenceIndex } from './evidence_index';

const run = (change: (brief: Brief) => void) => {
  const brief = buildValidBrief();
  change(brief);
  return checkCitations(brief, { index: buildEvidenceIndex(FIXTURE_EVIDENCE), dropped: new Set() });
};

describe('checkCitations', () => {
  it('removes unknown ids from evidence lists', () => {
    const { brief, drops, structuralErrors } = run((b) => {
      b.verdict.evidence = ['F-1', 'F-99', ROD];
    });
    expect(brief.verdict.evidence).toEqual(['F-1']);
    expect(drops).toEqual([]);
    expect(structuralErrors).toEqual([]);
  });

  it.each<[string, (brief: Brief) => void, { drops: number; structural: number }]>([
    ['drops an area', (b) => (b.areas[1].evidence = [ROD]), { drops: 1, structural: 0 }],
    [
      'makes the verdict structural',
      (b) => (b.verdict.evidence = ['F-404']),
      { drops: 0, structural: 1 },
    ],
  ])('a claim without a fact or link: %s', (_name, change, expected) => {
    const { drops, structuralErrors } = run(change);
    expect({ drops: drops.length, structural: structuralErrors.length }).toEqual(expected);
  });

  it('lets a clear claim go without citations', () => {
    const { drops, structuralErrors } = run((b) => {
      b.areas[1] = { id: 'response', level: 'clear', summary: 'Nothing to handle.', evidence: [] };
    });
    expect(drops).toEqual([]);
    expect(structuralErrors).toEqual([]);
  });

  it.each([
    ['a group of ids', 'One attack (F-1, L-1) is open.', 'One attack is open.'],
    [
      'groups ending sentences',
      'One attack (F-1). It is open (F-1 and L-1)',
      'One attack. It is open',
    ],
    ['no group', 'One attack (in production) is open.', 'One attack (in production) is open.'],
  ])('strips citation groups from prose: %s', (_name, summary, expected) => {
    expect(run((b) => (b.areas[0].summary = summary)).brief.areas[0].summary).toBe(expected);
  });
});
