/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-server';
import { coreMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import {
  RebalancePrivateLocationShardsTask,
  REBALANCE_SHARDS_TASK_ID,
  DEFAULT_REBALANCE_SCHEDULE,
  MAX_PIN_CLEAR_ATTEMPTS,
  runRebalanceShardsTaskSoon,
} from './rebalance_private_location_shards_task';
import {
  REBALANCE_SHARDS_ENABLED_STATE_KEY,
  REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY,
  REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY,
} from './rebalance_shards_enabled';
import type { SyntheticsServerSetup } from '../types';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import * as getPrivateLocationsModule from '../synthetics_service/get_private_locations';
import * as getAgentInfoModule from '../synthetics_service/private_location/get_agent_info';
import type { AgentInfo } from '../synthetics_service/private_location/get_agent_info';
import * as getActiveAgentIdsModule from '../synthetics_service/private_location/get_active_agent_ids';
import {
  RECOVERY_STABILITY_MS,
  STALE_CHECKIN_MS,
  STALE_DATA_MS,
  healthySinceKey,
} from '../synthetics_service/private_location/plan_rebalance';

const NOW = 1_700_000_000_000;

const mockTaskManagerStart = taskManagerMock.createStart();
const mockSoRepo = savedObjectsRepositoryMock.create();
const mockLogger = loggerMock.create();
const mockRebalanceShards = jest.fn().mockResolvedValue({ total: 0, moved: 0 });
const mockClearShardConditions = jest.fn().mockResolvedValue({ cleared: 0, failed: 0 });

const mockSyntheticsMonitorClient = {
  privateLocationAPI: {
    rebalanceShards: mockRebalanceShards,
    clearShardConditions: mockClearShardConditions,
  },
} as unknown as SyntheticsMonitorClient;

const coreStart = coreMock.createStart() as CoreStart;
(coreStart.savedObjects.createInternalRepository as jest.Mock).mockReturnValue(mockSoRepo);

const mockServerSetup = {
  coreStart,
  logger: mockLogger,
  config: { enabled: true },
  pluginsStart: { taskManager: mockTaskManagerStart },
} as unknown as SyntheticsServerSetup;

const location = (over: Partial<Record<string, unknown>> = {}) =>
  ({
    id: 'loc-1',
    label: 'Location 1',
    agentPolicyId: 'ap-1',
    isAgentSharding: true,
    ...over,
  } as unknown as Awaited<
    ReturnType<typeof getPrivateLocationsModule.getPrivateLocations>
  >[number]);

const agentInfo = (lastCheckin: number, memoryMib: number | null = null): AgentInfo => ({
  lastCheckin,
  memoryMib,
});

const taskInstance = (
  state: Record<string, unknown> = {},
  over: Partial<ConcreteTaskInstance> = {}
): ConcreteTaskInstance =>
  ({ id: REBALANCE_SHARDS_TASK_ID, state, params: {}, ...over } as unknown as ConcreteTaskInstance);

const makeTask = () =>
  new RebalancePrivateLocationShardsTask(mockServerSetup, mockSyntheticsMonitorClient);

const openSignal = () => new AbortController().signal;

const run = (
  state: Record<string, unknown> = {},
  signal: AbortSignal = openSignal(),
  taskOver: Partial<ConcreteTaskInstance> = {}
) => makeTask().runTask({ taskInstance: taskInstance(state, taskOver), signal });

describe('RebalancePrivateLocationShardsTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    mockTaskManagerStart.get.mockReset();
    mockRebalanceShards.mockResolvedValue({ total: 0, moved: 0 });
    mockClearShardConditions.mockResolvedValue({ cleared: 0, failed: 0 });
  });

  afterEach(() => jest.useRealTimers());

  describe('start', () => {
    it('schedules with the default interval when the task does not exist yet', async () => {
      mockTaskManagerStart.get.mockRejectedValueOnce(new Error('not found'));

      await makeTask().start();

      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          id: REBALANCE_SHARDS_TASK_ID,
          schedule: { interval: DEFAULT_REBALANCE_SCHEDULE },
        })
      );
      expect(mockTaskManagerStart.removeIfExists).not.toHaveBeenCalled();
      expect(mockTaskManagerStart.bulkEnable).toHaveBeenCalledWith(
        [REBALANCE_SHARDS_TASK_ID],
        false
      );
    });

    it('preserves a user-configured interval already on the task', async () => {
      mockTaskManagerStart.get.mockResolvedValueOnce({ schedule: { interval: '5m' } } as never);

      await makeTask().start();

      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({ schedule: { interval: '5m' } })
      );
    });
  });

  describe('runTask', () => {
    it('clears leftover agent pins and skips rebalance when the kill-switch is off', async () => {
      const getPrivateLocationsSpy = jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations');
      const getAgentInfo = jest.spyOn(getAgentInfoModule, 'getAgentInfo');
      mockClearShardConditions.mockResolvedValue({ cleared: 3, failed: 0 });

      const result = await run({ keep: 1, [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false });

      expect(mockClearShardConditions).toHaveBeenCalledTimes(1);
      expect(getPrivateLocationsSpy).not.toHaveBeenCalled();
      expect(getAgentInfo).not.toHaveBeenCalled();
      expect(mockRebalanceShards).not.toHaveBeenCalled();
      expect(result.state).toEqual({
        keep: 1,
        [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false,
        [REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY]: true,
        [REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]: 0,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('disabled; cleared 3 agent pin(s)')
      );
    });

    it('skips the Fleet drain on later disabled cycles once pins are cleared', async () => {
      const result = await run({
        keep: 1,
        [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false,
        [REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY]: true,
      });

      expect(mockClearShardConditions).not.toHaveBeenCalled();
      expect(mockRebalanceShards).not.toHaveBeenCalled();
      expect(result.state).toEqual({
        keep: 1,
        [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false,
        [REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY]: true,
      });
    });

    it('does not latch pinsCleared when some Fleet writes fail, so the next cycle retries', async () => {
      mockClearShardConditions.mockResolvedValue({ cleared: 2, failed: 1 });

      const result = await run({ [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false });

      expect(mockClearShardConditions).toHaveBeenCalledTimes(1);
      expect(result.state).toEqual({
        [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false,
        [REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]: 1,
      });
    });

    it('stops retrying the Fleet drain after MAX_PIN_CLEAR_ATTEMPTS failures', async () => {
      mockClearShardConditions.mockResolvedValue({ cleared: 0, failed: 1 });

      const lastRetry = await run({
        [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false,
        [REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]: MAX_PIN_CLEAR_ATTEMPTS - 1,
      });

      expect(mockClearShardConditions).toHaveBeenCalledTimes(1);
      expect(lastRetry.state).toEqual({
        [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false,
        [REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]: MAX_PIN_CLEAR_ATTEMPTS,
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('giving up'));

      mockClearShardConditions.mockClear();
      const exhausted = await run({
        [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false,
        [REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]: MAX_PIN_CLEAR_ATTEMPTS,
      });

      expect(mockClearShardConditions).not.toHaveBeenCalled();
      expect(exhausted.state).toEqual({
        [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false,
        [REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]: MAX_PIN_CLEAR_ATTEMPTS,
      });
    });

    it('counts a thrown drain as a failed attempt', async () => {
      mockClearShardConditions.mockRejectedValue(new Error('fleet boom'));

      const result = await run({ [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false });

      expect(result.state).toEqual({
        [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false,
        [REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]: 1,
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('fleet boom'));
    });

    it('does not latch pinsCleared when a mid-run PUT turns the switch back on', async () => {
      mockClearShardConditions.mockResolvedValue({ cleared: 1, failed: 0 });
      mockTaskManagerStart.get.mockResolvedValue({
        state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: true },
      } as never);

      const result = await run({ [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false });

      expect(mockClearShardConditions).toHaveBeenCalledTimes(1);
      expect(result.state).toEqual({
        [REBALANCE_SHARDS_ENABLED_STATE_KEY]: true,
        [REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY]: false,
        [REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]: 0,
      });
    });

    it('does not clobber a mid-run kill-switch PUT when returning state', async () => {
      mockTaskManagerStart.get.mockResolvedValue({
        state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false, extra: 1 },
      } as never);
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([]);

      const result = await run({ keep: 1 });

      expect(result.state).toEqual({
        [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false,
        extra: 1,
        [REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY]: false,
        [REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]: 0,
      });
    });

    it('early-exits and does not read agents when there are no scalable locations', async () => {
      jest
        .spyOn(getPrivateLocationsModule, 'getPrivateLocations')
        .mockResolvedValue([location({ isAgentSharding: false })]);
      const getAgentInfo = jest.spyOn(getAgentInfoModule, 'getAgentInfo');

      const result = await run({ foo: 1 });

      expect(getAgentInfo).not.toHaveBeenCalled();
      expect(mockRebalanceShards).not.toHaveBeenCalled();
      expect(result.state).toEqual({
        foo: 1,
        [REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY]: false,
        [REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]: 0,
      });
    });

    it('rebalances a healthy location, passing healthy/recovery agents and capacities', async () => {
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([location()]);
      jest.spyOn(getAgentInfoModule, 'getAgentInfo').mockResolvedValue(
        new Map([
          ['agent-1', agentInfo(NOW, 2048)],
          ['agent-2', agentInfo(NOW, null)],
        ])
      );
      mockRebalanceShards.mockResolvedValue({ total: 5, moved: 2 });

      // agent-1 has a long-standing healthy streak → recovery-eligible; agent-2
      // is freshly healthy this run → healthy but not yet recovery-eligible.
      const prior = { [healthySinceKey('ap-1', 'agent-1')]: NOW - RECOVERY_STABILITY_MS - 1 };
      const result = await run({ healthySince: prior });

      expect(mockRebalanceShards).toHaveBeenCalledWith({
        location: { id: 'loc-1', label: 'Location 1', agentPolicyId: 'ap-1' },
        healthyAgentIds: ['agent-1', 'agent-2'],
        recoveryAgentIds: ['agent-1'],
        capacities: new Map([['agent-1', 2048]]),
        signal: expect.any(AbortSignal),
      });
      // healthy streaks are persisted into the returned state for the next run
      expect(result.state.healthySince).toEqual({
        [healthySinceKey('ap-1', 'agent-1')]: NOW - RECOVERY_STABILITY_MS - 1,
        [healthySinceKey('ap-1', 'agent-2')]: NOW,
      });
      expect(result.state[REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY]).toBe(false);
      expect(result.state[REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]).toBe(0);
    });

    it('skips the data-plane liveness query when every agent is fresh', async () => {
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([location()]);
      jest
        .spyOn(getAgentInfoModule, 'getAgentInfo')
        .mockResolvedValue(new Map([['agent-1', agentInfo(NOW)]]));
      const getActive = jest.spyOn(getActiveAgentIdsModule, 'getRecentlyActiveAgentIds');

      await run();

      expect(getActive).not.toHaveBeenCalled();
      expect(mockRebalanceShards).toHaveBeenCalledTimes(1);
    });

    it('keeps a stale-check-in agent that the liveness query proves active', async () => {
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([location()]);
      jest
        .spyOn(getAgentInfoModule, 'getAgentInfo')
        .mockResolvedValue(new Map([['agent-1', agentInfo(NOW - STALE_CHECKIN_MS - 1)]]));
      const getActive = jest
        .spyOn(getActiveAgentIdsModule, 'getRecentlyActiveAgentIds')
        .mockResolvedValue(new Set(['agent-1']));

      await run();

      expect(getActive).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockRebalanceShards).toHaveBeenCalledWith(
        expect.objectContaining({ healthyAgentIds: ['agent-1'] })
      );
    });

    it('warns and skips the rebalance when a location has no healthy agents', async () => {
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([location()]);
      jest
        .spyOn(getAgentInfoModule, 'getAgentInfo')
        .mockResolvedValue(new Map([['agent-1', agentInfo(NOW - STALE_CHECKIN_MS - 1)]]));
      jest.spyOn(getActiveAgentIdsModule, 'getRecentlyActiveAgentIds').mockResolvedValue(new Set());

      await run();

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No healthy agents'));
      expect(mockRebalanceShards).not.toHaveBeenCalled();
    });

    it('isolates a failing location and still processes the others', async () => {
      jest
        .spyOn(getPrivateLocationsModule, 'getPrivateLocations')
        .mockResolvedValue([
          location({ id: 'loc-a', agentPolicyId: 'ap-a' }),
          location({ id: 'loc-b', agentPolicyId: 'ap-b' }),
        ]);
      jest
        .spyOn(getAgentInfoModule, 'getAgentInfo')
        .mockRejectedValueOnce(new Error('fleet boom'))
        .mockResolvedValueOnce(new Map([['agent-1', agentInfo(NOW)]]));

      await run();

      expect(mockRebalanceShards).toHaveBeenCalledTimes(1);
      expect(mockRebalanceShards).toHaveBeenCalledWith(
        expect.objectContaining({
          location: { id: 'loc-b', label: 'Location 1', agentPolicyId: 'ap-b' },
        })
      );
    });

    it('keeps processing later locations (and persists streaks) when rebalanceShards throws', async () => {
      jest
        .spyOn(getPrivateLocationsModule, 'getPrivateLocations')
        .mockResolvedValue([
          location({ id: 'loc-a', agentPolicyId: 'ap-a' }),
          location({ id: 'loc-b', agentPolicyId: 'ap-b' }),
        ]);
      jest
        .spyOn(getAgentInfoModule, 'getAgentInfo')
        .mockResolvedValueOnce(new Map([['agent-a', agentInfo(NOW)]]))
        .mockResolvedValueOnce(new Map([['agent-b', agentInfo(NOW)]]));
      // The first location's write fails; the second must still be rebalanced.
      mockRebalanceShards
        .mockRejectedValueOnce(new Error('bulkUpdate boom'))
        .mockResolvedValueOnce({ total: 1, moved: 1 });

      const result = await run();

      expect(mockRebalanceShards).toHaveBeenCalledTimes(2);
      expect(mockRebalanceShards).toHaveBeenLastCalledWith(
        expect.objectContaining({ healthyAgentIds: ['agent-b'] })
      );
      // Streaks for both locations survive — the failure is not propagated to the
      // outer catch (which would discard the whole run's accumulated state).
      expect(result.state.healthySince).toEqual({
        [healthySinceKey('ap-a', 'agent-a')]: NOW,
        [healthySinceKey('ap-b', 'agent-b')]: NOW,
      });
      expect(result.state[REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY]).toBe(false);
      expect(result.state[REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]).toBe(0);
    });

    it('does not throw when getPrivateLocations fails; returns the prior state', async () => {
      jest
        .spyOn(getPrivateLocationsModule, 'getPrivateLocations')
        .mockRejectedValue(new Error('so boom'));

      const result = await run({ keep: 1 });

      expect(mockLogger.error).toHaveBeenCalled();
      expect(result.state).toEqual({ keep: 1 });
    });

    it('throws without work when the task signal is already aborted', async () => {
      const abortController = new AbortController();
      abortController.abort();
      const getLocations = jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations');

      await expect(run({ keep: 1 }, abortController.signal)).rejects.toThrow();

      expect(getLocations).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('stops after the current location when the task is cancelled and does not treat abort as a location failure', async () => {
      const abortController = new AbortController();
      jest
        .spyOn(getPrivateLocationsModule, 'getPrivateLocations')
        .mockResolvedValue([
          location({ id: 'loc-a', agentPolicyId: 'ap-a' }),
          location({ id: 'loc-b', agentPolicyId: 'ap-b' }),
        ]);
      const getAgentInfo = jest
        .spyOn(getAgentInfoModule, 'getAgentInfo')
        .mockResolvedValue(new Map([['agent-1', agentInfo(NOW)]]));
      mockRebalanceShards.mockImplementation(async () => {
        abortController.abort();
        return { total: 0, moved: 0 };
      });

      await expect(run({ keep: 1 }, abortController.signal)).rejects.toThrow();

      expect(mockRebalanceShards).toHaveBeenCalledTimes(1);
      expect(getAgentInfo).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('passes the task signal into agent listing, the liveness query, and rebalance writes', async () => {
      const abortController = new AbortController();
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([location()]);
      const getAgentInfo = jest
        .spyOn(getAgentInfoModule, 'getAgentInfo')
        .mockResolvedValue(new Map([['agent-1', agentInfo(NOW - STALE_CHECKIN_MS - 1)]]));
      const getActive = jest
        .spyOn(getActiveAgentIdsModule, 'getRecentlyActiveAgentIds')
        .mockResolvedValue(new Set(['agent-1']));

      await run({}, abortController.signal);

      expect(getAgentInfo).toHaveBeenCalledWith(mockServerSetup, 'ap-1', abortController.signal);
      expect(getActive).toHaveBeenCalledWith(
        mockServerSetup,
        ['agent-1'],
        STALE_DATA_MS,
        NOW,
        abortController.signal
      );
      expect(mockRebalanceShards).toHaveBeenCalledWith(
        expect.objectContaining({ signal: abortController.signal })
      );
    });
  });

  describe('runRebalanceShardsTaskSoon', () => {
    it('asks task manager to run the task soon', async () => {
      await runRebalanceShardsTaskSoon({ server: mockServerSetup });
      expect(mockTaskManagerStart.runSoon).toHaveBeenCalledWith(REBALANCE_SHARDS_TASK_ID);
    });
  });
});
