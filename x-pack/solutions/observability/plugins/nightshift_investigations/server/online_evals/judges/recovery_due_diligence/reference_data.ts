/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { keepHeadAndTail } from '../../keep_head_and_tail';
import { MAX_TOOL_FIELD_CHARS, truncate } from '../render_round';

/** A tool call of an earlier round, as the evidence carries it. */
const earlierToolCallSchema = lazySchema(() =>
  z.object({
    tool_id: z.string().optional(),
    arguments: z.unknown().optional(),
    result: z.unknown().optional(),
  })
);

/**
 * The investigation's earlier rounds, which the recovery round is judged against: each answer with
 * the tool calls that produced it. Defaults to an empty object: a recovery with no earlier round and
 * no closing reasoning sends no reference data, which must not make the evals service refuse the
 * whole set.
 */
export const recoveryReferenceDataSchema = lazySchema(() =>
  z
    .object({
      earlier_rounds: z
        .array(
          z.object({
            answer: z.string(),
            tool_calls: z.array(earlierToolCallSchema).default([]),
          })
        )
        .optional(),
    })
    .default({})
);

export type RecoveryReferenceData = z.infer<typeof recoveryReferenceDataSchema>;
export type EarlierRound = NonNullable<RecoveryReferenceData['earlier_rounds']>[number];

/**
 * Budgets that keep all earlier rounds together inside the judges' inputs, which are capped at
 * `MAX_JUDGE_TEXT_LENGTH` characters. Each is shared by the rounds, so more rounds mean less of each
 * rather than an input the model call rejects.
 */
const MAX_EARLIER_FIELD_CHARS = 1_500;
const MAX_EARLIER_CONTEXT_CHARS = 80_000;
const MAX_EARLIER_ANSWERS_CHARS = 60_000;

const stringify = (value: unknown): string =>
  value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value);

/** One round's share of a budget shared by `count` rounds. */
const shareOf = (budget: number, count: number): number => Math.floor(budget / Math.max(count, 1));

/** The earlier rounds' answers, for the judge that checks which hypotheses the recovery revisited. */
export const renderEarlierAnswers = (rounds: readonly EarlierRound[] | undefined): string => {
  if (!rounds || rounds.length === 0) return '(not available)';
  const perAnswer = Math.min(
    MAX_TOOL_FIELD_CHARS,
    shareOf(MAX_EARLIER_ANSWERS_CHARS, rounds.length)
  );
  return rounds
    .map(({ answer }, index) => `Round ${index + 1}:\n${truncate(answer, perAnswer)}`)
    .join('\n\n');
};

/**
 * The earlier rounds' answers and tool calls with results, for the judge that decides which claims
 * have a source. The rounds share one budget: each gets an equal part, within which its answer is
 * cut short, and its tool calls keep their first and last ones when they do not fit.
 */
export const renderEarlierRounds = (rounds: readonly EarlierRound[] | undefined): string => {
  if (!rounds || rounds.length === 0) return '(not available)';
  const perRound = shareOf(MAX_EARLIER_CONTEXT_CHARS, rounds.length);
  const answerBudget = Math.min(MAX_TOOL_FIELD_CHARS, Math.floor(perRound / 4));
  const callsBudget = perRound - answerBudget;
  return rounds
    .map(({ answer, tool_calls: toolCalls }, roundIndex) => {
      const calls = toolCalls.map(
        ({ tool_id: toolId, arguments: args, result }, index) =>
          `${index + 1}. ${toolId ?? 'unknown tool'}(${truncate(
            stringify(args),
            MAX_EARLIER_FIELD_CHARS
          )})\n   → ${truncate(stringify(result), MAX_EARLIER_FIELD_CHARS)}`
      );
      const { headEnd, tailStart, omitted } = keepHeadAndTail(
        calls.map(({ length }) => length),
        callsBudget
      );
      return [
        `### Round ${roundIndex + 1}`,
        'Tool calls:',
        ...calls.slice(0, headEnd),
        ...(omitted > 0 ? [`[${omitted} tool calls omitted here]`] : []),
        ...calls.slice(tailStart),
        `Answer:\n${truncate(answer, answerBudget)}`,
      ].join('\n');
    })
    .join('\n\n');
};
