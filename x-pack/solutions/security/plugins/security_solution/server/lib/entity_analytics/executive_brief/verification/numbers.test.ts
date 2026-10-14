/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evidence } from '../signals';
import type { Brief } from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import { buildValidBrief, FIXTURE_EVIDENCE, runCheck } from './__fixtures__/evidence';
import { checkNumbers } from './numbers';

const DIGIT_HOST = 'host:10-finance';
const EVIDENCE: Evidence = {
  ...FIXTURE_EVIDENCE,
  entities: {
    ...FIXTURE_EVIDENCE.entities,
    [DIGIT_HOST]: { entity: { id: DIGIT_HOST, name: '10 finance', type: 'host' } },
  },
};

const run = (brief: Brief) => runCheck(checkNumbers, brief, EVIDENCE, '7d');

/** Runs the check on a brief whose `threats` assessment says `summary` and cites fact 1. */
const runAssessment = (summary: string) => {
  const brief = buildValidBrief();
  brief.assessments.threats = { ...brief.assessments.threats, summary, factIds: [1] };
  return run(brief).dropped;
};

describe('checkNumbers', () => {
  it.each([
    ['keeps a number from a fact its assessments cite', 'The attack has 12 alerts.', 0],
    ['rejects a number no assessment backs', 'The attack has 250 alerts.', 1],
  ])('verdict: %s', (_name, summary, errors) => {
    const brief = buildValidBrief();
    brief.verdict.summary = summary;
    expect(run(brief).structuralErrors).toHaveLength(errors);
  });

  it('keeps a number from a cited fact', () => {
    expect(runAssessment('The attack has 12 alerts.')).toEqual({});
  });

  it('drops a claim with an invented number', () => {
    expect(runAssessment('The attack has 250 alerts.')).toEqual({ number: 1 });
  });

  it.each([
    ['dates', 'On Oct 7 at 08:31 the attack started.'],
    ['mention tokens', `{{ entity.id ${DIGIT_HOST} }} is in the attack.`],
    ['entity names', 'The 10 finance host is in the attack.'],
    ['EUIDs', `${DIGIT_HOST} is in the attack.`],
  ])('masks %s', (_name, summary) => {
    expect(runAssessment(summary)).toEqual({});
  });
});
