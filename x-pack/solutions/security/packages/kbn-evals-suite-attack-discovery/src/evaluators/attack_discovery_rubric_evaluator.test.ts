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
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';

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

const discovery = {
  title: 'macOS stealer: fake installer, osascript password phishing, keychain theft',
  summaryMarkdown:
    'Trojanized macOS Setup.app launched a fake password dialog and read login.keychain-db.',
  detailsMarkdown:
    '- **Host**: macOS host\n- **Chain**: fake installer → osascript dialog → keychain access',
  entitySummaryMarkdown: '{{ host.name mac-1 }}',
  alertIds: ['alert-1'],
  mitreAttackTactics: ['credential-access'],
};

const evaluateWith = (expected: AttackDiscoveryDatasetExample['output']) =>
  createAttackDiscoveryRubricEvaluator({ inferenceClient, log }).evaluate({
    input: { mode: 'bundledAlerts', anonymizedAlerts: [] },
    output: {
      insights: [{ title: 'macOS credential theft', alertIds: ['alert-1'] }],
    } as unknown as AttackDiscoveryTaskOutput,
    expected,
    metadata: {},
  } as unknown as Parameters<ReturnType<typeof createAttackDiscoveryRubricEvaluator>['evaluate']>[0]);

const referenceHandedToJudge = () =>
  (executeUntilValidMock.mock.calls[0][0] as unknown as { input: { reference: string } }).input
    .reference;

describe('createAttackDiscoveryRubricEvaluator reference handling', () => {
  beforeEach(() => {
    executeUntilValidMock.mockReset();
  });

  it('reports the cell as unmeasured (null, N/A) when the example has no expected discoveries', async () => {
    // Pre-fix this mock is consumed: the evaluator built `{ attackDiscoveries: [] }` and graded
    // the submission against a fabricated empty reference, which is the reported inversion
    // (on-topic discoveries 0, an all-empty insight stub 1).
    executeUntilValidMock.mockResolvedValue(
      gradeResponse({ verdict: 'N', explanation: 'the expected response is empty' })
    );

    const result = await evaluateWith({} as AttackDiscoveryDatasetExample['output']);

    expect(result).toEqual({
      score: null,
      label: 'N/A',
      explanation: expect.stringContaining('rubric is not applicable'),
    });
    expect(executeUntilValidMock).not.toHaveBeenCalled();
  });

  it('still grades a stored-empty reference: a submission against "no discoveries expected" scores 0', async () => {
    executeUntilValidMock.mockResolvedValueOnce(
      gradeResponse({ verdict: 'N', explanation: 'no discoveries were expected' })
    );

    await expect(evaluateWith({ attackDiscoveries: [] })).resolves.toMatchObject({
      score: 0,
      label: 'N',
    });
    expect(executeUntilValidMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(referenceHandedToJudge())).toEqual({ attackDiscoveries: [] });
  });

  it('hands the judge the example’s real discoveries instead of an empty array', async () => {
    executeUntilValidMock.mockResolvedValueOnce(gradeResponse({ verdict: 'Y', explanation: 'ok' }));

    await expect(
      evaluateWith({ attackDiscoveries: [discovery] } as AttackDiscoveryDatasetExample['output'])
    ).resolves.toMatchObject({ score: 1, label: 'Y' });

    const reference = JSON.parse(referenceHandedToJudge());
    expect(reference.attackDiscoveries).toHaveLength(1);
    expect(reference.attackDiscoveries[0].title).toBe(discovery.title);
  });
});
