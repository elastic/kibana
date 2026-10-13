/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Assessment } from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import type { FullBrief } from './__fixtures__/evidence';
import { buildValidBrief, runCheck } from './__fixtures__/evidence';
import { checkCitations } from './citations';

const run = (change: (brief: FullBrief) => void) => {
  const brief = buildValidBrief();
  change(brief);
  return runCheck(checkCitations, brief);
};

describe('checkCitations', () => {
  it('removes unknown fact ids', () => {
    const { brief, dropped, notes } = run((b) => {
      b.assessments.threats.factIds = [1, 99, 1];
    });
    expect(brief.assessments.threats?.factIds).toEqual([1]);
    expect(notes).toEqual(['removed unknown fact ids: 99']);
    expect([...dropped]).toEqual([]);
  });

  it.each<[string, Assessment, string[]]>([
    [
      'drops an assessment whose only fact id is unknown',
      { level: 'action', summary: 'The attack is not acknowledged yet.', factIds: [404] },
      ['response'],
    ],
    [
      'lets a clear assessment go without citations',
      { level: 'clear', summary: 'Nothing to handle.', factIds: [] },
      [],
    ],
  ])('%s', (_name, response, expected) => {
    const { dropped, structuralErrors } = run((b) => {
      b.assessments.response = response;
    });
    expect([...dropped.keys()]).toEqual(expected);
    expect(structuralErrors).toEqual([]);
  });
});
