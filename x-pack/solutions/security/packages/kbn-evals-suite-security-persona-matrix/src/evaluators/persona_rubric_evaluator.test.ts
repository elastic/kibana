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
  PERSONA_RUBRIC_MAX_SUBMISSION_CHARS,
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

  it('keeps the final answer when a huge trace overflows the submission budget', () => {
    const { submission } = buildPersonaRubricInput({
      category: 'alert-analysis',
      answer: 'the verdict END_ANSWER',
      toolCalls: [{ tool_id: 'big.tool', params: {}, results: 'z'.repeat(500_000) }],
    });
    expect(submission.length).toBeLessThanOrEqual(PERSONA_RUBRIC_MAX_SUBMISSION_CHARS);
    expect(submission).toContain('1. big.tool');
    expect(submission.endsWith('Final answer:\nthe verdict END_ANSWER')).toBe(true);
  });

  it('caps an oversized answer at half the budget and still leaves room for the trace', () => {
    const { submission } = buildPersonaRubricInput({
      category: 'alert-analysis',
      answer: 'a'.repeat(600_000),
      toolCalls: [{ tool_id: 'big.tool', params: {}, results: 'z'.repeat(500_000) }],
    });
    expect(submission.length).toBeLessThanOrEqual(PERSONA_RUBRIC_MAX_SUBMISSION_CHARS);
    expect(submission).toContain('Final answer:\naaaa');
    expect(submission).toContain('1. big.tool');
  });

  it('keeps every later call when one early result alone overflows the budget', () => {
    const { submission } = buildPersonaRubricInput({
      category: 'alert-analysis',
      answer: 'END_ANSWER',
      toolCalls: [
        { tool_id: 'huge.tool', params: { q: 'first' }, results: 'z'.repeat(1_000_000) },
        { tool_id: 'vt.hash.lookup', params: { hash: 'abc' }, results: 'VERDICT_EICAR' },
        { tool_id: 'on_call_lookup', params: { team: 'soc' } },
      ],
    });
    expect(submission.length).toBeLessThanOrEqual(PERSONA_RUBRIC_MAX_SUBMISSION_CHARS);
    expect(submission).toContain('1. huge.tool\n   params: {"q":"first"}');
    expect(submission).toContain('2. vt.hash.lookup\n   params: {"hash":"abc"}');
    expect(submission).toContain('result: VERDICT_EICAR');
    expect(submission).toContain('3. on_call_lookup\n   params: {"team":"soc"}');
    expect(submission).toContain('…[truncated]');
    expect(submission.endsWith('Final answer:\nEND_ANSWER')).toBe(true);
  });

  it('keeps long params whole when the submission fits and trims results instead', () => {
    const description = `${'d'.repeat(5_000)}END_DESCRIPTION`;
    const params = { description, title: 'Side-loading on srv-win-defend-01', severity: 'high' };
    const { submission } = buildPersonaRubricInput({
      category: 'alert-analysis',
      answer: 'END_ANSWER',
      toolCalls: [
        { tool_id: 'platform.core.cases.manage', params, results: '{"id":"case-1"}' },
        { tool_id: 'big.tool', params: {}, results: 'z'.repeat(1_000_000) },
      ],
    });
    expect(submission.length).toBeLessThanOrEqual(PERSONA_RUBRIC_MAX_SUBMISSION_CHARS);
    expect(submission).toContain(`params: ${JSON.stringify(params)}`);
    expect(submission).toContain('result: {"id":"case-1"}');
    expect(submission).toContain('…[truncated]');
  });

  it('shares the budget across params when params alone overflow it', () => {
    const { submission } = buildPersonaRubricInput({
      category: 'alert-analysis',
      answer: 'END_ANSWER',
      toolCalls: [
        { tool_id: 'huge.params', params: { q: 'p'.repeat(1_000_000) } },
        { tool_id: 'small.params', params: { hash: 'abc' } },
      ],
    });
    expect(submission.length).toBeLessThanOrEqual(PERSONA_RUBRIC_MAX_SUBMISSION_CHARS);
    expect(submission).toContain('2. small.params\n   params: {"hash":"abc"}');
    expect(submission.endsWith('Final answer:\nEND_ANSWER')).toBe(true);
  });

  it('keeps every call head when oversized params leave nothing for results', () => {
    const { submission } = buildPersonaRubricInput({
      category: 'alert-analysis',
      answer: 'END_ANSWER',
      toolCalls: [
        { tool_id: 'first.tool', params: { q: 'p'.repeat(1_000_000) }, results: 'r1' },
        { tool_id: 'second.tool', params: { q: 'q'.repeat(1_000_000) }, results: 'r2' },
        { tool_id: 'third.tool', params: { q: 's'.repeat(1_000_000) }, results: 'r3' },
      ],
    });
    expect(submission.length).toBeLessThanOrEqual(PERSONA_RUBRIC_MAX_SUBMISSION_CHARS);
    expect(submission).toContain('1. first.tool\n   params: ');
    expect(submission).toContain('2. second.tool\n   params: ');
    expect(submission).toContain('3. third.tool\n   params: ');
    expect(submission).toMatch(
      /3\. third\.tool\n {3}params: [^\n]*\n {3}result: (r3|…\[truncated\])\n/
    );
    expect(submission.endsWith('Final answer:\nEND_ANSWER')).toBe(true);
  });

  it('splits the budget fairly between several oversized results', () => {
    const { submission } = buildPersonaRubricInput({
      category: 'alert-analysis',
      answer: 'a',
      toolCalls: [
        { tool_id: 'one', params: {}, results: `${'x'.repeat(300_000)}` },
        { tool_id: 'two', params: {}, results: `${'y'.repeat(300_000)}` },
      ],
    });
    expect(submission.length).toBeLessThanOrEqual(PERSONA_RUBRIC_MAX_SUBMISSION_CHARS);
    const xs = (submission.match(/x/g) ?? []).length;
    const ys = (submission.match(/y/g) ?? []).length;
    expect(xs).toBeGreaterThan(150_000);
    expect(Math.abs(xs - ys)).toBeLessThan(10);
  });

  it('includes delivered workflow YAML ahead of the answer', () => {
    const { submission } = buildPersonaRubricInput({
      category: 'workflow-authoring',
      answer: '<render_attachment id="wf-1" />',
      toolCalls: [
        { tool_id: 'platform.core.generate_workflow', params: {}, results: '{"id":"wf-1"}' },
      ],
      workflowAttachments: [{ id: 'wf-1', version: 2, yaml: 'name: notify\nsteps: []' }],
    });
    expect(submission).toContain('--- attachment wf-1 (version 2) ---\nname: notify\nsteps: []');
    expect(submission.indexOf('name: notify')).toBeLessThan(submission.indexOf('Final answer:'));
  });

  it('omits the workflow section when there are no attachments', () => {
    const { submission } = buildPersonaRubricInput({
      category: 'workflow-authoring',
      answer: 'a',
      toolCalls: [],
      workflowAttachments: [],
    });
    expect(submission).not.toContain('Workflow YAML');
  });

  it('grades the hash against the seeded EICAR intel, not as a malware loader', () => {
    expect(PERSONA_RUBRIC_GROUND_TRUTH).toContain('EICAR');
    expect(PERSONA_RUBRIC_GROUND_TRUTH).toContain('virus.eicar/test');
    expect(PERSONA_RUBRIC_GROUND_TRUTH).not.toMatch(/known-malicious loader/);
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

  it('forwards workflow attachments to the judge submission', async () => {
    executeUntilValidMock.mockResolvedValue(verdict({ score: 5, explanation: '' }));
    await runPersonaRubricJudge({
      inferenceClient,
      category: 'workflow-authoring',
      judgeOutput: withTools,
      workflowAttachments: [{ id: 'wf-9', version: 1, yaml: 'YAML_BODY_MARKER' }],
    });
    const call = executeUntilValidMock.mock.calls[0][0] as { input: { submission: string } };
    expect(call.input.submission).toContain('YAML_BODY_MARKER');
  });

  it('ships a long tool result to the judge untruncated end to end', async () => {
    executeUntilValidMock.mockResolvedValue(verdict({ score: 5, explanation: '' }));
    const results = [{ text: `${'x'.repeat(9000)}END_MARKER` }];
    const output = buildOutput({
      steps: [{ ...toolCall('security.alerts'), results }],
      answer: 'Found it.',
    });
    await run(output);
    const call = executeUntilValidMock.mock.calls[0][0] as { input: { submission: string } };
    expect(call.input.submission).toContain('END_MARKER');
    expect(call.input.submission).toContain(JSON.stringify(results));
  });

  it('makes the grade callback throw on an invalid score so the judge is asked to retry', async () => {
    executeUntilValidMock.mockResolvedValue(verdict({ score: 9 }));
    await run(withTools);
    const { toolCallbacks } = executeUntilValidMock.mock.calls[0][0] as unknown as {
      toolCallbacks: { grade: (call: unknown) => Promise<{ response: unknown }> };
    };
    const grade = (args: unknown) =>
      toolCallbacks.grade({ function: { name: 'grade', arguments: args } });
    await expect(grade({ score: 7, explanation: 'ok' })).resolves.toEqual({
      response: { score: 7, explanation: 'ok' },
    });
    await expect(grade({ score: 11 })).rejects.toThrow();
    await expect(grade({ score: 0 })).rejects.toThrow();
    await expect(grade({ score: 'high' })).rejects.toThrow();
    await expect(grade(undefined)).rejects.toThrow();
  });

  describe('with the real executeUntilValid loop', () => {
    const { executeUntilValid: realExecuteUntilValid } = jest.requireActual(
      '@kbn/inference-prompt-utils'
    );

    const runAgainstFakeJudge = async (judgeArgs: unknown) => {
      const prompt = jest.fn().mockResolvedValue({
        content: '',
        toolCalls: [{ toolCallId: 'c1', function: { name: 'grade', arguments: judgeArgs } }],
      });
      executeUntilValidMock.mockImplementation(realExecuteUntilValid);
      const result = await runPersonaRubricJudge({
        inferenceClient: { prompt } as unknown as BoundInferenceClient,
        category: 'alert-analysis',
        judgeOutput: withTools,
      });
      return { prompt, result };
    };

    it('calls the judge at most twice when the verdict stays invalid', async () => {
      const { prompt, result } = await runAgainstFakeJudge({ score: 11 });
      expect(prompt).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({ score: null, label: 'unavailable' });
      expect(result.explanation).toContain('in 2 attempts');
      expect(result.explanation).toContain('last rejection: score must be an integer between');
      expect(result.explanation).not.toContain('1 attempts');
    });

    it('tells the judge why its verdict was rejected on the retry', async () => {
      const { prompt } = await runAgainstFakeJudge({ score: 11 });
      const { prevMessages } = prompt.mock.calls[1][0];
      const toolMessage = prevMessages.find((m: { role: string }) => m.role === 'tool');
      // The OpenAI adapter sends `JSON.stringify(message.response)`.
      expect(JSON.stringify(toolMessage.response)).toContain('score must be an integer between');
    });

    it('stops after one call when the first verdict is valid', async () => {
      const { prompt, result } = await runAgainstFakeJudge({ score: 8, explanation: 'ok' });
      expect(prompt).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ score: 0.8, metadata: { judge_calls: 1 } });
    });

    it('records both judge calls when the verdict stays invalid', async () => {
      const { result } = await runAgainstFakeJudge({ score: 11 });
      expect(result.metadata).toEqual({ judge_calls: 2 });
    });

    it('records two judge calls when the retry is accepted', async () => {
      const grade = (id: string, args: unknown) => ({
        content: '',
        toolCalls: [{ toolCallId: id, function: { name: 'grade', arguments: args } }],
      });
      const prompt = jest
        .fn()
        .mockResolvedValueOnce(grade('c1', { score: 11 }))
        .mockResolvedValueOnce(grade('c2', { score: 6, explanation: '' }));
      executeUntilValidMock.mockImplementation(realExecuteUntilValid);
      const result = await runPersonaRubricJudge({
        inferenceClient: { prompt } as unknown as BoundInferenceClient,
        category: 'alert-analysis',
        judgeOutput: withTools,
      });
      expect(result).toMatchObject({ score: 0.6, metadata: { judge_calls: 2 } });
    });

    it('records the judge call that answered without a grade', async () => {
      const prompt = jest.fn().mockResolvedValue({ content: 'no verdict', toolCalls: [] });
      executeUntilValidMock.mockImplementation(realExecuteUntilValid);
      const result = await runPersonaRubricJudge({
        inferenceClient: { prompt } as unknown as BoundInferenceClient,
        category: 'alert-analysis',
        judgeOutput: withTools,
      });
      expect(result).toMatchObject({ label: 'unavailable', metadata: { judge_calls: 1 } });
    });

    it('records the judge call that threw', async () => {
      const prompt = jest.fn().mockRejectedValue(new Error('connector down'));
      executeUntilValidMock.mockImplementation(realExecuteUntilValid);
      const result = await runPersonaRubricJudge({
        inferenceClient: { prompt } as unknown as BoundInferenceClient,
        category: 'alert-analysis',
        judgeOutput: withTools,
      });
      expect(result).toMatchObject({ label: 'unavailable', metadata: { judge_calls: 1 } });
      expect(result.explanation).toContain('connector down');
    });
  });

  it('returns unavailable instead of throwing when the logger throws on an unknown category', async () => {
    const log = {
      warning: jest.fn(() => {
        throw new Error('logger exploded');
      }),
    } as unknown as ToolingLog;
    const result = await runPersonaRubricJudge({
      inferenceClient: {} as BoundInferenceClient,
      category: 'not-a-category',
      judgeOutput: withTools,
      log,
    });
    expect(log.warning).toHaveBeenCalled();
    expect(result).toMatchObject({ score: null, label: 'unavailable' });
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
