/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, ConversationRoundStep } from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  ToolResultType,
} from '@kbn/agent-builder-common';
import { SET_HYPOTHESES_TOOL_ID } from '@kbn/agentic-investigations-plugin/common';
import type { ReportHypothesis } from '../judges/report';

/** Test fixtures: investigations with and without a hypotheses panel. */

export const CAUSE_A = 'A bad deploy of the payments service';
export const CAUSE_B = 'Cache eviction in the checkout service';

const toolCall = (
  toolCallId: string,
  toolId: string,
  params: Record<string, unknown>
): ConversationRoundStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: toolCallId,
  tool_id: toolId,
  params,
  results: [{ tool_result_id: `${toolCallId}-result`, type: ToolResultType.other, data: {} }],
});

const bash = (toolCallId: string, command: string): ConversationRoundStep =>
  toolCall(toolCallId, 'nightshift_sandbox_bash', { command });

const setHypotheses = (toolCallId: string, hypotheses: ReportHypothesis[]): ConversationRoundStep =>
  toolCall(toolCallId, SET_HYPOTHESES_TOOL_ID, { hypotheses });

const round = ({
  id,
  input,
  answer,
  steps,
}: {
  id: string;
  input: string;
  answer: string;
  steps: ConversationRoundStep[];
}): ConversationRound => ({
  id,
  status: ConversationRoundStatus.completed,
  input: { message: input },
  steps,
  response: { message: answer },
  started_at: '2026-10-29T10:00:00.000Z',
  time_to_first_token: 0,
  time_to_last_token: 0,
  model_usage: { connector_id: 'agent-connector', llm_calls: 1, input_tokens: 0, output_tokens: 0 },
  trace_id: `trace-${id}`,
});

export const CONFIRMED_A: ReportHypothesis = {
  candidate: CAUSE_A,
  status: 'confirmed',
  confidence: 0.9,
  reason: 'Error rate rose with the 10:02 payments rollout.',
};

export const CONFIRMED_B: ReportHypothesis = {
  candidate: CAUSE_B,
  status: 'confirmed',
  confidence: 0.85,
  reason: 'Cache hit rate fell to zero before the errors began.',
};

export const DISMISSED_A: ReportHypothesis = {
  candidate: CAUSE_A,
  status: 'dismissed',
  confidence: 0.1,
  reason: 'The rollout reached one pod only.',
};

const INITIAL_ROUND = round({
  id: 'round-initial',
  input: 'Why did the checkout alert fire?',
  answer: 'Investigation complete. See the hypotheses panel.',
  steps: [bash('call-pods', 'kubectl get pods'), setHypotheses('call-panel-a', [CONFIRMED_A])],
});

/** One round with a short answer; the root cause sits only in the hypotheses panel. */
export const ANSWER_PLUS_PANEL: ConversationRound[] = [INITIAL_ROUND];

/** Round 1 confirms A, a follow-up dismisses A and confirms B, then the alert recovers. */
export const FOLLOW_UP_CHANGES_CAUSE: ConversationRound[] = [
  INITIAL_ROUND,
  round({
    id: 'round-follow-up',
    input: 'Could it be the cache instead?',
    answer: 'Yes: cache eviction, not the deploy.',
    steps: [
      bash('call-cache', 'redis-cli info stats'),
      setHypotheses('call-panel-b', [DISMISSED_A, CONFIRMED_B]),
    ],
  }),
  round({
    id: 'round-recovery',
    input: 'An alert in this investigation has recovered.',
    answer: 'Confirmed: restoring the cache cleared the alert.',
    steps: [],
  }),
];

/** One round with no `set_hypotheses` call. */
export const NO_PANEL: ConversationRound[] = [
  round({
    id: 'round-initial',
    input: 'Why did the checkout alert fire?',
    answer: `${CAUSE_A}.`,
    steps: [bash('call-pods', 'kubectl get pods')],
  }),
];
