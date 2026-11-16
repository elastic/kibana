/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeUntilValid } from '@kbn/inference-prompt-utils';
import { AD_AXES_ANSWER_KEY, AD_AXES_MAX_SUBMISSION_CHARS } from './ad_axes_rubric_prompt';
import {
  AD_AXES_RUBRIC_EVALUATOR_NAME,
  createAdAxesRubricEvaluator,
  toSubmission,
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
    expect(AD_AXES_ANSWER_KEY.match(/^\| [1-8] \|/gm)).toHaveLength(8);
  });

  it.each([
    ['an out-of-range axis', { ...goodArgs, coverage: 11 }],
    ['an out-of-range overall', { ...goodArgs, overall: 0 }],
    ['a missing axis', { ...goodArgs, correlation: undefined }],
    ['a below-range axis', { ...goodArgs, actionability: 0.4 }],
    ['non-object arguments', 'garbage'],
  ])('returns unavailable for %s', async (_name, args) => {
    executeUntilValidMock.mockResolvedValue(verdict(args));
    expect(await run({ insights: [] })).toMatchObject({ score: null, label: 'unavailable' });
  });

  it('rounds non-integer scores before the range check', async () => {
    executeUntilValidMock.mockResolvedValue(verdict({ ...goodArgs, accuracy: 6.5, overall: 7.6 }));
    expect(await run({ insights: [{}] })).toMatchObject({
      score: 0.8,
      label: '8',
      metadata: { accuracy: 7, overall: 8 },
    });
  });

  it('returns unavailable when the judge makes no tool call', async () => {
    executeUntilValidMock.mockResolvedValue({ toolCalls: [] } as never);
    expect(await run({ insights: [{}] })).toMatchObject({ score: null, label: 'unavailable' });
  });

  it('still calls the judge for an empty insights array', async () => {
    executeUntilValidMock.mockResolvedValue(verdict({ ...goodArgs, overall: 1, coverage: 1 }));
    expect(await run({ insights: [] })).toMatchObject({ score: 0.1, label: '1' });
    expect(executeUntilValidMock).toHaveBeenCalledTimes(1);
  });

  it('returns unavailable without calling the judge when even one discovery exceeds the size cap', async () => {
    const result = await run({ insights: [{ body: 'x'.repeat(AD_AXES_MAX_SUBMISSION_CHARS) }] });
    expect(result).toMatchObject({ score: null, label: 'unavailable' });
    expect(result.explanation).toContain('Even one discovery exceeds');
    expect(executeUntilValidMock).not.toHaveBeenCalled();
  });

  it('makes the grade callback throw on an invalid verdict so the judge is asked to retry', async () => {
    executeUntilValidMock.mockResolvedValue(verdict(goodArgs));
    await run({ insights: [{}] });
    const { toolCallbacks } = executeUntilValidMock.mock.calls[0][0] as unknown as {
      toolCallbacks: { grade: (call: unknown) => Promise<{ response: unknown }> };
    };
    const grade = (args: unknown) =>
      toolCallbacks.grade({ function: { name: 'grade', arguments: args } });
    await expect(grade(goodArgs)).resolves.toEqual({ response: goodArgs });
    await expect(grade({ ...goodArgs, coverage: 11 })).rejects.toThrow();
    await expect(grade({ ...goodArgs, overall: undefined })).rejects.toThrow();
    await expect(grade('garbage')).rejects.toThrow();
  });

  it('forwards getModel', () => {
    const getModel = jest.fn();
    expect(
      createAdAxesRubricEvaluator({ inferenceClient: {} as BoundInferenceClient, getModel })
        .getModel
    ).toBe(getModel);
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

describe('toSubmission', () => {
  it('keeps every insight and adds no note when under the cap', () => {
    const { submission, truncationNote } = toSubmission([{ title: 'a' }, { title: 'b' }]);
    expect(JSON.parse(submission).attackDiscoveries).toHaveLength(2);
    expect(truncationNote).toBe('');
  });

  it('drops whole trailing insights over the cap, stays valid JSON and says so', () => {
    const big = 'x'.repeat(AD_AXES_MAX_SUBMISSION_CHARS / 3);
    const insights = [{ body: big }, { body: big }, { body: big }, { body: big }];
    const { submission, truncationNote } = toSubmission(insights);
    const kept = JSON.parse(submission).attackDiscoveries;
    expect(submission.length).toBeLessThanOrEqual(AD_AXES_MAX_SUBMISSION_CHARS);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(insights.length);
    expect(truncationNote).toContain(`${insights.length - kept.length} of ${insights.length}`);
  });

  it('matches a brute-force drop-until-it-fits cut, including nested and odd values', () => {
    const big = 'y'.repeat(AD_AXES_MAX_SUBMISSION_CHARS / 4);
    const insights = [
      { body: big, nested: { a: [1, 2, { b: 'line\nbreak' }] } },
      { body: big },
      undefined,
      { body: big, list: ['é', '"quoted"'] },
      { body: big },
      { body: big },
    ];
    let expected = insights;
    const serialize = (items: unknown[]) => JSON.stringify({ attackDiscoveries: items }, null, 2);
    while (serialize(expected).length > AD_AXES_MAX_SUBMISSION_CHARS && expected.length > 0) {
      expected = expected.slice(0, -1);
    }
    const { submission, keptCount } = toSubmission(insights);
    expect(keptCount).toBe(expected.length);
    expect(submission).toBe(serialize(expected));
  });
});
