/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { aesopCollectFailuresStepDefinition } from './aesop_collect_failures_step';
import { groupFailures, mentionsReference, toText, truncate } from './collect_failures';

type Context = Parameters<typeof aesopCollectFailuresStepDefinition.handler>[0];
interface ApiCall {
  method?: string;
  path: string;
  headers?: Record<string, string>;
}

const score = (
  exampleId: string,
  value: number,
  {
    repetition = 0,
    name = 'correctness.factuality',
    explanation = `why ${exampleId}/${repetition}`,
  }: { repetition?: number; name?: string; explanation?: string } = {}
) => ({
  example: { id: exampleId, index: Number(exampleId.replace(/\D/g, '')), dataset: { id: 'ds-1' } },
  task: { repetition_index: repetition },
  evaluator: { name, score: value, explanation },
  experiment_id: 'exp-1',
});

const createContext = (
  scores: unknown[],
  details: (path: string) => unknown = (path) => ({
    body: {
      example: { input: { message: `Q ${path.split('/')[8]}` } },
      task: { output: { message: `A ${path.split('/')[8]}` } },
    },
  }),
  input: Record<string, unknown> = {}
) => {
  const callKibanaApi = jest.fn<Promise<unknown>, [ApiCall]>(async ({ path }) => {
    if (path.endsWith('/scores')) return { body: { scores, total: scores.length } };
    return details(path);
  });
  const context = {
    input: { experiment_id: 'exp-1', ...input },
    contextManager: { callKibanaApi },
  } as unknown as Context;
  return { context, callKibanaApi };
};

describe('groupFailures', () => {
  const scores = [
    score('ex1', 1, { repetition: 0 }),
    score('ex1', 0.5, { repetition: 1 }),
    score('ex2', 0.2, { repetition: 0 }),
    score('ex2', 0.4, { repetition: 1 }),
    score('ex3', 0.0),
    score('ex3', 0.9, { name: 'other.evaluator' }),
    score('ex4', 0.9),
  ];

  it('averages each example over its repetitions and keeps those below the threshold, lowest first', () => {
    const groups = groupFailures({
      scores,
      evaluator: 'correctness.factuality',
      threshold: 0.8,
      maxFailures: 10,
    });
    expect(groups.scored_examples).toBe(4);
    expect(groups.failed_examples).toBe(3);
    expect(groups.mean_score).toBeCloseTo((0.75 + 0.3 + 0 + 0.9) / 4);
    expect(groups.failures.map((f) => [f.example_id, f.score])).toEqual([
      ['ex3', 0],
      ['ex2', 0.30000000000000004],
      ['ex1', 0.75],
    ]);
  });

  it('returns the worst repetition of each failed example', () => {
    const groups = groupFailures({
      scores,
      evaluator: 'correctness.factuality',
      threshold: 0.8,
      maxFailures: 10,
    });
    const byId = Object.fromEntries(groups.failures.map((f) => [f.example_id, f]));
    expect(byId.ex1.repetition_index).toBe(1);
    expect(byId.ex1.explanation).toBe('why ex1/1');
    expect(byId.ex2.repetition_index).toBe(0);
  });

  it('caps the failures but still counts every failed example', () => {
    const groups = groupFailures({
      scores,
      evaluator: 'correctness.factuality',
      threshold: 0.8,
      maxFailures: 1,
    });
    expect(groups.failed_examples).toBe(3);
    expect(groups.failures.map((f) => f.example_id)).toEqual(['ex3']);
  });

  it('ignores other evaluators, missing scores and documents without an example or dataset', () => {
    const groups = groupFailures({
      scores: [
        score('ex1', 0.1, { name: 'other.evaluator' }),
        { ...score('ex2', 0.1), evaluator: { name: 'correctness.factuality', score: null } },
        { ...score('ex3', 0.1), example: { id: 'ex3' } },
      ],
      evaluator: 'correctness.factuality',
      threshold: 0.8,
      maxFailures: 10,
    });
    expect(groups).toEqual({
      scored_examples: 0,
      failed_examples: 0,
      mean_score: null,
      failures: [],
    });
  });
});

