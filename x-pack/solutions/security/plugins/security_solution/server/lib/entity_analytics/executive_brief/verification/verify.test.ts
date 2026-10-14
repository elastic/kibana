/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Assessment } from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import { buildValidBrief, FIXTURE_EVIDENCE } from './__fixtures__/evidence';
import { verifyBrief } from './verify';

const SUMMARY = 'The attack is not acknowledged yet.';

describe('verifyBrief: cited fact ids', () => {
  it.each<[string, Assessment['factIds'], Pick<Assessment, 'level' | 'factIds'>, number]>([
    ['removes unknown and duplicate ids', [1, 99, 1], { level: 'action', factIds: [1] }, 0],
    [
      'lowers an assessment left without a known fact to clear',
      [404],
      { level: 'clear', factIds: [] },
      1,
    ],
  ])('%s', (_name, factIds, expected, lowered) => {
    const brief = buildValidBrief();
    brief.assessments.response = { level: 'action', summary: SUMMARY, factIds };

    const result = verifyBrief(brief, FIXTURE_EVIDENCE);

    expect(result.brief.assessments.response).toEqual({ summary: SUMMARY, ...expected });
    expect(result.summary).toEqual({ dropped: {}, lowered });
    expect(result.structuralErrors).toEqual([]);
  });

  it('lets a clear assessment go without citations', () => {
    const brief = buildValidBrief();
    brief.assessments.response = { level: 'clear', summary: 'Nothing to handle.', factIds: [] };

    expect(verifyBrief(brief, FIXTURE_EVIDENCE).summary).toEqual({ dropped: {}, lowered: 0 });
  });
});
