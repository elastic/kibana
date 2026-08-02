/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The rationale inside a gate's answer, or `undefined` when the answer does not carry one.
 *
 * The approval modal reports whatever the gate's own `inputSchema` asked for, so `rationale`
 * arrives as an `unknown` off an open value map. The page needs it to seed the rule-id dialog a
 * `tune` approval opens next, which is what keeps one decision from asking for its reason twice.
 *
 * Anything that is not real text — absent, a number, blank — reads as no rationale, because a
 * seeded field is presented to the analyst as an answer they have already given.
 */
export const readProposalRationale = (input: Record<string, unknown>): string | undefined => {
  const { rationale } = input;

  return typeof rationale === 'string' && rationale.trim().length > 0 ? rationale : undefined;
};
