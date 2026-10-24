/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { executeUntilValid } from '@kbn/inference-prompt-utils';
import {
  createAttackDiscoveryRubricEvaluator,
  UNSCORED_LABEL,
} from './attack_discovery_rubric_evaluator';
import type { AttackDiscoveryTaskOutput } from '../types';

jest.mock('@kbn/inference-prompt-utils', () => ({
  executeUntilValid: jest.fn(),
}));

const executeUntilValidMock = executeUntilValid as jest.MockedFunction<typeof executeUntilValid>;

const log = { warning: jest.fn(), debug: jest.fn(), info: jest.fn() } as unknown as ToolingLog;
const inferenceClient = {} as BoundInferenceClient;

const gradeResponse = (args?: { verdict: 'Y' | 'N'; explanation: string }) =>
  ({
    content: '',
    toolCalls: args ? [{ toolCallId: 'call-1', function: { name: 'grade', arguments: args } }] : [],
    input: [],
  } as unknown as Awaited<ReturnType<typeof executeUntilValid>>);

// Shape of the error the eval HTTP client raises when Kibana caps the inference stream.
const streamCapError = () =>
  Object.assign(
    new Error(
      '[POST http://localhost:5620/internal/inference/prompt] 408 Request Timeout -- Inference stream exceeded the maximum allowed duration of 300000ms'
    ),
    { status: 408 }
  );

const evaluate = (maxJudgeRetries?: number) =>
  createAttackDiscoveryRubricEvaluator({ inferenceClient, log, maxJudgeRetries }).evaluate({
    input: { mode: 'bundledAlerts', anonymizedAlerts: [] },
    output: {
      insights: [{ title: 'Ransomware on host-1' }],
    } as unknown as AttackDiscoveryTaskOutput,
    expected: { attackDiscoveries: [] },
    metadata: {},
  } as unknown as Parameters<ReturnType<typeof createAttackDiscoveryRubricEvaluator>['evaluate']>[0]);

describe('createAttackDiscoveryRubricEvaluator judge failures', () => {
  beforeEach(() => {
    executeUntilValidMock.mockReset();
  });

  it('scores on the first grade call', async () => {
    executeUntilValidMock.mockResolvedValueOnce(gradeResponse({ verdict: 'Y', explanation: 'ok' }));

    await expect(evaluate()).resolves.toEqual({ score: 1, label: 'Y', explanation: 'ok' });
    expect(executeUntilValidMock).toHaveBeenCalledTimes(1);
  });

  it('retries a missing grade tool call and scores the retry', async () => {
    executeUntilValidMock
      .mockResolvedValueOnce(gradeResponse())
      .mockResolvedValueOnce(gradeResponse({ verdict: 'N', explanation: 'missed incident' }));

    await expect(evaluate()).resolves.toEqual({
      score: 0,
      label: 'N',
      explanation: 'missed incident',
      metadata: { judgeAttempts: 2 },
    });
    expect(executeUntilValidMock).toHaveBeenCalledTimes(2);
  });

  it('retries a judge-side 408 stream cap and scores the retry', async () => {
    executeUntilValidMock
      .mockRejectedValueOnce(streamCapError())
      .mockResolvedValueOnce(gradeResponse({ verdict: 'Y', explanation: 'ok' }));

    await expect(evaluate()).resolves.toMatchObject({ score: 1, label: 'Y' });
    expect(executeUntilValidMock).toHaveBeenCalledTimes(2);
  });

  it('recognizes the stream cap from the message when the status sits on the cause', async () => {
    executeUntilValidMock
      .mockRejectedValueOnce(new Error('fetch failed', { cause: streamCapError() }))
      .mockResolvedValueOnce(gradeResponse({ verdict: 'Y', explanation: 'ok' }));

    await expect(evaluate()).resolves.toMatchObject({ score: 1 });
  });

  it('reports the cell as unscored (null, not 0) after at most 2 retries, without throwing', async () => {
    executeUntilValidMock
      .mockRejectedValueOnce(streamCapError())
      .mockResolvedValueOnce(gradeResponse())
      .mockRejectedValueOnce(streamCapError());

    const result = await evaluate();

    expect(executeUntilValidMock).toHaveBeenCalledTimes(3);
    expect(result.score).toBeNull();
    expect(result.label).toBe(UNSCORED_LABEL);
    expect(result.metadata).toEqual({
      judgeAttempts: 3,
      judgeFailures: [
        expect.stringContaining('HTTP 408'),
        'Missing grade tool call',
        expect.stringContaining('HTTP 408'),
      ],
    });
  });

  it('does not retry a non-transient judge error', async () => {
    executeUntilValidMock.mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), { status: 400 })
    );

    await expect(evaluate()).rejects.toThrow('Bad Request');
    expect(executeUntilValidMock).toHaveBeenCalledTimes(1);
  });

  it('never calls the judge when the candidate task failed (a candidate 408 stays a failure)', async () => {
    const result = await createAttackDiscoveryRubricEvaluator({ inferenceClient, log }).evaluate({
      input: { mode: 'bundledAlerts', anonymizedAlerts: [] },
      output: {
        insights: null,
        errors: ['408 Request Timeout -- Inference stream exceeded the maximum allowed duration'],
      } as unknown as AttackDiscoveryTaskOutput,
      expected: { attackDiscoveries: [] },
      metadata: {},
    } as unknown as Parameters<ReturnType<typeof createAttackDiscoveryRubricEvaluator>['evaluate']>[0]);

    expect(result).toMatchObject({ score: 0, label: 'task_error' });
    expect(executeUntilValidMock).not.toHaveBeenCalled();
  });
});
