/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { buildValidBrief, FIXTURE_EVIDENCE } from './__fixtures__/evidence';
import { buildEvidenceIndex } from './evidence_index';
import { createNumbersCheck } from './numbers';

const DIGIT_HOST = 'host:10-finance';
const EVIDENCE: Evidence = {
  ...FIXTURE_EVIDENCE,
  entities: {
    ...FIXTURE_EVIDENCE.entities,
    [DIGIT_HOST]: { entity: { id: DIGIT_HOST, name: '10 finance', type: 'host' } },
  },
};

/** Runs the check on a brief whose `threats` area says `summary` and cites F-1. */
const runArea = (summary: string) => {
  const brief = buildValidBrief();
  brief.areas[0] = { ...brief.areas[0], summary, evidence: ['F-1'] };
  return createNumbersCheck('7d')(brief, {
    index: buildEvidenceIndex(EVIDENCE),
    dropped: new Set(),
  });
};

describe('createNumbersCheck', () => {
  it('keeps a number from a cited fact', () => {
    expect(runArea('The attack has 12 alerts.').drops).toEqual([]);
  });

  it('drops a claim with an invented number', () => {
    expect(runArea('The attack has 250 alerts.').drops).toEqual([
      expect.objectContaining({ path: 'areas[0]', check: 'number' }),
    ]);
  });

  it.each([
    ['dates', 'On Oct 7 at 08:31 the attack started.'],
    ['ids', 'F-1 and L-1 describe the attack.'],
    ['entity names', 'The 10 finance host is in the attack.'],
    ['EUIDs', `${DIGIT_HOST} is in the attack.`],
  ])('masks %s', (_name, summary) => {
    expect(runArea(summary).drops).toEqual([]);
  });
});
