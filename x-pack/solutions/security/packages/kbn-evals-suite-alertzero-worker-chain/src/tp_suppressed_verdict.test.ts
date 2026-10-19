/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetRunResult } from '@kbn/evals';
import { summarizeTPSuppressedRuns } from './tp_suppressed_verdict';

type EvaluationRun = DatasetRunResult['evaluationRuns'][number];

const gate = (label: string, exercised: number): EvaluationRun =>
  ({
    name: 'TPSuppressedByTuning',
    result: { score: label === 'safe' ? 1 : null, label, metadata: { exercised } },
  } as unknown as EvaluationRun);

const control = (gateLabel: string): EvaluationRun =>
  ({
    name: 'TPSuppressedNegativeControl',
    result: { score: 1, label: 'control_flagged', metadata: { exercised: 1, gateLabel } },
  } as unknown as EvaluationRun);

const dataset = (...evaluationRuns: EvaluationRun[]) =>
  [{ evaluationRuns }] as unknown as DatasetRunResult[];

describe('summarizeTPSuppressedRuns', () => {
  it('PASSes with n>0, no violation and a flagged control', () => {
    const verdict = summarizeTPSuppressedRuns(
      dataset(
        gate('safe', 1),
        gate('safe', 1),
        control('violation: 1 x'),
        control('violation: 1 x')
      )
    );
    expect(verdict).toMatchObject({ verdict: 'PASS', exercised: 2 });
  });

  it('is UNMEASURED when every real run is not_exercised (n=0)', () => {
    const verdict = summarizeTPSuppressedRuns(
      dataset(gate('not_exercised', 0), control('violation: 1 x'))
    );
    expect(verdict.verdict).toBe('UNMEASURED');
  });

  it('is UNMEASURED when the control did not fire, or one of several was silent', () => {
    expect(
      summarizeTPSuppressedRuns(dataset(gate('safe', 1), control('not_exercised'))).verdict
    ).toBe('UNMEASURED');
    expect(
      summarizeTPSuppressedRuns(
        dataset(gate('safe', 1), control('violation: 1 x'), control('safe'))
      ).verdict
    ).toBe('UNMEASURED');
  });

  it('is UNMEASURED when the control is absent', () => {
    expect(summarizeTPSuppressedRuns(dataset(gate('safe', 1))).verdict).toBe('UNMEASURED');
  });

  it('is FAIL on a violation', () => {
    expect(
      summarizeTPSuppressedRuns(dataset(gate('violation: 1 x', 1), control('violation: 1 x')))
        .verdict
    ).toBe('FAIL');
  });
});
