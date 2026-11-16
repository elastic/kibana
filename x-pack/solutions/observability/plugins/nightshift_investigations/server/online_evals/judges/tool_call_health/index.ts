/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorResult, RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { renderToolCalls, roundEvidenceSchema } from '../render_round';
import { capExplanation, runJudge } from '../run_judge';
import {
  MAX_SUMMARY_CHARS,
  TOOL_CALL_HEALTH_TOOL_NAME,
  toolCallHealthOutputSchema,
  toolCallHealthPrompt,
} from './prompt';

/**
 * Each argument and result is cut to this many characters (its start and end), enough to see
 * whether a call failed or came back empty. Backtested against the full results on 30 offline
 * investigations: the same calls were flagged, at about half the prompt size.
 */
const MAX_FIELD_CHARS = 2_000;

type Score = EvaluatorResult['scores'][number];

/** Valid, unique call numbers that exist, in order; numbers in `excluded` are skipped. */
const toCallNumbers = (
  numbers: readonly number[],
  callCount: number,
  excluded: ReadonlySet<number> = new Set()
): number[] =>
  [
    ...new Set(
      numbers.filter(
        (number) =>
          Number.isInteger(number) && number >= 1 && number <= callCount && !excluded.has(number)
      )
    ),
  ].sort((a, b) => a - b);

/** The model's short summary of the most important calls, or the call numbers when it wrote none. */
const explain = (calls: number[], summary: string | undefined, noun: string): string => {
  if (calls.length === 0) {
    return `No ${noun} tool calls.`;
  }
  const text = summary?.trim().slice(0, MAX_SUMMARY_CHARS);
  return capExplanation(text || `calls ${calls.join(', ')}`);
};

const callsScore = (
  name: string,
  noun: string,
  calls: number[],
  summary: string | undefined,
  callCount: number
): Score => ({
  name,
  // Many failures point at the agent or sandbox setup, so the count is the signal; the
  // explanation only summarizes the most important calls.
  score: calls.length,
  // The total makes counts comparable between a round of 10 calls and one of 150.
  label: `${calls.length}/${callCount}`,
  explanation: explain(calls, summary, noun),
});

export const toolCallHealthJudge: RegisteredEvaluatorDefinition = {
  name: 'nightshift_tool_call_health',
  version: '1.0.0',
  kind: 'llm',
  direction: 'minimize',
  description:
    'Reference-free: how many tool calls of a nightshift investigation failed and how many returned no data, counting a "successful" response that did not achieve the call\'s purpose.',
  evidenceSchema: roundEvidenceSchema,
  async evaluate({ round, inferenceClient }) {
    if (!inferenceClient) {
      throw new Error('Inference client is required for the nightshift_tool_call_health judge');
    }

    const callCount = round.steps.length;
    if (callCount === 0) {
      return { scores: [], notApplicable: { reason: 'The investigation made no tool calls.' } };
    }
    const { text, omitted } = renderToolCalls(round, { maxFieldChars: MAX_FIELD_CHARS });
    if (omitted > 0) {
      return {
        scores: [],
        notApplicable: {
          reason: `${omitted} of ${callCount} tool calls did not fit the judge's context, so a count of failed or empty calls would miss them.`,
        },
      };
    }

    const output = await runJudge({
      inferenceClient,
      prompt: toolCallHealthPrompt,
      input: { question: round.input.message, toolCalls: text },
      toolName: TOOL_CALL_HEALTH_TOOL_NAME,
      outputSchema: toolCallHealthOutputSchema,
    });

    const failed = toCallNumbers(output.failed_calls, callCount);
    // A call is failed or empty, never both.
    const empty = toCallNumbers(output.empty_calls, callCount, new Set(failed));

    return {
      scores: [
        callsScore('tool_calls_failed', 'failed', failed, output.failed_summary, callCount),
        callsScore('tool_calls_empty', 'no-data', empty, output.empty_summary, callCount),
      ],
    };
  },
};
