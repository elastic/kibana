/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus, type WorkflowStepExecutionDto } from '@kbn/workflows';

import { extractGateAnswer } from '.';

const stepExecution = (
  overrides: Partial<WorkflowStepExecutionDto> = {}
): WorkflowStepExecutionDto =>
  ({
    id: 'step-exec-1',
    startedAt: '2026-08-04T12:00:00.000Z',
    status: ExecutionStatus.COMPLETED,
    stepId: 'await_open_investigation',
    workflowId: 'system-security-watch-deep',
    workflowRunId: 'run-1',
    ...overrides,
  } as WorkflowStepExecutionDto);

describe('extractGateAnswer', () => {
  it('reads the decision, rationale, responder and time of an answered gate', () => {
    expect(
      extractGateAnswer(
        stepExecution({
          hitl: { channel: 'pnd', respondedAt: '2026-08-04T12:17:01.792Z', respondedBy: 'elastic' },
          output: { response: { decision: 'approve', rationale: 'looks real' } },
        })
      )
    ).toEqual({
      decision: 'approve',
      rationale: 'looks real',
      respondedAt: '2026-08-04T12:17:01.792Z',
      respondedBy: 'elastic',
    });
  });

  it('returns undefined for a gate that is still waiting, because that is a queue row and not history', () => {
    expect(
      extractGateAnswer(
        stepExecution({ finishedAt: undefined, status: ExecutionStatus.WAITING_FOR_INPUT })
      )
    ).toBeUndefined();
  });

  it('omits an unrecognized decision rather than defaulting it to an approval', () => {
    const answer = extractGateAnswer(
      stepExecution({
        hitl: { respondedAt: '2026-08-04T12:17:01.792Z', respondedBy: 'elastic' },
        output: { response: { decision: 'Dismiss', rationale: 'not real' } },
      })
    );

    expect(answer).not.toHaveProperty('decision');
    expect(answer?.rationale).toBe('not real');
  });

  it('omits the responder when the engine could not resolve one, so an auto-accept cannot read as a person', () => {
    const answer = extractGateAnswer(
      stepExecution({
        finishedAt: '2026-08-04T12:05:00.000Z',
        output: { respondedBy: 'unknown', response: { decision: 'approve' } },
      })
    );

    expect(answer).toEqual({
      decision: 'approve',
      respondedAt: '2026-08-04T12:05:00.000Z',
    });
  });

  it("falls back to the step's own output responder when the HITL envelope was never stamped", () => {
    expect(
      extractGateAnswer(
        stepExecution({
          finishedAt: '2026-08-04T12:05:00.000Z',
          output: { respondedBy: 'external-resume', response: { decision: 'dismiss' } },
        })
      )?.respondedBy
    ).toBe('external-resume');
  });

  it('ignores a non-object output rather than throwing on it', () => {
    expect(
      extractGateAnswer(
        stepExecution({ finishedAt: '2026-08-04T12:05:00.000Z', output: 'a string output' })
      )
    ).toEqual({ respondedAt: '2026-08-04T12:05:00.000Z' });
  });
});
