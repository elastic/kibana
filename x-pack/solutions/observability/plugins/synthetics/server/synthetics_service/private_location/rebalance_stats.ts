/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitorPlacement } from './assign_shards';

export interface RebalanceShardsResult {
  total: number;
  moved: number;
  /** Moves that Fleet rejected; retried next cycle. */
  failed: number;
  /** Monitors pinned to an agent that is no longer healthy. */
  failedOver: number;
  /** Monitors with no agent pin yet (e.g. newly created). */
  unpinned: number;
  /** Intended post-rebalance monitor count for every healthy agent (0 included). */
  monitorsPerAgent: Record<string, number>;
  browserMonitors: number;
}

export const EMPTY_REBALANCE_RESULT: RebalanceShardsResult = {
  total: 0,
  moved: 0,
  failed: 0,
  failedOver: 0,
  unpinned: 0,
  monitorsPerAgent: {},
  browserMonitors: 0,
};

export const summarizeRebalance = ({
  monitors,
  assignment,
  healthyAgentIds,
}: {
  monitors: ReadonlyArray<MonitorPlacement>;
  assignment: ReadonlyMap<string, string>;
  healthyAgentIds: readonly string[];
}): Pick<
  RebalanceShardsResult,
  'failedOver' | 'unpinned' | 'monitorsPerAgent' | 'browserMonitors'
> => {
  const healthy = new Set(healthyAgentIds);
  const monitorsPerAgent: Record<string, number> = Object.fromEntries(
    healthyAgentIds.map((agentId) => [agentId, 0])
  );

  let failedOver = 0;
  let unpinned = 0;
  let browserMonitors = 0;
  for (const monitor of monitors) {
    if (!monitor.currentAgentId) {
      unpinned++;
    } else if (!healthy.has(monitor.currentAgentId)) {
      failedOver++;
    }
    if (monitor.type === 'browser') {
      browserMonitors++;
    }
    const agentId = assignment.get(monitor.id);
    if (agentId && agentId in monitorsPerAgent) {
      monitorsPerAgent[agentId]++;
    }
  }

  return { failedOver, unpinned, monitorsPerAgent, browserMonitors };
};
