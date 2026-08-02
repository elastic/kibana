/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndPhaseStepProjection } from '@kbn/pnd-common';

import { isCorrelationUnavailable } from '.';

const notStarted = (phaseStepId: string): PndPhaseStepProjection => ({
  phaseStepId,
  status: 'not_started',
});

const upstream = (phaseStepId: string): PndPhaseStepProjection => ({
  phaseStepId,
  status: 'upstream',
});

const executed = (phaseStepId: string): PndPhaseStepProjection => ({
  phaseStepId,
  status: 'completed',
  stepExecutionId: `${phaseStepId}-step`,
  workflowId: 'system-security-watch-deep',
  workflowRunId: 'run-1',
});

describe('isCorrelationUnavailable', () => {
  it('returns true for a response with no rows at all', () => {
    expect(isCorrelationUnavailable([])).toBe(true);
  });

  it('returns true when not one row names a workflow run', () => {
    expect(isCorrelationUnavailable([notStarted('step-1-1'), upstream('step-1-2')])).toBe(true);
  });

  it('returns false as soon as one row names a workflow run', () => {
    expect(isCorrelationUnavailable([notStarted('step-1-1'), executed('step-2-1')])).toBe(false);
  });

  it('returns false on a workflowRunId alone, whatever the status of the row carrying it', () => {
    expect(isCorrelationUnavailable([{ ...upstream('step-1-2'), workflowRunId: 'run-1' }])).toBe(
      false
    );
  });

  it('treats an empty workflowRunId as no correlation, because the server uses it for unknown', () => {
    expect(isCorrelationUnavailable([{ ...notStarted('step-1-1'), workflowRunId: '' }])).toBe(true);
  });
});
