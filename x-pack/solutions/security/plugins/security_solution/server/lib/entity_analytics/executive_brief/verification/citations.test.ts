/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Brief } from '../../../../../common/entity_analytics/executive_brief/brief';
import { buildValidBrief, FIXTURE_EVIDENCE } from './__fixtures__/evidence';
import { checkCitations } from './citations';
import { buildEvidenceIndex } from './evidence_index';

const run = (change: (brief: Brief) => void) => {
  const brief = buildValidBrief();
  change(brief);
  return checkCitations(brief, { index: buildEvidenceIndex(FIXTURE_EVIDENCE), dropped: new Set() });
};

describe('checkCitations', () => {
  it('removes unknown fact and link ids', () => {
    const { brief, drops, structuralErrors, notes } = run((b) => {
      b.verdict.factIds = [1, 99, 1];
      b.verdict.linkIds = [1, 7];
    });
    expect(brief.verdict).toMatchObject({ factIds: [1], linkIds: [1] });
    expect(notes).toEqual(['removed unknown fact ids: 99', 'removed unknown link ids: 7']);
    expect(drops).toEqual([]);
    expect(structuralErrors).toEqual([]);
  });

  it.each<[string, (brief: Brief) => void, { drops: number; structural: number }]>([
    [
      'drops an area whose only fact id is unknown',
      (b) => {
        b.areas[1].factIds = [404];
        b.areas[1].linkIds = [];
      },
      { drops: 1, structural: 0 },
    ],
    [
      'makes the verdict structural',
      (b) => {
        b.verdict.factIds = [];
        b.verdict.linkIds = [404];
      },
      { drops: 0, structural: 1 },
    ],
  ])('a claim left without a fact or link: %s', (_name, change, expected) => {
    const { drops, structuralErrors } = run(change);
    expect({ drops: drops.length, structural: structuralErrors.length }).toEqual(expected);
  });

  it('lets a clear claim go without citations', () => {
    const { drops, structuralErrors } = run((b) => {
      b.areas[1] = {
        id: 'response',
        level: 'clear',
        summary: 'Nothing to handle.',
        factIds: [],
        linkIds: [],
      };
    });
    expect(drops).toEqual([]);
    expect(structuralErrors).toEqual([]);
  });
});
