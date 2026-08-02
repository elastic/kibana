/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndCandidateRule } from '@kbn/pnd-common';

export interface FilterCandidateRulesByRefParams {
  /** The projected candidates, in aggregation order. */
  rules: readonly PndCandidateRule[];
  /** The gate's `ruleRef`, matched against either identifier. Absent means "the whole menu". */
  ruleRef?: string;
}

/**
 * Narrow the candidate menu to the rule a Detection Change gate already names.
 *
 * The `ruleRef` a gate carries may be **either** identifier: the surfaces that produce it are not
 * consistent about which one they have, and requiring one would silently return an empty menu for
 * the other. So a candidate matches when the ref equals its saved-object `id` *or* its `rule_id`.
 *
 * An unmatched ref returns an **empty** list rather than the unfiltered menu. That is the load-bearing
 * choice here: falling back to every rule would let a stale or wrong ref silently widen the draft's
 * choice back to the full set while the caller believes it asked about one rule — the drafting step
 * would then tune a rule nobody pointed at. An empty menu makes the step decline to propose, which
 * the watch's `on-failure: { continue: true }` degrades to today's behaviour.
 */
export const filterCandidateRulesByRef = ({
  rules,
  ruleRef,
}: FilterCandidateRulesByRefParams): PndCandidateRule[] => {
  if (ruleRef == null || ruleRef.length === 0) {
    return [...rules];
  }

  return rules.filter(
    ({ id, rule_id: candidateRuleId }) => id === ruleRef || candidateRuleId === ruleRef
  );
};
