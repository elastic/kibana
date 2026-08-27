/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Observation, ObservationSeverity } from './types';

const OBSERVATION_SEVERITY_RANK: Readonly<Record<ObservationSeverity, number>> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

type SignalDelta = 'equal' | 'escalated' | 'decayed';
// Signal is a simplified representation of an observation, it includes only information used to compare leads
export type LeadSignal = Pick<Observation, 'moduleId' | 'type' | 'severity'>;

/**
 * Collapses observations to the highest severity seen per `moduleId:type`.
 */
export const indexSignals = (signals: readonly LeadSignal[]): ReadonlyMap<string, number> =>
  signals.reduce((acc, { moduleId, type, severity }) => {
    const key = `${moduleId}:${type}`;
    acc.set(key, Math.max(acc.get(key) ?? 0, OBSERVATION_SEVERITY_RANK[severity] ?? 0));
    return acc;
  }, new Map<string, number>());

/**
 * Classifies how a candidate's evidence differs from what is already stored.
 * - "escalated" means a new signal kind appeared or an existing one became more
 *   severe
 * - "decayed" means a signal disappeared or its severity decreased
 * - "equal" means the new signals match the same severity as the existing signals
 */
export const compareSignals = (
  candidate: readonly LeadSignal[],
  existing: readonly LeadSignal[]
): SignalDelta => {
  const current = indexSignals(candidate);
  const prior = indexSignals(existing);

  let identical = current.size === prior.size;
  for (const [key, rank] of current) {
    const priorRank = prior.get(key);
    if (priorRank === undefined || rank > priorRank) return 'escalated';
    if (rank < priorRank) identical = false;
  }
  return identical ? 'equal' : 'decayed';
};

export const computeContentHash = ({
  observations,
}: {
  observations: readonly LeadSignal[];
}): string => {
  const collapsed = [...indexSignals(observations).entries()]
    .map(([key, rank]) => `${key}:${rank}`)
    .sort();

  return createHash('sha256')
    .update(JSON.stringify({ signals: collapsed }))
    .digest('hex');
};
