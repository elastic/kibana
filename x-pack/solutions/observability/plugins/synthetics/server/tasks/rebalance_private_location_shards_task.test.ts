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
  STALE_CHECKIN_MS,
} from './rebalance_private_location_shards_task';

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
  let rebalanceShards: jest.Mock;
  let server: SyntheticsServerSetup;
  let monitorClient: SyntheticsMonitorClient;

  // Per-shard max last_checkin (epoch ms), or null for a shard with no agents.
  const setCheckins = (checkins: Record<string, number | null>) => {
    listAgents.mockResolvedValue({
      aggregations: {
        by_policy: {
          buckets: Object.entries(checkins)
            .filter(([, value]) => value != null)
            .map(([key, value]) => ({ key, last_checkin: { value } })),
        },
      },
    });
  };

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    listAgents = jest.fn();
    getAgentStatusForAgentPolicy = jest.fn();
    rebalanceShards = jest.fn().mockResolvedValue({ total: 10, moved: 0 });

    getPrivateLocationsMock.mockResolvedValue([scalableLocation] as never);

    server = {
      logger: loggerMock.create(),
      coreStart: {
        savedObjects: { createInternalRepository: () => ({}) },
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

    beforeEach(() => {
      task = new RebalancePrivateLocationShardsTask(server, monitorClient);
    });

    it('treats all shards with recent check-ins as healthy', async () => {
      setCheckins({ s1: FRESH, s2: FRESH, s3: FRESH });

      await runTask();

      expect(listAgents).toHaveBeenCalledTimes(1);
      expect(rebalanceShards).toHaveBeenCalledTimes(1);
      expect(healthyShardsArg()).toEqual(['s1', 's2', 's3']);
    });

    it('evicts a shard whose last check-in is older than the stale window', async () => {
      setCheckins({ s1: FRESH, s2: FRESH, s3: STALE });

      await runTask();

      expect(healthyShardsArg()).toEqual(['s1', 's2']);
      expect(rebalanceShards).toHaveBeenCalledWith({
        location: scalableLocation,
        healthyShards: expect.not.arrayContaining(['s3']),
      });
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
  });
});
