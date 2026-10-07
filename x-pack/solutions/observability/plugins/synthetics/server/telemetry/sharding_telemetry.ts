/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Logger } from '@kbn/core/server';
import type { SyntheticsEventMap, SyntheticsTelemetry } from './synthetics_telemetry';
import type {
  PrivateLocationRebalanceEvent,
  PrivateLocationRebalanceReason,
  PrivateLocationShardingSnapshotEvent,
} from './types';

export const SNAPSHOT_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const hashLocationId = (locationId: string): string =>
  createHash('sha256').update(locationId).digest('hex');

export const isSnapshotDue = (lastSnapshotAt: number | undefined, now: number): boolean =>
  lastSnapshotAt === undefined || now - lastSnapshotAt >= SNAPSHOT_INTERVAL_MS;

/**
 * Agents that were healthy last run and aren't now (evicted) and vice versa
 * (recovered). With no prior streaks for the policy this is the first time we
 * see it, so nothing is reported rather than counting every agent as recovered.
 */
export const diffHealthyAgents = ({
  priorHealthySince,
  agentPolicyId,
  healthyAgentIds,
}: {
  priorHealthySince: Readonly<Record<string, number>>;
  agentPolicyId: string;
  healthyAgentIds: readonly string[];
}): { evicted: number; recovered: number } => {
  const prefix = `${agentPolicyId}:`;
  const prior = new Set(
    Object.keys(priorHealthySince)
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length))
  );
  if (prior.size === 0) {
    return { evicted: 0, recovered: 0 };
  }
  const healthy = new Set(healthyAgentIds);
  return {
    evicted: [...prior].filter((agentId) => !healthy.has(agentId)).length,
    recovered: healthyAgentIds.filter((agentId) => !prior.has(agentId)).length,
  };
};

/** `undefined` means the run changed nothing worth reporting. */
export const getRebalanceReason = ({
  evicted,
  recovered,
  monitorsFailedOver,
  monitorsMoved,
  moveFailures,
}: {
  evicted: number;
  recovered: number;
  monitorsFailedOver: number;
  monitorsMoved: number;
  moveFailures: number;
}): PrivateLocationRebalanceReason | undefined => {
  if (evicted > 0 || monitorsFailedOver > 0) return 'failover';
  if (recovered > 0) return 'recovery';
  if (monitorsMoved > 0) return 'rebalance';
  if (moveFailures > 0) return 'move_failed';
  return undefined;
};

const median = (sortedValues: number[]): number => {
  const mid = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0
    ? Math.round((sortedValues[mid - 1] + sortedValues[mid]) / 2)
    : sortedValues[mid];
};

export const summarizeDistribution = (
  monitorsPerAgent: Readonly<Record<string, number>>
): Pick<
  PrivateLocationShardingSnapshotEvent,
  'monitorsPerAgentMin' | 'monitorsPerAgentMedian' | 'monitorsPerAgentMax' | 'skewRatio'
> => {
  const counts = Object.values(monitorsPerAgent).sort((a, b) => a - b);
  if (counts.length === 0) {
    return {
      monitorsPerAgentMin: 0,
      monitorsPerAgentMedian: 0,
      monitorsPerAgentMax: 0,
      skewRatio: 0,
    };
  }
  const max = counts[counts.length - 1];
  const mean = counts.reduce((sum, value) => sum + value, 0) / counts.length;
  return {
    monitorsPerAgentMin: counts[0],
    monitorsPerAgentMedian: median(counts),
    monitorsPerAgentMax: max,
    skewRatio: mean === 0 ? 0 : Math.round((max / mean) * 100) / 100,
  };
};

type RebalanceCounts = Omit<
  PrivateLocationRebalanceEvent,
  'locationHash' | 'reason' | 'durationMs' | 'stackVersion' | 'issuedTo'
>;

const ZERO_COUNTS: RebalanceCounts = {
  agentsTotal: 0,
  agentsHealthy: 0,
  agentsStale: 0,
  agentsEvicted: 0,
  agentsRecovered: 0,
  agentsRecoveryEligible: 0,
  livenessVetoSavedAgents: 0,
  monitorsTotal: 0,
  monitorsMoved: 0,
  monitorsFailedOver: 0,
  moveFailures: 0,
};

export const buildRebalanceEvent = ({
  locationId,
  reason,
  stackVersion,
  durationMs,
  counts,
}: {
  locationId: string;
  reason: PrivateLocationRebalanceReason;
  stackVersion: string;
  durationMs: number;
  counts?: Partial<RebalanceCounts>;
}): PrivateLocationRebalanceEvent => ({
  ...ZERO_COUNTS,
  ...counts,
  locationHash: hashLocationId(locationId),
  reason,
  durationMs,
  stackVersion,
});

/** Telemetry must never break the rebalance task. */
export const reportShardingEvent = <K extends keyof SyntheticsEventMap>(
  telemetry: SyntheticsTelemetry | undefined,
  logger: Logger,
  eventType: K,
  event: SyntheticsEventMap[K]
): void => {
  try {
    telemetry?.reportEvent(eventType, event);
  } catch (error) {
    logger.debug(`reporting sharding telemetry failed: ${error.message}`);
  }
};
