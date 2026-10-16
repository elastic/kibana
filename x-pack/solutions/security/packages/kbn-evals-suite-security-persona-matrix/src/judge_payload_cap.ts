/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, TaskOutput } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * The LLM judges read `JSON.stringify(taskOutput)`. `taskOutput.steps[]` carries the raw tool
 * results, and one result can embed megabytes (a search over the conversation store was measured
 * at 2.4M chars). With reasoning on, that pushes the judge request past the judge model's input
 * limit and the suite aborts before scoring.
 *
 * `capJudgePayload` returns a COPY in which oversized tool-result bodies are replaced by a
 * head-truncated stub, plus a report of exactly what was trimmed. Tool ids, params, step types,
 * the final answer, errors and trace id are untouched, so call-level assertions and answer-level
 * criteria still see what they grade. The verbatim transcript is not affected: only the copy the
 * judge reads is capped.
 */

export const JUDGE_RESULT_CAP_ENV = 'PERSONA_MATRIX_JUDGE_RESULT_CAP';
export const JUDGE_PAYLOAD_BUDGET_ENV = 'PERSONA_MATRIX_JUDGE_PAYLOAD_BUDGET';

/**
 * Both limits are opt-in (0 = off) so default runs keep scoring exactly what the agent produced
 * and stay comparable with earlier baselines. A 1M-token judge window is ~2.5M chars of dense
 * JSON; `PERSONA_MATRIX_JUDGE_PAYLOAD_BUDGET=600000` leaves generous headroom for reasoning.
 */
export interface JudgePayloadCapOptions {
  /** Per-tool-result cap in chars. 0 disables the per-result pass. */
  resultCharCap: number;
  /** Ceiling for the whole payload in chars. 0 disables the budget pass. */
  payloadCharBudget: number;
}

export interface TrimmedResult {
  stepIndex: number;
  toolId?: string;
  originalChars: number;
  keptChars: number;
  pass: 'result-cap' | 'budget';
}

export interface JudgePayloadReport {
  trimmed: TrimmedResult[];
  charsBefore: number;
  charsAfter: number;
  /** True when the payload still exceeds `payloadCharBudget` because the untouched fields alone do. */
  overBudget: boolean;
}

interface Step {
  tool_id?: string;
  results?: unknown;
  [key: string]: unknown;
}

const parseNonNegativeInt = (name: string, value: string | undefined, fallback: number) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }
  if (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(Number(trimmed))) {
    throw new Error(`${name} must be a non-negative integer, got "${value}".`);
  }
  return Number(trimmed);
};

export const getJudgePayloadCapOptionsFromEnv = (
  env: NodeJS.ProcessEnv = process.env
): JudgePayloadCapOptions => ({
  resultCharCap: parseNonNegativeInt(JUDGE_RESULT_CAP_ENV, env[JUDGE_RESULT_CAP_ENV], 0),
  payloadCharBudget: parseNonNegativeInt(
    JUDGE_PAYLOAD_BUDGET_ENV,
    env[JUDGE_PAYLOAD_BUDGET_ENV],
    0
  ),
});

const stubResults = (serialized: string, keep: number) => [
  {
    type: 'other',
    data: {
      content: `[tool result truncated for the judge: original ${
        serialized.length
      } chars, first ${keep} kept]${serialized.slice(0, keep)}`,
    },
  },
];

const sizeOf = (value: unknown): number => JSON.stringify(value ?? null).length;

