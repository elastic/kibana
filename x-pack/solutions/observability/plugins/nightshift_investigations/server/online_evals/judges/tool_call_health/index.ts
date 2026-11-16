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
interface ToolCallIssue {
  step: number;
  reason: string;
}

/** Valid, unique issues for calls that exist, in call order; calls in `excluded` are skipped. */
const toIssues = (
  issues: readonly ToolCallIssue[],
  callCount: number,
  excluded: ReadonlySet<number> = new Set()
): ToolCallIssue[] => {
  const byStep = new Map<number, ToolCallIssue>();
  for (const { step, reason } of issues) {
    if (!Number.isInteger(step) || step < 1 || step > callCount) continue;
    if (excluded.has(step) || byStep.has(step)) continue;
    byStep.set(step, { step, reason });
  }
  return [...byStep.values()].sort((a, b) => a.step - b.step);
};

const issuesScore = (name: string, noun: string, issues: ToolCallIssue[]): Score => ({
  name,
  score: issues.length,
  label: issues.length > 0 ? noun : 'none',
  explanation: capExplanation(
    issues.length > 0
      ? issues.map(({ step, reason }) => `call ${step}: ${reason}`).join('\n')
      : `No ${noun} tool calls.`
  ),
});

const notApplicableScores = (explanation: string): Score[] =>
  ['tool_calls_failed', 'tool_calls_empty'].map((name) => ({
    name,
    score: null,
    label: 'n/a',
    explanation,
  }));

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
      return { scores: notApplicableScores('The investigation made no tool calls.') };
    }
    const { text, omitted } = renderToolCalls(round, { maxFieldChars: MAX_FIELD_CHARS });
    if (omitted > 0) {
      return {
        scores: notApplicableScores(
          `${omitted} of ${callCount} tool calls did not fit the judge's context, so a count of failed or empty calls would miss them.`
        ),
      };
    }

    const output = await runJudge({
      inferenceClient,
      prompt: toolCallHealthPrompt,
      input: { question: round.input.message, toolCalls: text },
      toolName: TOOL_CALL_HEALTH_TOOL_NAME,
      outputSchema: toolCallHealthOutputSchema,
    });

    const failed = toIssues(output.failed_calls, callCount);
    const failedSteps = new Set(failed.map(({ step }) => step));
    // A call is failed or empty, never both.
    const empty = toIssues(output.empty_calls, callCount, failedSteps);

    return {
      scores: [
        issuesScore('tool_calls_failed', 'failed', failed),
        issuesScore('tool_calls_empty', 'no-data', empty),
      ],
    };
  },
};
