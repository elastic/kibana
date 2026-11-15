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
  createPersonaRubricEvaluator,
  isPersonaRubricJudgeEnabled,
  PERSONA_RUBRIC_EVALUATOR_NAME,
  PERSONA_RUBRIC_JUDGE_ENV,
  runPersonaRubricJudge,
} from './persona_rubric_evaluator';
import {
  buildPersonaRubricInput,
  formatPersonaToolsRow,
  PERSONA_RUBRIC_GROUND_TRUTH,
  PERSONA_RUBRIC_TOOLS_BY_CATEGORY,
} from './persona_rubric_prompt';
import { buildOutput, toolCall } from '../__fixtures__/task_output_builders';
import { PERSONA_MATRIX_EXAMPLES } from '../datasets/persona_matrix_prompts';

jest.mock('@kbn/inference-prompt-utils', () => ({
  ...jest.requireActual('@kbn/inference-prompt-utils'),
  executeUntilValid: jest.fn(),
}));

const executeUntilValidMock = executeUntilValid as jest.MockedFunction<typeof executeUntilValid>;
const inferenceClient = {} as BoundInferenceClient;

const verdict = (args: unknown) =>
  ({ toolCalls: [{ function: { name: 'grade', arguments: args } }] } as never);

const withTools = buildOutput({ steps: [toolCall('security.alerts')], answer: 'Found it.' });
const withoutTools = buildOutput({ steps: [], answer: 'From memory.' });

describe('PersonaRubric prompt assembly', () => {
  it.each(Object.keys(PERSONA_RUBRIC_TOOLS_BY_CATEGORY))(
    'uses the %s tools row and the shared ground truth',
    (category) => {
      const { tools, redFlags } = PERSONA_RUBRIC_TOOLS_BY_CATEGORY[category];
      const input = buildPersonaRubricInput({ category, answer: 'a', toolCalls: [] });
      expect(input.category).toBe(category);
      expect(input.toolsRow).toContain(tools);
      expect(input.toolsRow).toContain(redFlags);
    }
  );

  it('keeps rows distinct across categories', () => {
    const rows = Object.keys(PERSONA_RUBRIC_TOOLS_BY_CATEGORY).map(formatPersonaToolsRow);
    expect(new Set(rows).size).toBe(rows.length);
  });

  it('has a tools row for every category used by the dataset', () => {
    const known = Object.keys(PERSONA_RUBRIC_TOOLS_BY_CATEGORY);
    for (const example of PERSONA_MATRIX_EXAMPLES) {
      expect(known).toContain(example.category);
    }
  });

  it('has no row for a missing or unknown category', () => {
    expect(formatPersonaToolsRow(undefined)).toBeUndefined();
    expect(formatPersonaToolsRow('not-a-category')).toBeUndefined();
    expect(() =>
      buildPersonaRubricInput({ category: 'not-a-category', answer: '', toolCalls: [] })
    ).toThrow();
  });

  it('passes per-example expected tools, the question and the attachment to the judge input', () => {
    const input = buildPersonaRubricInput({
      category: 'alert-analysis',
      expectedTools: ['tool.one', 'tool.two'],
      question: 'What happened on host-1?',
      attachment: 'attached alert body',
      answer: 'a',
      toolCalls: [],
    });
    expect(input.expectedTools).toContain('tool.one');
    expect(input.expectedTools).toContain('tool.two');
    expect(input.question).toContain('What happened on host-1?');
    expect(input.attachment).toContain('attached alert body');
  });

  it('keeps a long tool result intact instead of truncating it', () => {
    const results = `${'x'.repeat(9000)}END_MARKER`;
    const { submission } = buildPersonaRubricInput({
      category: 'alert-analysis',
      answer: 'a',
      toolCalls: [{ tool_id: 'big.tool', params: {}, results }],
    });
    expect(submission).toContain(results);
  });

  it('lists ordered tool calls with params and results ahead of the answer', () => {
    const { submission } = buildPersonaRubricInput({
      category: 'alert-analysis',
      answer: 'final text',
      toolCalls: [
        { tool_id: 'first.tool', params: { a: 1 }, results: '{"hit":true}' },
        { tool_id: 'second.tool', params: {} },
      ],
    });
    expect(submission.indexOf('1. first.tool')).toBeLessThan(submission.indexOf('2. second.tool'));
    expect(submission).toContain('params: {"a":1}');
    expect(submission).toContain('result: {"hit":true}');
    expect(submission.indexOf('2. second.tool')).toBeLessThan(submission.indexOf('final text'));
  });

  it('marks an empty trace explicitly and ships a non-empty ground truth', () => {
    const { submission } = buildPersonaRubricInput({
      category: 'alert-analysis',
      answer: 'x',
      toolCalls: [],
    });
    expect(submission).toContain('(no tool calls)');
    expect(PERSONA_RUBRIC_GROUND_TRUTH.length).toBeGreaterThan(0);
  });
});

