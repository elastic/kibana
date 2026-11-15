/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reportWorkerOutcomeStepInputSchema } from '../../../common/step_types';
import { findOutcomeContradictions } from './find_outcome_contradictions';

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

  const INVESTIGATION_ID = '0b9f4a3e-1c2d-8e3f-8a4b-5c6d7e8f9a0b';
  const parse = (input: Record<string, unknown>) => reportWorkerOutcomeStepInputSchema.parse(input);
  const tuning = (override: Record<string, unknown>) =>
    parse({
      change_type: 'none',
      decision: 'none',
      entry_gate: 'skipped',
      event: 'rule_tuning_review_completed',
      ...override,
    });
  const coverage = (override: Record<string, unknown>) =>
    parse({
      decision: 'none',
      entry_gate: 'skipped',
      event: 'rule_coverage_review_completed',
      proposal_kind: 'none',
      verdict: 'none',
      ...override,
    });
  const hunt = (override: Record<string, unknown>) =>
    parse({
      event: 'hunt_report_completed',
      hunt_status: 'failed',
      package_status: 'success',
      ...override,
    });

  it.each([
    [
      'none in a tuning review with its Investigation',
      tuning({ investigation_id: INVESTIGATION_ID }),
      [],
    ],
    [
      'none in a tuning review of an unavailable rule without an Investigation',
      tuning({ investigation_id: '', rule_unavailable: true }),
      [],
    ],
    [
      'a tuning review of an available rule without an Investigation',
      tuning({ investigation_id: '', rule_unavailable: false }),
      ['rule_tuning_review_completed without investigation_id requires rule_unavailable'],
    ],
    [
      'none in a coverage review with its Investigation',
      coverage({ investigation_id: INVESTIGATION_ID }),
      [],
    ],
    [
      'none in a failed coverage check without an Investigation',
      coverage({ check_failed: true, investigation_id: '' }),
      [],
    ],
    [
      'a coverage review whose check ran without an Investigation',
      coverage({ check_failed: false, investigation_id: '' }),
      ['rule_coverage_review_completed without investigation_id requires check_failed'],
    ],
    [
      'none in a hunt report with its Investigation',
      hunt({ investigation_id: INVESTIGATION_ID }),
      [],
    ],
    [
      'none in an incomplete hunt report without an Investigation',
      hunt({ investigation_id: '', package_status: 'run_incomplete' }),
      [],
    ],
    [
      'a successful hunt report without an Investigation',
      hunt({ investigation_id: '', package_status: 'success' }),
      ['hunt_report_completed without investigation_id requires package_status run_incomplete'],
    ],
  ])('finds %s', (_label, input, expected) => {
    expect(findOutcomeContradictions(input)).toEqual(expected);
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
