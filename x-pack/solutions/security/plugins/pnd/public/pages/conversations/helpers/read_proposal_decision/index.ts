/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalDecision } from '../../../../hooks/use_proposals_api';

/**
 * The decision inside a gate's answer, or `undefined` when the answer does not carry one.
 *
 * The approval modal reports whatever the gate's own `inputSchema` asked for, so `decision`
 * arrives as an `unknown` off an open value map rather than as a typed argument — and the page
 * needs it twice before the request is sent: to say which toast a success gets, and to route a
 * `tune` approval through the rule-id dialog.
 *
 * Closed and case-sensitive, exactly as the route is (security finding D2): a body carrying only
 * a rationale used to proceed as an **approval**, and so did a capitalized `"Dismiss"`. Reading
 * anything outside the enum as "no decision" keeps that fail-open shape from reappearing on the
 * client, where it would pick the toast rather than the action.
 */
export const readProposalDecision = (
  input: Record<string, unknown>
): PndProposalDecision | undefined => {
  const { decision } = input;

  return decision === 'approve' || decision === 'dismiss' ? decision : undefined;
};
