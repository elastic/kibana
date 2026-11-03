/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpVerdict } from '../constants';

/**
 * What one world check found, as the workflow reports it: a completed check's result,
 * or `skipped` when the source it reads was empty or unavailable.
 */
export type FpTpCheckResult = 'supports' | 'contradicts' | 'neutral' | 'skipped';

/** The world checks an example's world is authored to produce. */
export interface FpTpWorldChecks {
  readonly entityRole: FpTpCheckResult;
  readonly processParent: FpTpCheckResult;
  readonly networkDestination: FpTpCheckResult;
}

/**
 * The verdict rules `deriveFpTpOutcome` implements, as `fp_tp_analysis.yaml` states them.
 * A test compares this text with the YAML, so changing the rules there fails until
 * the function and this text are updated together.
 */
export const FP_TP_VERDICT_RULES = `
1. inconclusive — world checks both support and contradict; or you cannot cite
   an id from the hits below.
2. false_positive — at least one world check contradicts, none supports, and
   both the entity store and the raw events have hits. Missing evidence cannot
   clear an alert: if either source is empty or its query failed, the verdict
   is inconclusive.
3. true_positive — process_parent or network_destination supports and no world
   check contradicts. An empty or failed entity store does not block this.
   entity_role and alert_linkage corroborate but are never enough on their own.
4. inconclusive — anything else: every world check is skipped or neutral, or
   only entity_role or alert_linkage supports.
`;

/**
 * Applies `FP_TP_VERDICT_RULES` (first match wins) to authored check results, so every
 * example's gold follows from its world. It reads the three world checks only: rule 1's
 * citeability clause never applies because every example seeds citeable hits.
 */
export const deriveFpTpOutcome = ({
  entityRole,
  processParent,
  networkDestination,
}: FpTpWorldChecks): FpTpVerdict => {
  const results = [entityRole, processParent, networkDestination];
  const supports = results.includes('supports');
  const contradicts = results.includes('contradicts');
  const entitiesFound = entityRole !== 'skipped';
  const eventsFound = processParent !== 'skipped' || networkDestination !== 'skipped';

  if (supports && contradicts) {
    return 'inconclusive';
  }
  if (contradicts) {
    return entitiesFound && eventsFound ? 'false_positive' : 'inconclusive';
  }
  if (processParent === 'supports' || networkDestination === 'supports') {
    return 'true_positive';
  }
  return 'inconclusive';
};
