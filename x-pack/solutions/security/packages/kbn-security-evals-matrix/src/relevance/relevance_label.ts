/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorrectnessAnalysis } from '@kbn/evals';

export type RelevanceLabel = 'RELEVANT' | 'PARTIALLY_RELEVANT' | 'IRRELEVANT';

/**
 * Derives the relevance label from the centrality tags the correctness judge assigned to the
 * claims of the agent response:
 * - RELEVANT: at least one claim and every claim is central
 * - IRRELEVANT: no claims, or fewer than half of the claims are central
 * - PARTIALLY_RELEVANT: otherwise
 */
export function deriveRelevanceLabel(
  claims: Array<Pick<CorrectnessAnalysis['analysis'][number], 'centrality'>>
): RelevanceLabel {
  const numClaims = claims.length;
  if (numClaims === 0) {
    return 'IRRELEVANT';
  }

  const centralClaimsCount = claims.filter((claim) => claim.centrality === 'central').length;
  if (centralClaimsCount === numClaims) {
    return 'RELEVANT';
  }

  return centralClaimsCount * 2 < numClaims ? 'IRRELEVANT' : 'PARTIALLY_RELEVANT';
}

/**
 * True when the answer the judge graded is empty. A task output may record that verdict as
 * `judgedAnswerEmpty` (the stored transcript can keep interior narration the judge never saw);
 * otherwise the latest message in the message list is checked. Outputs without either are
 * unknown, not empty.
 */
export function isAgentResponseEmpty(output: unknown): boolean {
  const judgedAnswerEmpty = (output as { judgedAnswerEmpty?: unknown } | null | undefined)
    ?.judgedAnswerEmpty;
  if (typeof judgedAnswerEmpty === 'boolean') {
    return judgedAnswerEmpty;
  }

  const messages = (output as { messages?: unknown } | null | undefined)?.messages;
  if (!Array.isArray(messages)) {
    return false;
  }

  const latestMessage = messages[messages.length - 1]?.message;
  return typeof latestMessage !== 'string' || latestMessage.trim() === '';
}
