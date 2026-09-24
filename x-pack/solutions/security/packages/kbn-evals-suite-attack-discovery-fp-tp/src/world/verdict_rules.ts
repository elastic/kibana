/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpVerdict } from '../constants';

/**
 * What one world check found. `mixed` means the check's own evidence both supports and
 * contradicts the alert; `skipped` means the source it reads was empty or unavailable.
 */
export type FpTpCheckResult = 'supports' | 'contradicts' | 'neutral' | 'mixed' | 'skipped';

/** The world checks an example's world is authored to produce. */
export interface FpTpWorldChecks {
  readonly entityRole: FpTpCheckResult;
  readonly processParent: FpTpCheckResult;
  readonly networkDestination: FpTpCheckResult;
}

/**
 * Applies the workflow's verdict rules (`fp_tp_analysis.yaml`, first match wins) to
 * authored check results, so every example's gold follows from its world.
 */
export const deriveFpTpOutcome = ({
  entityRole,
  processParent,
  networkDestination,
}: FpTpWorldChecks): FpTpVerdict => {
  const results = [entityRole, processParent, networkDestination];
  const supports = results.some((result) => result === 'supports' || result === 'mixed');
  const contradicts = results.some((result) => result === 'contradicts' || result === 'mixed');
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
