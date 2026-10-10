/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, EventTypeOpts, RootSchema } from '@kbn/core/server';
import {
  PL_REBALANCE_EVENT_TYPE,
  PL_SHARDING_SNAPSHOT_EVENT_TYPE,
  PL_SHARDING_STATE_EVENT_TYPE,
} from './constants';
import type {
  PrivateLocationRebalanceEvent,
  PrivateLocationShardingSnapshotEvent,
  PrivateLocationShardingStateEvent,
} from './types';

const count = (description: string) => ({ type: 'long' as const, _meta: { description } });
const keyword = (description: string) => ({
  type: 'keyword' as const,
  _meta: { description },
});
const optionalKeyword = (description: string) => ({
  type: 'keyword' as const,
  _meta: { description, optional: true as const },
});

const locationHash = keyword('SHA-256 hash of the private location id');
const stackVersion = keyword('Kibana version');
const issuedTo = optionalKeyword('License holder of the cluster');

const rebalanceSchema: RootSchema<PrivateLocationRebalanceEvent> = {
  locationHash,
  reason: keyword(
    'Why the event fired: failover, recovery, rebalance, move_failed, no_healthy_agents or error'
  ),
  agentsTotal: count('Agents enrolled in the location'),
  agentsHealthy: count('Agents eligible to run monitors'),
  agentsStale: count('Agents treated as unhealthy this run'),
  agentsEvicted: count('Agents healthy last run and unhealthy now'),
  agentsRecovered: count('Agents unhealthy last run and healthy now'),
  agentsRecoveryEligible: count('Healthy agents stable enough to receive rebalanced monitors'),
  livenessVetoSavedAgents: count('Agents with a stale check-in kept because they still wrote data'),
  monitorsTotal: count('Monitors in the location'),
  monitorsMoved: count('Monitors whose agent pin was rewritten'),
  monitorsFailedOver: count('Monitors pinned to an unhealthy agent before this run'),
  monitorsUnpinned: count('Monitors with no agent pin before this run'),
  moveFailures: count('Agent pin rewrites rejected by Fleet; retried next run'),
  durationMs: count('Time spent rebalancing the location, in milliseconds'),
  stackVersion,
  issuedTo,
};

const snapshotSchema: RootSchema<PrivateLocationShardingSnapshotEvent> = {
  locationHash,
  agentsTotal: count('Agents enrolled in the location'),
  agentsHealthy: count('Agents eligible to run monitors'),
  agentsWithCapacity: count('Healthy agents reporting host memory, used to weight placement'),
  monitorsTotal: count('Monitors in the location'),
  browserMonitors: count('Browser monitors in the location'),
  monitorsPerAgentMin: count('Fewest monitors on a healthy agent'),
  monitorsPerAgentMedian: count('Median monitors per healthy agent'),
  monitorsPerAgentMax: count('Most monitors on a healthy agent'),
  skewRatio: {
    type: 'double',
    _meta: { description: 'Max over mean monitors per healthy agent; 1 is perfectly even' },
  },
  stackVersion,
  issuedTo,
};

const stateSchema: RootSchema<PrivateLocationShardingStateEvent> = {
  event: keyword('mode_changed or pin_drain'),
  mode: keyword('Sharding mode now: active, switch_off or unlicensed'),
  previousMode: optionalKeyword('Sharding mode before a mode_changed event'),
  pinsCleared: count('Agent pins removed by a drain'),
  pinsFailed: count('Agent pins a drain failed to remove'),
  drainAttempt: count('Drain attempt number; 0 when not a drain'),
  stackVersion,
  issuedTo,
};

export const privateLocationRebalanceEventType: EventTypeOpts<PrivateLocationRebalanceEvent> = {
  eventType: PL_REBALANCE_EVENT_TYPE,
  schema: rebalanceSchema,
};

export const privateLocationShardingSnapshotEventType: EventTypeOpts<PrivateLocationShardingSnapshotEvent> =
  {
    eventType: PL_SHARDING_SNAPSHOT_EVENT_TYPE,
    schema: snapshotSchema,
  };

export const privateLocationShardingStateEventType: EventTypeOpts<PrivateLocationShardingStateEvent> =
  {
    eventType: PL_SHARDING_STATE_EVENT_TYPE,
    schema: stateSchema,
  };

export const registerShardingEventTypes = (analytics: AnalyticsServiceSetup): void => {
  analytics.registerEventType(privateLocationRebalanceEventType);
  analytics.registerEventType(privateLocationShardingSnapshotEventType);
  analytics.registerEventType(privateLocationShardingStateEventType);
};
