/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';

/**
 * Deductive's causal-confirmation check, used as written there: it reads an investigation
 * transcript and decides whether a causal relationship was confirmed with proof of work.
 */
export const CAUSAL_CHECK_SYSTEM_PROMPT = `You analyze investigation conversations to detect human feedback messages and confirmed causal relationships.

A "feedback message" is a human message that provides root-cause information, correction of the investigation, or confirmation/denial of findings — as opposed to a new investigation question.

Examples of feedback messages:
- "The root cause was a deployment of checkout-service which caused 5XX errors in cart-service."
- "Actually, the issue was a cassandra connection pool bug used in LoginService.java line 100."
- "You missed that the CPU spike was caused by a GC pause triggered by a memory leak in the worker pool."

Examples of non-feedback messages:
- "Why is CPU spiking on these pods?"
- "Investigate the 5XX errors on the payment service."
- "What's causing the latency increase?"

A "confirmed causal relationship" is only established when factual evidences have been provided along with the feedback along with proof of work.

When writing causal_summary, go beyond naming the root cause. Include:
1. The confirmed root cause with supporting evidence (exception type, metric values, log entries, timing).
2. The key investigation step that reveals it (e.g. "searching dependency logs for InvalidQueryException").
3. What the agent concluded incorrectly and why that conclusion is wrong.
4. Any decision gate or threshold in the investigation path that prevented the correct conclusion
   (e.g. "a failure-rate threshold check blocked the log search step", "the agent concluded
   MailboxClosedException without checking the underlying exception in Cassandra logs").
5. What structural change to the investigation tree would prevent this failure in future
   (e.g. "log search for the dependency exception type should happen directly after confirming
   restart correlation, without gating on failure rate").

This summary will be used to update the investigation decision tree, so be specific about the
investigation path and any thresholds or gates that should be changed.

Respond with your structured analysis.`;

export const CAUSAL_CHECK_QUESTION = `Based on the investigation transcript and the human feedback message above (and the causal analysis response if one follows the feedback):
1. Is the human feedback message a root-cause correction or confirmation (i.e. the human is telling the agent what the real cause was) rather than a new investigation question?
2. Does the agent's own investigation — the tool calls, data retrieved, and evidence gathered throughout the conversation — support the causal claim in the feedback, even if the agent drew the wrong conclusion from it? A causal relationship is confirmed when the investigation data is consistent with the feedback's root cause, regardless of whether the agent identified it.
3. If confirmed: write a rich causal_summary that includes the correct root cause, the specific evidence in the investigation that supports it, what investigation steps the agent missed or skipped, what decision gate or threshold prevented the correct conclusion, and what structural change to the investigation tree would route future investigations to the correct root cause.`;

export interface CausalConfirmation {
  isFeedbackMessage: boolean;
  causalConfirmed: boolean;
  causalSummary: string;
  learning: string;
}

const CAUSAL_CHECK_SCHEMA = {
  type: 'object',
  properties: {
    is_feedback_message: {
      type: 'boolean',
      description:
        'True if the human message contains investigation feedback or root-cause information rather than a new investigation question.',
    },
    causal_confirmed: {
      type: 'boolean',
      description:
        'True if a causal relationship between the human feedback and the observed incident/symptom was confirmed with enough proof-of-work.',
    },
    causal_summary: {
      type: 'string',
      description:
        'Rich summary of the confirmed root cause, the evidence that establishes it, what investigation step would have revealed it, what the agent got wrong or missed, and any decision gate or threshold in the investigation flow that blocked the correct path. Used to restructure the decision tree, so include enough detail to know which tree branches to add, modify, or remove.',
    },
    learning: {
      type: 'string',
      description:
        'User-facing 1-3 sentence insight from the human feedback (a methodology improvement, heuristic, domain fact, or reason the agent path was wrong) that should improve future investigations. Plain prose, no Markdown. Leave empty only for pure acknowledgements.',
    },
  },
  required: ['is_feedback_message', 'causal_confirmed', 'causal_summary'],
} as const;

/**
 * Asks the model whether the investigation transcript confirms a causal relationship. Returns
 * undefined when the model fails or answers with something unusable, so the caller can fall back.
 */
export const checkCausalConfirmation = async ({
  inferenceClient,
  transcript,
  signal,
}: {
  inferenceClient: BoundInferenceClient;
  transcript: string;
  signal?: AbortSignal;
}): Promise<CausalConfirmation | undefined> => {
  try {
    const { output } = await inferenceClient.output({
      id: 'nightshift_causal_check',
      abortSignal: signal,
      system: CAUSAL_CHECK_SYSTEM_PROMPT,
      input: `${transcript}\n\n${CAUSAL_CHECK_QUESTION}`,
      schema: CAUSAL_CHECK_SCHEMA as never,
    });
    const result = output as Record<string, unknown> | undefined;
    if (!result || typeof result.causal_confirmed !== 'boolean') return undefined;
    return {
      isFeedbackMessage: result.is_feedback_message === true,
      causalConfirmed: result.causal_confirmed,
      causalSummary: typeof result.causal_summary === 'string' ? result.causal_summary : '',
      learning: typeof result.learning === 'string' ? result.learning : '',
    };
  } catch {
    return undefined;
  }
};
