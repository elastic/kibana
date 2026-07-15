/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deterministic monitor→shard assignment for scalable private locations.
 *
 * Uses rendezvous (highest-random-weight) hashing so that when a shard is
 * added or removed only the monitors that map to the changed shard move; every
 * other assignment is stable. This keeps rebalancing churn minimal when agents
 * join or leave the pool.
 */

// FNV-1a 32-bit — small, dependency-free, good enough distribution for sharding.
const fnv1a = (str: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    // hash *= 16777619, kept in 32-bit space
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const weight = (monitorId: string, shardId: string): number => fnv1a(`${monitorId}:${shardId}`);

/**
 * Returns the shard (agent policy id) that owns the given monitor, or undefined
 * when there are no shards to assign to.
 */
export const assignShard = (monitorId: string, shardIds: string[]): string | undefined => {
  if (shardIds.length === 0) {
    return undefined;
  }
  if (shardIds.length === 1) {
    return shardIds[0];
  }

  let best: string | undefined;
  let bestWeight = -1;
  for (const shardId of shardIds) {
    const w = weight(monitorId, shardId);
    // Tie-break on shardId for stable, order-independent results.
    if (w > bestWeight || (w === bestWeight && best !== undefined && shardId < best)) {
      bestWeight = w;
      best = shardId;
    }
  }
  return best;
};

/**
 * Resolves the shard pool for a private location. A location is "scalable" when
 * it declares more than one agent policy; otherwise it falls back to its single
 * agentPolicyId, preserving classic behaviour.
 */
export const getShardPool = (location: {
  agentPolicyId: string;
  agentPolicyIds?: string[];
}): string[] => {
  const pool = location.agentPolicyIds?.filter(Boolean) ?? [];
  return pool.length > 0 ? pool : [location.agentPolicyId];
};

export const isScalableLocation = (location: { agentPolicyIds?: string[] }): boolean =>
  (location.agentPolicyIds?.filter(Boolean).length ?? 0) > 1;
