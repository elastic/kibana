/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndPhaseStepProjection } from '@kbn/pnd-common';
import type { PndExecutionQueryResult } from '../../../../hooks/use_pnd_execution';

import { resolveCorrelationUnavailable } from '.';

const correlatedStep: PndPhaseStepProjection = {
  phaseStepId: 'step-1-1',
  status: 'completed',
  workflowRunId: 'run-1',
};

const result = ({
  isCorrelated,
  steps = [],
}: {
  isCorrelated?: boolean;
  steps?: PndPhaseStepProjection[];
}): PndExecutionQueryResult => ({
  execution: { correlationId: 'ad-1', steps },
  isCorrelated,
});

describe('resolveCorrelationUnavailable', () => {
  it('is false before the projection has been read, so a first paint never accuses the run', () => {
    expect(resolveCorrelationUnavailable(undefined)).toBe(false);
  });

  it('believes the server when it says the discovery correlated to nothing', () => {
    expect(resolveCorrelationUnavailable(result({ isCorrelated: false }))).toBe(true);
  });

  it('believes the server when it says the discovery correlated, even if no row names a run', () => {
    expect(resolveCorrelationUnavailable(result({ isCorrelated: true }))).toBe(false);
  });

  it('falls back to the rows when the server did not say', () => {
    expect(resolveCorrelationUnavailable(result({ steps: [] }))).toBe(true);
  });

  it('reads a row that names a run as correlated when the server did not say', () => {
    expect(resolveCorrelationUnavailable(result({ steps: [correlatedStep] }))).toBe(false);
  });
});
