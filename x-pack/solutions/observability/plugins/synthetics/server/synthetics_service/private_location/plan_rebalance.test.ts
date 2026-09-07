/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentInfo } from './get_agent_info';
import {
  planLocationRebalance,
  healthySinceKey,
  isCheckinStale,
  STALE_CHECKIN_MS,
  RECOVERY_STABILITY_MS,
} from './plan_rebalance';

const NOW = 1_000_000;
const POLICY = 'policy-1';

const info = (lastCheckin: number, memoryMib: number | null = null): AgentInfo => ({
  lastCheckin,
  memoryMib,
});

const plan = (
  agents: Map<string, AgentInfo>,
  priorHealthySince: Record<string, number> = {},
  now: number = NOW,
  activeAgentIds?: ReadonlySet<string>
) =>
  planLocationRebalance({ agents, now, priorHealthySince, agentPolicyId: POLICY, activeAgentIds });

describe('isCheckinStale', () => {
  it('is false within the window (including the exact boundary) and true past it', () => {
    expect(isCheckinStale(info(NOW), NOW)).toBe(false);
    expect(isCheckinStale(info(NOW - STALE_CHECKIN_MS), NOW)).toBe(false);
    expect(isCheckinStale(info(NOW - STALE_CHECKIN_MS - 1), NOW)).toBe(true);
  });
});

describe('planLocationRebalance', () => {
  describe('health detection (check-in recency)', () => {
    it('keeps agents within STALE_CHECKIN_MS and drops staler ones', () => {
      const agents = new Map<string, AgentInfo>([
        ['fresh', info(NOW)],
        ['at-boundary', info(NOW - STALE_CHECKIN_MS)],
        ['stale', info(NOW - STALE_CHECKIN_MS - 1)],
      ]);

      const { healthyAgentIds } = plan(agents);

      expect(healthyAgentIds.sort()).toEqual(['at-boundary', 'fresh']);
    });
  });

  describe('capacities', () => {
    it('reports RAM only for healthy agents that expose it', () => {
      const agents = new Map<string, AgentInfo>([
        ['healthy-with-ram', info(NOW, 2048)],
        ['healthy-no-ram', info(NOW, null)],
        ['stale-with-ram', info(NOW - STALE_CHECKIN_MS - 1, 4096)],
      ]);

      const { capacities } = plan(agents);

      expect([...capacities]).toEqual([['healthy-with-ram', 2048]]);
    });
  });

  describe('recovery hysteresis', () => {
    it('marks a freshly-recovered agent healthy but not yet recovery-eligible, and starts its streak now', () => {
      const agents = new Map<string, AgentInfo>([['a', info(NOW)]]);

      const { healthyAgentIds, recoveryAgentIds, nextHealthySince } = plan(agents, {});

      expect(healthyAgentIds).toEqual(['a']);
      expect(recoveryAgentIds).toEqual([]);
      expect(nextHealthySince).toEqual({ [healthySinceKey(POLICY, 'a')]: NOW });
    });

    it('makes an agent recovery-eligible once its streak reaches RECOVERY_STABILITY_MS', () => {
      const key = healthySinceKey(POLICY, 'a');
      const agents = new Map<string, AgentInfo>([['a', info(NOW)]]);

      const { recoveryAgentIds, nextHealthySince } = plan(agents, {
        [key]: NOW - RECOVERY_STABILITY_MS, // exactly at the threshold
      });

      expect(recoveryAgentIds).toEqual(['a']);
      // streak start is preserved, not reset to now
      expect(nextHealthySince[key]).toBe(NOW - RECOVERY_STABILITY_MS);
    });

    it('keeps an agent whose streak is one ms short out of recovery', () => {
      const key = healthySinceKey(POLICY, 'a');
      const agents = new Map<string, AgentInfo>([['a', info(NOW)]]);

      const { healthyAgentIds, recoveryAgentIds } = plan(agents, {
        [key]: NOW - (RECOVERY_STABILITY_MS - 1),
      });

      expect(healthyAgentIds).toEqual(['a']);
      expect(recoveryAgentIds).toEqual([]);
    });

    it('forgets a now-stale agent so a flapping agent restarts its streak (no churn)', () => {
      const key = healthySinceKey(POLICY, 'a');
      const agents = new Map<string, AgentInfo>([['a', info(NOW - STALE_CHECKIN_MS - 1)]]);

      // Even with a long prior healthy streak, a stale agent is dropped entirely.
      const { healthyAgentIds, recoveryAgentIds, nextHealthySince } = plan(agents, {
        [key]: NOW - 10 * RECOVERY_STABILITY_MS,
      });

      expect(healthyAgentIds).toEqual([]);
      expect(recoveryAgentIds).toEqual([]);
      expect(nextHealthySince).toEqual({});
    });
  });

  describe('data-plane liveness veto', () => {
    it('keeps a stale-check-in agent that is proven active by recent data', () => {
      const agents = new Map<string, AgentInfo>([['a', info(NOW - STALE_CHECKIN_MS - 1)]]);

      const { healthyAgentIds } = plan(agents, {}, NOW, new Set(['a']));

      expect(healthyAgentIds).toEqual(['a']);
    });

    it('still drops a stale agent that is not in the active set', () => {
      const agents = new Map<string, AgentInfo>([['a', info(NOW - STALE_CHECKIN_MS - 1)]]);

      const { healthyAgentIds } = plan(agents, {}, NOW, new Set(['other']));

      expect(healthyAgentIds).toEqual([]);
    });

    it('never evicts a fresh-check-in agent regardless of the active set', () => {
      const agents = new Map<string, AgentInfo>([['a', info(NOW)]]);

      const { healthyAgentIds } = plan(agents, {}, NOW, new Set());

      expect(healthyAgentIds).toEqual(['a']);
    });
  });

  it('scopes healthy-streak keys by agent policy id', () => {
    const agents = new Map<string, AgentInfo>([['a', info(NOW)]]);

    const { nextHealthySince } = plan(agents);

    expect(Object.keys(nextHealthySince)).toEqual(['policy-1:a']);
  });
});