describe('runPersonaRubricJudge', () => {
  beforeEach(() => executeUntilValidMock.mockReset());

  const run = (judgeOutput: unknown, category: string | undefined = 'alert-analysis') =>
    runPersonaRubricJudge({ inferenceClient, category, judgeOutput });

  it('scores score/10 and records raw and capped values when tools were called', async () => {
    executeUntilValidMock.mockResolvedValue(verdict({ score: 9, explanation: 'solid' }));
    const result = await run(withTools);
    expect(result).toMatchObject({
      score: 0.9,
      label: '9',
      explanation: 'solid',
      metadata: { raw_score: 9, capped_score: 9, capped: false, category: 'alert-analysis' },
    });
  });

  it('caps at 6 when no tool was called, keeping the raw score in metadata', async () => {
    executeUntilValidMock.mockResolvedValue(verdict({ score: 9, explanation: 'fluent' }));
    const result = await run(withoutTools);
    expect(result).toMatchObject({
      score: 0.6,
      label: '6',
      metadata: { raw_score: 9, capped_score: 6, capped: true },
    });
  });

  it('does not lift a low score when capped', async () => {
    executeUntilValidMock.mockResolvedValue(verdict({ score: 3, explanation: 'poor' }));
    expect(await run(withoutTools)).toMatchObject({ score: 0.3 });
  });

  it('passes the assembled input to the judge', async () => {
    executeUntilValidMock.mockResolvedValue(verdict({ score: 5, explanation: '' }));
    await run(withTools, 'alert-analysis');
    const call = executeUntilValidMock.mock.calls[0][0] as { input: { category: string } };
    expect(call.input.category).toBe('alert-analysis');
  });

  it('rounds a non-integer score to the nearest integer', async () => {
    executeUntilValidMock.mockResolvedValue(verdict({ score: 7.5, explanation: 'x' }));
    expect(await run(withTools)).toMatchObject({ score: 0.8, label: '8' });
  });

  it.each([
    ['a score above range', { score: 11, explanation: 'x' }],
    ['a score below range', { score: 0, explanation: 'x' }],
    ['a string score', { score: '8', explanation: 'x' }],
    ['non-object arguments', 'garbage'],
    ['missing arguments', undefined],
  ])('returns unavailable for %s', async (_name, args) => {
    executeUntilValidMock.mockResolvedValue(verdict(args));
    expect(await run(withTools)).toMatchObject({ score: null, label: 'unavailable' });
  });

  it.each([
    ['unknown', 'not-a-category'],
    ['missing', undefined],
  ])('returns unavailable and warns for a %s category without calling the judge', async (_n, c) => {
    const log = { warning: jest.fn() } as unknown as ToolingLog;
    const result = await runPersonaRubricJudge({
      inferenceClient,
      category: c,
      judgeOutput: withTools,
      log,
    });
    expect(result).toMatchObject({ score: null, label: 'unavailable' });
    expect(result.explanation).toContain('no persona rubric tools row');
    expect(log.warning).toHaveBeenCalledTimes(1);
    expect(executeUntilValidMock).not.toHaveBeenCalled();
  });

  it('forwards expected tools, question and attachment to the judge', async () => {
    executeUntilValidMock.mockResolvedValue(verdict({ score: 5, explanation: '' }));
    await runPersonaRubricJudge({
      inferenceClient,
      category: 'alert-analysis',
      expectedTools: ['tool.one'],
      question: 'Why?',
      attachment: 'body',
      judgeOutput: withTools,
    });
    const call = executeUntilValidMock.mock.calls[0][0] as {
      input: { expectedTools: string; question: string; attachment: string };
    };
    expect(call.input.expectedTools).toContain('tool.one');
    expect(call.input.question).toContain('Why?');
    expect(call.input.attachment).toContain('body');
  });

  it('returns unavailable when the judge returns no tool call', async () => {
    executeUntilValidMock.mockResolvedValue({ toolCalls: [] } as never);
    expect(await run(withTools)).toMatchObject({ score: null, label: 'unavailable' });
  });

  it('returns unavailable instead of throwing when the judge call fails', async () => {
    executeUntilValidMock.mockRejectedValue(new Error('connector down'));
    const result = await run(withTools);
    expect(result).toMatchObject({ score: null, label: 'unavailable' });
    expect(result.explanation).toContain('connector down');
  });
});

describe('createPersonaRubricEvaluator', () => {
  const evaluate = (output: unknown) =>
    createPersonaRubricEvaluator().evaluate({
      input: {},
      expected: {},
      output,
      metadata: {},
    } as never);

  it('reads back the precomputed result', async () => {
    const personaRubricAnalysis = { score: 0.8, label: '8' };
    expect(await evaluate({ personaRubricAnalysis })).toEqual(personaRubricAnalysis);
  });

  it('forwards getModel', () => {
    const getModel = jest.fn();
    expect(createPersonaRubricEvaluator({ getModel }).getModel).toBe(getModel);
  });

  it('is unavailable when the task produced no result', async () => {
    expect(createPersonaRubricEvaluator().name).toBe(PERSONA_RUBRIC_EVALUATOR_NAME);
    expect(await evaluate({})).toMatchObject({ score: null, label: 'unavailable' });
    expect(await evaluate(undefined)).toMatchObject({ score: null, label: 'unavailable' });
  });
});

describe('isPersonaRubricJudgeEnabled', () => {
  it('is off by default and only on for 1', () => {
    expect(isPersonaRubricJudgeEnabled({})).toBe(false);
    expect(isPersonaRubricJudgeEnabled({ [PERSONA_RUBRIC_JUDGE_ENV]: '0' })).toBe(false);
    expect(isPersonaRubricJudgeEnabled({ [PERSONA_RUBRIC_JUDGE_ENV]: 'true' })).toBe(false);
    expect(isPersonaRubricJudgeEnabled({ [PERSONA_RUBRIC_JUDGE_ENV]: '1' })).toBe(true);
  });
});
