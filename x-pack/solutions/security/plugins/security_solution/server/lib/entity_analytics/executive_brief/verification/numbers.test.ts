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

/** Runs the check on a brief whose `threats` assessment says `summary` and cites fact 1. */
const runAssessment = (summary: string) => {
  const brief = buildValidBrief();
  brief.assessments.threats = { ...brief.assessments.threats, summary, factIds: [1], linkIds: [] };
  return createNumbersCheck('7d')(brief, {
    index: buildEvidenceIndex(EVIDENCE),
    dropped: new Set(),
  });
};

describe('createNumbersCheck', () => {
  it('keeps a number from a cited fact', () => {
    expect(runAssessment('The attack has 12 alerts.').drops).toEqual([]);
  });

  it('drops a claim with an invented number', () => {
    expect(runAssessment('The attack has 250 alerts.').drops).toEqual([
      expect.objectContaining({ path: 'assessments.threats', check: 'number' }),
    ]);
  });

  it.each([
    ['dates', 'On Oct 7 at 08:31 the attack started.'],
    ['mention tokens', `{{ entity.id ${DIGIT_HOST} }} is in the attack.`],
    ['entity names', 'The 10 finance host is in the attack.'],
    ['EUIDs', `${DIGIT_HOST} is in the attack.`],
  ])('masks %s', (_name, summary) => {
    expect(runAssessment(summary).drops).toEqual([]);
  });
});
