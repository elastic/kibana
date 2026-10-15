/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  capJudgePayload,
  getJudgePayloadCapOptionsFromEnv,
  withJudgePayloadCap,
} from './judge_payload_cap';

const OFF = { resultCharCap: 0, payloadCharBudget: 0 };

const toolStep = (toolId: string, text: string) => ({
  type: 'tool_call',
  tool_id: toolId,
  params: { q: 'keep me' },
  results: [{ type: 'other', data: { content: text } }],
});

const buildOutput = (steps: unknown[]) => ({
  messages: [{ message: 'final answer' }],
  steps,
  errors: [],
  traceId: 'trace-1',
});

const buildLog = () => ({ info: jest.fn() } as unknown as ToolingLog);

describe('capJudgePayload', () => {
  it('returns the same object and an empty report when both limits are off', () => {
    const output = buildOutput([toolStep('a', 'x'.repeat(10_000))]);
    const { output: capped, report } = capJudgePayload(output, OFF);
    expect(capped).toBe(output);
    expect(report.trimmed).toEqual([]);
    expect(report.charsAfter).toBe(report.charsBefore);
  });

  it('returns the same object when nothing exceeds the limits', () => {
    const output = buildOutput([toolStep('a', 'small')]);
    const { output: capped, report } = capJudgePayload(output, {
      resultCharCap: 1_000,
      payloadCharBudget: 100_000,
    });
    expect(capped).toBe(output);
    expect(report.trimmed).toEqual([]);
  });

  it('passes through outputs without steps', () => {
    const output = { messages: [], errors: [] };
    expect(capJudgePayload(output, { resultCharCap: 10, payloadCharBudget: 10 }).output).toBe(
      output
    );
  });

  it('truncates only oversized tool results and reports each one', () => {
    const big = 'y'.repeat(5_000);
    const output = buildOutput([toolStep('small', 'ok'), toolStep('big', big)]);
    const { output: capped, report } = capJudgePayload(output, {
      resultCharCap: 1_000,
      payloadCharBudget: 0,
    });

    const steps = (capped as typeof output).steps as Array<ReturnType<typeof toolStep>>;
    expect(steps[0]).toBe(output.steps[0]);
    expect(steps[1].results[0].data.content).toContain(
      '[tool result truncated for the judge: original'
    );
    expect(steps[1].results[0].data.content.length).toBeLessThan(big.length);
    expect(report.trimmed).toEqual([
      expect.objectContaining({
        stepIndex: 1,
        toolId: 'big',
        keptChars: 1_000,
        pass: 'result-cap',
      }),
    ]);
    expect(report.trimmed[0].originalChars).toBeGreaterThan(5_000);
    expect(report.charsAfter).toBeLessThan(report.charsBefore);
  });

  it('states the original size in the stub so the judge knows evidence was cut', () => {
    const output = buildOutput([toolStep('big', 'z'.repeat(5_000))]);
    const { output: capped, report } = capJudgePayload(output, {
      resultCharCap: 100,
      payloadCharBudget: 0,
    });
    const stub = (capped as typeof output).steps[0] as ReturnType<typeof toolStep>;
    expect(stub.results[0].data.content).toContain(
      `original ${report.trimmed[0].originalChars} chars, first 100 kept`
    );
  });

  it('never touches the input object, tool ids, params, answer, errors or trace id', () => {
    const output = buildOutput([toolStep('big', 'y'.repeat(5_000))]);
    const before = JSON.stringify(output);
    const { output: capped } = capJudgePayload(output, {
      resultCharCap: 100,
      payloadCharBudget: 0,
    });
    expect(JSON.stringify(output)).toBe(before);
    const cappedOutput = capped as typeof output;
    expect(cappedOutput.messages).toEqual(output.messages);
    expect(cappedOutput.errors).toEqual(output.errors);
    expect(cappedOutput.traceId).toBe('trace-1');
    expect(cappedOutput.steps[0]).toMatchObject({
      type: 'tool_call',
      tool_id: 'big',
      params: { q: 'keep me' },
    });
  });

  it('trims the largest results first until the total budget is met', () => {
    const output = buildOutput([
      toolStep('medium-1', 'a'.repeat(4_000)),
      toolStep('largest', 'b'.repeat(9_000)),
      toolStep('medium-2', 'c'.repeat(4_000)),
    ]);
    const { report } = capJudgePayload(output, { resultCharCap: 0, payloadCharBudget: 10_000 });

    expect(report.trimmed[0]).toMatchObject({ toolId: 'largest', pass: 'budget' });
    expect(report.charsAfter).toBeLessThanOrEqual(10_000);
    // Stops as soon as the budget holds, so the second medium result survives intact.
    expect(report.trimmed.map((t) => t.toolId)).not.toContain('medium-2');
  });

  it('applies the budget pass after the per-result cap', () => {
    const output = buildOutput([
      toolStep('a', 'a'.repeat(3_000)),
      toolStep('b', 'b'.repeat(3_000)),
      toolStep('c', 'c'.repeat(3_000)),
    ]);
    const { report } = capJudgePayload(output, { resultCharCap: 2_000, payloadCharBudget: 3_000 });

    const passes = report.trimmed.map((t) => t.pass);
    expect(passes.slice(0, 3)).toEqual(['result-cap', 'result-cap', 'result-cap']);
    expect(report.trimmed.some((t) => t.pass === 'budget')).toBe(true);
    expect(report.charsAfter).toBeLessThanOrEqual(3_000);
  });

  it('leaves steps without results alone', () => {
    const output = buildOutput([{ type: 'reasoning', reasoning: 'r'.repeat(5_000) }]);
    const { output: capped, report } = capJudgePayload(output, {
      resultCharCap: 10,
      payloadCharBudget: 10,
    });
    expect(capped).toBe(output);
    expect(report.trimmed).toEqual([]);
  });
});

