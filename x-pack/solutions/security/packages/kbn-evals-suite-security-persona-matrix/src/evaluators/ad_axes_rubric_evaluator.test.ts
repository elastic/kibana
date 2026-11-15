/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeUntilValid } from '@kbn/inference-prompt-utils';
import { AD_AXES_ANSWER_KEY } from './ad_axes_rubric_prompt';
import {
  AD_AXES_RUBRIC_EVALUATOR_NAME,
  createAdAxesRubricEvaluator,
} from './ad_axes_rubric_evaluator';

jest.mock('@kbn/inference-prompt-utils', () => ({
  ...jest.requireActual('@kbn/inference-prompt-utils'),
  executeUntilValid: jest.fn(),
}));

const executeUntilValidMock = executeUntilValid as jest.MockedFunction<typeof executeUntilValid>;
const verdict = (args: unknown) =>
  ({ toolCalls: [{ function: { name: 'grade', arguments: args } }] } as never);

const goodArgs = {
  coverage: 8,
  accuracy: 7,
  correlation: 9,
  actionability: 6,
  overall: 8,
  explanation: 'clean',
};

const run = (output: unknown) =>
  createAdAxesRubricEvaluator({ inferenceClient: {} as BoundInferenceClient }).evaluate({
    input: {},
    expected: {},
    output,
    metadata: {},
  } as never);

describe('AdAxesRubric', () => {
  beforeEach(() => executeUntilValidMock.mockReset());

  it('uses Overall/10 as the score and keeps every axis in metadata', async () => {
    executeUntilValidMock.mockResolvedValue(verdict(goodArgs));
    const result = await run({ insights: [{ title: 'Emotet on SRVWIN03' }] });
    expect(result).toMatchObject({
      score: 0.8,
      label: '8',
      metadata: { coverage: 8, accuracy: 7, correlation: 9, actionability: 6, overall: 8 },
    });
    expect(createAdAxesRubricEvaluator({ inferenceClient: {} as never }).name).toBe(
      AD_AXES_RUBRIC_EVALUATOR_NAME
    );
  });

  it('sends the insights and the 8-intrusion key to the judge', async () => {
    executeUntilValidMock.mockResolvedValue(verdict(goodArgs));
    await run({ insights: [{ title: 'Emotet on SRVWIN03' }] });
    const { input } = executeUntilValidMock.mock.calls[0][0] as { input: { submission: string } };
    expect(input.submission).toContain('Emotet on SRVWIN03');
    expect(AD_AXES_ANSWER_KEY.split('\n')).toHaveLength(8);
  });

  it.each([
    ['a non-integer axis', { ...goodArgs, accuracy: 6.5 }],
    ['an out-of-range axis', { ...goodArgs, coverage: 11 }],
    ['an out-of-range overall', { ...goodArgs, overall: 0 }],
    ['a missing axis', { ...goodArgs, correlation: undefined }],
    ['non-object arguments', 'garbage'],
  ])('returns unavailable for %s', async (_name, args) => {
    executeUntilValidMock.mockResolvedValue(verdict(args));
    expect(await run({ insights: [] })).toMatchObject({ score: null, label: 'unavailable' });
  });

  it('returns unavailable when the task produced no insights, without calling the judge', async () => {
    expect(await run({ insights: null })).toMatchObject({ score: null, label: 'unavailable' });
    expect(await run(undefined)).toMatchObject({ score: null, label: 'unavailable' });
    expect(executeUntilValidMock).not.toHaveBeenCalled();
  });

  it('returns unavailable instead of throwing when the judge call fails', async () => {
    executeUntilValidMock.mockRejectedValue(new Error('connector down'));
    const result = await run({ insights: [] });
    expect(result).toMatchObject({ score: null, label: 'unavailable' });
    expect(result.explanation).toContain('connector down');
  });
});