describe('helpers', () => {
  it('flags explanations that mention a reference answer', () => {
    expect(mentionsReference('The expected answer names T1059')).toBe(true);
    expect(mentionsReference('Matches the reference on two points')).toBe(true);
    expect(mentionsReference('The answer omits the parent process')).toBe(false);
  });

  it('reads the message field and falls back to JSON', () => {
    expect(toText({ message: 'hello' })).toBe('hello');
    expect(toText({ text: 'x' })).toBe('{"text":"x"}');
    expect(toText(null)).toBe('');
  });

  it('cuts text past the limit and marks it', () => {
    expect(truncate('abcdef', 3)).toBe('abc… [cut]');
    expect(truncate('abc', 3)).toBe('abc');
  });
});

describe('aesopCollectFailuresStepDefinition', () => {
  it('reads the scores, then only the input and output of each failed repetition', async () => {
    const { context, callKibanaApi } = createContext([
      score('ex1', 0.2, { explanation: 'The expected answer says T1059' }),
      score('ex2', 1),
    ]);

    const result = await aesopCollectFailuresStepDefinition.handler(context);

    expect(callKibanaApi.mock.calls.map(([call]) => call.path)).toEqual([
      '/internal/evals/experiments/exp-1/scores',
      '/internal/evals/experiments/exp-1/datasets/ds-1/examples/ex1/repetitions/0',
    ]);
    for (const [call] of callKibanaApi.mock.calls) {
      expect(call.method).toBe('GET');
      expect(call.headers).toEqual({ 'elastic-api-version': '1' });
      expect(call.path).not.toMatch(/\/datasets\/ds-1$|\/datasets\/ds-1\/examples$/);
    }
    expect(result.output).toEqual({
      scored_examples: 2,
      failed_examples: 1,
      mean_score: 0.6,
      failures: [
        {
          example_id: 'ex1',
          example_index: 1,
          repetition_index: 0,
          score: 0.2,
          question: 'Q ex1',
          answer: 'A ex1',
          explanation: 'The expected answer says T1059',
          mentions_reference: true,
        },
      ],
      mentions_reference_count: 1,
      markdown: expect.stringContaining('**Agent answer**\n\nA ex1'),
    });
  });

  it('applies the threshold, the cap and the character limit from the input', async () => {
    const long = 'x'.repeat(500);
    const { context } = createContext(
      [score('ex1', 0.1, { explanation: long }), score('ex2', 0.3), score('ex3', 0.6)],
      () => ({ body: { example: { input: { message: long } }, task: { output: long } } }),
      { threshold: 0.5, max_failures: 1, max_chars: 100 }
    );

    const result = await aesopCollectFailuresStepDefinition.handler(context);

    expect(result.output?.failed_examples).toBe(2);
    expect(result.output?.failures).toHaveLength(1);
    const [failure] = result.output?.failures ?? [];
    expect(failure.question).toBe(`${'x'.repeat(100)}… [cut]`);
    expect(failure.answer).toBe(`${'x'.repeat(100)}… [cut]`);
    expect(failure.explanation).toBe(`${'x'.repeat(100)}… [cut]`);
  });

  it('keeps a failure whose repetition details are gone, with empty text', async () => {
    const { context } = createContext([score('ex1', 0.1)], () => {
      throw new KibanaApiCallError({ status: 404, headers: {}, body: {}, message: 'not found' });
    });

    const result = await aesopCollectFailuresStepDefinition.handler(context);

    expect(result.output?.failures[0]).toMatchObject({ question: '', answer: '' });
    expect(result.output?.markdown).toContain('(missing)');
  });

  it('returns empty failures and markdown when nothing failed', async () => {
    const { context } = createContext([score('ex1', 1)]);

    const result = await aesopCollectFailuresStepDefinition.handler(context);

    expect(result.output).toMatchObject({
      failed_examples: 0,
      failures: [],
      markdown: '',
      mentions_reference_count: 0,
    });
  });

  it('returns an error when the scores route fails', async () => {
    const { context, callKibanaApi } = createContext([]);
    callKibanaApi.mockRejectedValueOnce(
      new KibanaApiCallError({ status: 500, headers: {}, body: {}, message: 'boom' })
    );

    const result = await aesopCollectFailuresStepDefinition.handler(context);

    expect(result.error?.message).toBe('boom');
  });

  it('rejects input without an experiment id', async () => {
    const { context } = createContext([], undefined, { experiment_id: '' });

    const result = await aesopCollectFailuresStepDefinition.handler(context);

    expect(result.error?.message).toMatch(/^Invalid input/);
  });
});