describe('getJudgePayloadCapOptionsFromEnv', () => {
  it('is off by default', () => {
    expect(getJudgePayloadCapOptionsFromEnv({})).toEqual(OFF);
  });

  it('reads both limits, treating empty as unset', () => {
    expect(
      getJudgePayloadCapOptionsFromEnv({
        PERSONA_MATRIX_JUDGE_RESULT_CAP: '8000',
        PERSONA_MATRIX_JUDGE_PAYLOAD_BUDGET: '',
      })
    ).toEqual({ resultCharCap: 8_000, payloadCharBudget: 0 });
  });

  it.each(['-1', 'abc', '1.5', '8k'])('rejects %p and names the variable', (value) => {
    expect(() =>
      getJudgePayloadCapOptionsFromEnv({ PERSONA_MATRIX_JUDGE_RESULT_CAP: value })
    ).toThrow(`PERSONA_MATRIX_JUDGE_RESULT_CAP must be a non-negative integer, got "${value}".`);
  });
});

describe('withJudgePayloadCap', () => {
  const buildInner = () => {
    const evaluate = jest.fn(async (_args: unknown) => ({
      score: 1,
      metadata: { existing: true },
    }));
    return { inner: { name: 'criteria', kind: 'LLM', evaluate } as unknown as Evaluator, evaluate };
  };
  const callArgs = (output: unknown) =>
    ({ input: {}, output, expected: {}, metadata: {} } as Parameters<Evaluator['evaluate']>[0]);

  it('feeds the inner judge the capped copy and records what was trimmed', async () => {
    const { inner, evaluate } = buildInner();
    const log = buildLog();
    const output = buildOutput([toolStep('big', 'y'.repeat(5_000))]);

    const wrapped = withJudgePayloadCap(inner, log, { resultCharCap: 100, payloadCharBudget: 0 });
    const result = await wrapped.evaluate(callArgs(output));

    const seen = evaluate.mock.calls[0][0] as { output: typeof output };
    expect(JSON.stringify(seen.output).length).toBeLessThan(JSON.stringify(output).length);
    expect(result.metadata).toMatchObject({
      existing: true,
      judgePayloadTrim: { trimmed: [expect.objectContaining({ toolId: 'big' })] },
    });
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('trimmed 1 tool result'));
    expect(wrapped.name).toBe('criteria');
  });

  it('passes the original output and result through untouched when nothing is trimmed', async () => {
    const { inner, evaluate } = buildInner();
    const log = buildLog();
    const output = buildOutput([toolStep('a', 'small')]);

    const wrapped = withJudgePayloadCap(inner, log, OFF);
    const result = await wrapped.evaluate(callArgs(output));

    expect((evaluate.mock.calls[0][0] as { output: unknown }).output).toBe(output);
    expect(result).toEqual({ score: 1, metadata: { existing: true } });
    expect(log.info).not.toHaveBeenCalled();
  });
});
