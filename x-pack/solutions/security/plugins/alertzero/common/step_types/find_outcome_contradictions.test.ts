/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findOutcomeContradictions } from './find_outcome_contradictions';
import { reportWorkerOutcomeStepInputSchema } from './report_worker_outcome_step';

const parseRun = (override: Record<string, unknown>) =>
  reportWorkerOutcomeStepInputSchema.parse({
    candidates_found: 12,
    degraded_reason: 'dependency_unavailable',
    event: 'worker_run_completed',
    run_outcome: 'degraded_partial',
    ...override,
  });

describe('findOutcomeContradictions', () => {
  it.each([
    ['none in a degraded partial run with a reason', {}, []],
    [
      'none in a run that produced results but is degraded by a failed lookup',
      { run_outcome: 'produced' },
      [],
    ],
    [
      'none in a run that is not degraded',
      { degraded_reason: 'none', run_outcome: 'produced' },
      [],
    ],
    [
      'none in an empty run whose reason Liquid rendered empty',
      { degraded_reason: '', run_outcome: 'empty_nothing_pending' },
      [],
    ],
    [
      'degraded_partial without a reason',
      { degraded_reason: 'none' },
      ['run_outcome degraded_partial requires a degraded_reason other than none'],
    ],
  ])('finds %s', (_label, override, expected) => {
    expect(findOutcomeContradictions(parseRun(override))).toEqual(expected);
  });

  it('checks no other event', () => {
    expect(
      findOutcomeContradictions(
        reportWorkerOutcomeStepInputSchema.parse({
          event: 'ad_worker_run_completed',
          run_outcome: 'degraded_partial',
        })
      )
    ).toEqual([]);
  });
});