export const capJudgePayload = <T extends TaskOutput>(
  output: T,
  { resultCharCap, payloadCharBudget }: JudgePayloadCapOptions
): { output: T; report: JudgePayloadReport } => {
  const source = output as unknown as { steps?: unknown } | null;
  const steps = Array.isArray(source?.steps) ? (source?.steps as Step[]) : [];
  const charsBefore = sizeOf(output);
  const untouched = {
    output,
    report: {
      trimmed: [],
      charsBefore,
      charsAfter: charsBefore,
      overBudget: payloadCharBudget > 0 && charsBefore > payloadCharBudget,
    },
  };

  if (!steps.length || (!resultCharCap && !payloadCharBudget)) {
    return untouched;
  }

  const trimmed: TrimmedResult[] = [];
  const capped = [...steps];
  const trim = (index: number, keep: number, pass: TrimmedResult['pass']) => {
    const step = capped[index];
    const serialized = JSON.stringify(step.results);
    capped[index] = { ...step, results: stubResults(serialized, keep) };
    trimmed.push({
      stepIndex: index,
      toolId: step.tool_id,
      originalChars: serialized.length,
      keptChars: keep,
      pass,
    });
  };

  const hasResults = (step: Step | null | undefined): step is Step =>
    Boolean(step) && typeof step === 'object' && step?.results !== undefined;

  if (resultCharCap > 0) {
    capped.forEach((step, index) => {
      if (hasResults(step) && sizeOf(step.results) > resultCharCap) {
        trim(index, resultCharCap, 'result-cap');
      }
    });
  }

  if (payloadCharBudget > 0) {
    const bySizeDesc = capped
      .map((step, index) => ({ index, size: hasResults(step) ? sizeOf(step.results) : 0 }))
      .sort((a, b) => b.size - a.size);
    let total = sizeOf({ ...source, steps: capped });
    for (const { index, size } of bySizeDesc) {
      // Sorted largest-first: steps without results sort last, so nothing left to trim.
      if (total <= payloadCharBudget || size === 0) {
        break;
      }
      const serialized = JSON.stringify(capped[index].results);
      // Total payload size if this step's results were replaced by a stub keeping `keep` chars.
      // Measured on the real serialization so stub text and JSON escaping are accounted for.
      const totalWith = (keep: number) =>
        sizeOf({
          ...source,
          steps: capped.map((step, i) =>
            i === index ? { ...step, results: stubResults(serialized, keep) } : step
          ),
        });
      const emptyStubTotal = totalWith(0);
      // Trim only when the replacement stub is actually smaller; then keep the largest prefix
      // that lets the whole payload fit (size grows with `keep`), or 0 when even an empty stub
      // leaves the payload over budget and the next result has to give up more.
      if (emptyStubTotal < total) {
        let keep = 0;
        if (emptyStubTotal <= payloadCharBudget) {
          let high = serialized.length;
          while (keep < high) {
            const mid = Math.ceil((keep + high) / 2);
            if (totalWith(mid) <= payloadCharBudget) {
              keep = mid;
            } else {
              high = mid - 1;
            }
          }
        }
        trim(index, keep, 'budget');
      }
      total = sizeOf({ ...source, steps: capped });
    }
  }

  const overBudget =
    payloadCharBudget > 0 && sizeOf({ ...source, steps: capped }) > payloadCharBudget;
  if (!trimmed.length) {
    return { output, report: { trimmed, charsBefore, charsAfter: charsBefore, overBudget } };
  }

  const result = { ...source, steps: capped } as unknown as T;
  return {
    output: result,
    report: { trimmed, charsBefore, charsAfter: sizeOf(result), overBudget },
  };
};

/**
 * Wraps a judge evaluator so it only reads the capped payload. Whatever was trimmed is logged and
 * recorded on the evaluator result's metadata (`judgePayloadTrim`), so a trimmed score is never
 * indistinguishable from an untrimmed one.
 */
export const withJudgePayloadCap = (
  inner: Evaluator,
  log: ToolingLog,
  options: JudgePayloadCapOptions = getJudgePayloadCapOptionsFromEnv()
): Evaluator => ({
  ...inner,
  evaluate: async (args) => {
    const { output, report } = capJudgePayload(args.output, options);
    const result = await inner.evaluate({ ...args, output });
    if (!report.trimmed.length && !report.overBudget) {
      return result;
    }
    log.info(
      `[persona-matrix][judge-cap] ${inner.name}: judge payload ${report.charsBefore} -> ${
        report.charsAfter
      } chars, trimmed ${report.trimmed.length} tool result(s)${
        report.overBudget ? ' (STILL OVER BUDGET: non-result fields alone exceed it)' : ''
      }`
    );
    return { ...result, metadata: { ...result?.metadata, judgePayloadTrim: report } };
  },
});
