/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { SyntheticsServerSetup } from '../types';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import {
  RebalancePrivateLocationShardsTask,
  RECOVERY_STABILITY_MS,
  STALE_CHECKIN_MS,
} from './rebalance_private_location_shards_task';

const MIB = 1024 * 1024;

jest.mock('../synthetics_service/get_private_locations');

const getPrivateLocationsMock = getPrivateLocations as jest.MockedFunction<
  typeof getPrivateLocations
>;

describe('Rebalance private location shards tasks', () => {
  const NOW = 1_700_000_000_000;
  const SHARDS = ['s1', 's2', 's3'];
  const scalableLocation = {
    id: 'loc1',
    label: 'Scalable Location',
    agentPolicyId: 's1',
    agentPolicyIds: SHARDS,
    isServiceManaged: false,
  };

  const FRESH = NOW - 10_000; // 10s ago → fresh
  const STALE = NOW - (STALE_CHECKIN_MS + 60_000); // well past the stale window

  let listAgents: jest.Mock;
  let getAgentStatusForAgentPolicy: jest.Mock;
  let esSearch: jest.Mock;
  let rebalanceShards: jest.Mock;
  let server: SyntheticsServerSetup;
  let monitorClient: SyntheticsMonitorClient;

  // Per-shard max last_checkin (epoch ms), or null for a shard with no agents.
  // The check-in query passes `aggregations`; the memory helper's agent lookup
  // does not — return no agents there so it short-circuits (no host RAM data).
  const setCheckins = (checkins: Record<string, number | null>) => {
    listAgents.mockImplementation(async (params?: { aggregations?: unknown }) => {
      if (params?.aggregations) {
        return {
          aggregations: {
            by_policy: {
              buckets: Object.entries(checkins)
                .filter(([, value]) => value != null)
                .map(([key, value]) => ({ key, last_checkin: { value } })),
            },
          },
        };
      }
      return { agents: [] };
    });
  };

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    listAgents = jest.fn();
    getAgentStatusForAgentPolicy = jest.fn();
    esSearch = jest.fn().mockResolvedValue({ aggregations: { by_agent: { buckets: [] } } });
    rebalanceShards = jest.fn().mockResolvedValue({ total: 10, moved: 0 });

    getPrivateLocationsMock.mockResolvedValue([scalableLocation] as never);

    server = {
      logger: loggerMock.create(),
      coreStart: {
        savedObjects: { createInternalRepository: () => ({}) },
        elasticsearch: { client: { asInternalUser: { search: esSearch } } },
      },
      fleet: {
        agentService: {
          asInternalUser: { listAgents, getAgentStatusForAgentPolicy },
        },
      },
    } as unknown as SyntheticsServerSetup;

    monitorClient = {
      privateLocationAPI: { rebalanceShards },
    } as unknown as SyntheticsMonitorClient;
  });

  afterEach(() => jest.restoreAllMocks());

  describe('RebalancePrivateLocationShardsTask', () => {
    let task: RebalancePrivateLocationShardsTask;

    const runTask = (state: Record<string, unknown> = {}) =>
      task.runTask({
        taskInstance: { state, schedule: { interval: '1m' } } as unknown as ConcreteTaskInstance,
      });

    const healthyShardsArg = () => [...rebalanceShards.mock.calls[0][0].healthyShards].sort();
    const recoveryShardsArg = () => [...rebalanceShards.mock.calls[0][0].recoveryShards].sort();

    // Prior state where the given shards have been healthy long enough to be stable.
    const stableSince = (...ids: string[]) => ({
      healthySince: Object.fromEntries(ids.map((id) => [id, NOW - RECOVERY_STABILITY_MS - 1_000])),
    });

    beforeEach(() => {
      task = new RebalancePrivateLocationShardsTask(server, monitorClient);
    });

    it('treats all shards with recent check-ins as healthy', async () => {
      setCheckins({ s1: FRESH, s2: FRESH, s3: FRESH });

      await runTask();

      // A single aggregation query covers every shard's check-in (the memory
      // helper makes a separate, non-aggregation agent lookup).
      const aggCalls = listAgents.mock.calls.filter(([params]) => params?.aggregations);
      expect(aggCalls).toHaveLength(1);
      expect(rebalanceShards).toHaveBeenCalledTimes(1);
      expect(healthyShardsArg()).toEqual(['s1', 's2', 's3']);
    });

    it('passes per-shard host RAM (raw MiB) to rebalance', async () => {
      listAgents.mockImplementation(async (params?: { aggregations?: unknown }) => {
        if (params?.aggregations) {
          return {
            aggregations: {
              by_policy: {
                buckets: SHARDS.map((key) => ({ key, last_checkin: { value: FRESH } })),
              },
            },
          };
        }
        return {
          agents: [
            { id: 'a1', policy_id: 's1' },
            { id: 'a2', policy_id: 's2' },
            { id: 'a3', policy_id: 's3' },
          ],
        };
      });
      // s3 has no memory bucket → System integration not shipping metrics for it.
      esSearch.mockResolvedValue({
        aggregations: {
          by_agent: {
            buckets: [
              { key: 'a1', total: { value: 2048 * MIB } },
              { key: 'a2', total: { value: 4096 * MIB } },
            ],
          },
        },
      });

      await runTask();

      const { agentRamMibByShard } = rebalanceShards.mock.calls[0][0];
      expect(agentRamMibByShard.get('s1')).toBe(2048);
      expect(agentRamMibByShard.get('s2')).toBe(4096);
      expect(agentRamMibByShard.has('s3')).toBe(false);
    });

    it('evicts a shard whose last check-in is older than the stale window', async () => {
      setCheckins({ s1: FRESH, s2: FRESH, s3: STALE });

      await runTask();

      expect(healthyShardsArg()).toEqual(['s1', 's2']);
      expect(rebalanceShards).toHaveBeenCalledWith(
        expect.objectContaining({
          location: scalableLocation,
          healthyShards: expect.not.arrayContaining(['s3']),
        })
      );
    });

    it('treats a shard with no agents as stale', async () => {
      setCheckins({ s1: FRESH, s2: FRESH, s3: null });

      await runTask();

      expect(healthyShardsArg()).toEqual(['s1', 's2']);
    });

    it('skips rebalance when no shards are healthy', async () => {
      setCheckins({ s1: STALE, s2: STALE, s3: STALE });

      await runTask();

      expect(rebalanceShards).not.toHaveBeenCalled();
      expect(server.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No healthy shards for private location loc1')
      );
    });

    it('skips rebalance when there are no scalable locations', async () => {
      getPrivateLocationsMock.mockResolvedValue([
        { ...scalableLocation, agentPolicyIds: undefined },
      ] as never);

      await runTask();

      expect(listAgents).not.toHaveBeenCalled();
      expect(rebalanceShards).not.toHaveBeenCalled();
    });

    it('falls back to Fleet aggregate status when the check-in query fails', async () => {
      listAgents.mockRejectedValue(new Error('boom'));
      getAgentStatusForAgentPolicy.mockImplementation(async (id: string) => ({
        online: id === 's3' ? 0 : 1,
      }));

      await runTask();

      expect(getAgentStatusForAgentPolicy).toHaveBeenCalledTimes(SHARDS.length);
      expect(healthyShardsArg()).toEqual(['s1', 's2']);
    });

    describe('recovery hysteresis', () => {
      it('excludes freshly-seen shards from recovery until they clear the stability window', async () => {
        setCheckins({ s1: FRESH, s2: FRESH, s3: FRESH });

        // No prior state → every shard's healthy streak starts now, so none are
        // recovery-eligible yet even though all are healthy/live.
        const { state } = await runTask();

        expect(healthyShardsArg()).toEqual(['s1', 's2', 's3']);
        expect(recoveryShardsArg()).toEqual([]);
        expect((state as { healthySince: Record<string, number> }).healthySince).toEqual({
          s1: NOW,
          s2: NOW,
          s3: NOW,
        });
      });

      it('marks shards healthy beyond the stability window as recovery-eligible', async () => {
        setCheckins({ s1: FRESH, s2: FRESH, s3: FRESH });

        await runTask(stableSince('s1', 's2', 's3'));

        expect(recoveryShardsArg()).toEqual(['s1', 's2', 's3']);
      });

      it('holds a freshly recovered shard out of recovery while stable shards stay eligible', async () => {
        // s1/s2 have been healthy a while; s3 was down last run (absent) and is
        // now back — it must earn stability before receiving recovery work.
        setCheckins({ s1: FRESH, s2: FRESH, s3: FRESH });

        const { state } = await runTask(stableSince('s1', 's2'));

        expect(healthyShardsArg()).toEqual(['s1', 's2', 's3']);
        expect(recoveryShardsArg()).toEqual(['s1', 's2']);
        const { healthySince } = state as { healthySince: Record<string, number> };
        expect(healthySince.s1).toBe(NOW - RECOVERY_STABILITY_MS - 1_000); // streak preserved
        expect(healthySince.s3).toBe(NOW); // recovery streak restarted
      });

      it('resets the streak for a shard that went unhealthy', async () => {
        setCheckins({ s1: FRESH, s2: FRESH, s3: STALE });

        // s3 was stable before but is stale now → dropped from the streak map so
        // its grace window restarts if it comes back.
        const { state } = await runTask(stableSince('s1', 's2', 's3'));

        expect(recoveryShardsArg()).toEqual(['s1', 's2']);
        expect((state as { healthySince: Record<string, number> }).healthySince).not.toHaveProperty(
          's3'
        );
      });
    });
  });
});
