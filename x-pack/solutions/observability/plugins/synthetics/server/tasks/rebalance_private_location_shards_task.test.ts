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
  runRebalanceShardsTaskSoon,
} from './rebalance_private_location_shards_task';
import type { SyntheticsServerSetup } from '../types';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import * as getPrivateLocationsModule from '../synthetics_service/get_private_locations';
import * as getAgentInfoModule from '../synthetics_service/private_location/get_agent_info';
import type { AgentInfo } from '../synthetics_service/private_location/get_agent_info';
import {
  RECOVERY_STABILITY_MS,
  STALE_CHECKIN_MS,
  healthySinceKey,
} from '../synthetics_service/private_location/plan_rebalance';

const NOW = 1_700_000_000_000;

const mockTaskManagerStart = taskManagerMock.createStart();
const mockSoRepo = savedObjectsRepositoryMock.create();
const mockLogger = loggerMock.create();
const mockRebalanceShards = jest.fn().mockResolvedValue({ total: 0, moved: 0 });

const mockSyntheticsMonitorClient = {
  privateLocationAPI: { rebalanceShards: mockRebalanceShards },
} as unknown as SyntheticsMonitorClient;

const coreStart = coreMock.createStart() as CoreStart;
(coreStart.savedObjects.createInternalRepository as jest.Mock).mockReturnValue(mockSoRepo);

const mockServerSetup = {
  coreStart,
  logger: mockLogger,
  config: { rebalancePrivateLocationShardsTaskEnabled: true },
  pluginsStart: { taskManager: mockTaskManagerStart },
} as unknown as SyntheticsServerSetup;

// Config fields are readonly (config-schema TypeOf), so toggle the kill-switch
// by replacing the whole config object rather than mutating the property.
const setTaskEnabled = (enabled: boolean) => {
  mockServerSetup.config = {
    rebalancePrivateLocationShardsTaskEnabled: enabled,
  } as SyntheticsServerSetup['config'];
};

const location = (over: Partial<Record<string, unknown>> = {}) =>
  ({
    id: 'loc-1',
    label: 'Location 1',
    agentPolicyId: 'ap-1',
    isAgentSharding: true,
    ...over,
  } as unknown as Awaited<ReturnType<typeof getPrivateLocationsModule.getPrivateLocations>>[number]);

const agentInfo = (lastCheckin: number, memoryMib: number | null = null): AgentInfo => ({
  lastCheckin,
  memoryMib,
});

const taskInstance = (state: Record<string, unknown> = {}): ConcreteTaskInstance =>
  ({ id: REBALANCE_SHARDS_TASK_ID, state, params: {} } as unknown as ConcreteTaskInstance);

const makeTask = () =>
  new RebalancePrivateLocationShardsTask(mockServerSetup, mockSyntheticsMonitorClient);

describe('RebalancePrivateLocationShardsTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    setTaskEnabled(true);
    mockRebalanceShards.mockResolvedValue({ total: 0, moved: 0 });
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
    });

    it('preserves a user-configured interval already on the task', async () => {
      mockTaskManagerStart.get.mockResolvedValueOnce({ schedule: { interval: '5m' } } as never);

      await makeTask().start();

      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({ schedule: { interval: '5m' } })
      );
    });

    it('unschedules the task (removeIfExists) when disabled by config', async () => {
      setTaskEnabled(false);

      await makeTask().start();

      expect(mockTaskManagerStart.removeIfExists).toHaveBeenCalledWith(REBALANCE_SHARDS_TASK_ID);
      expect(mockTaskManagerStart.ensureScheduled).not.toHaveBeenCalled();
    });
  });

  describe('runTask', () => {
    it('early-exits and does not read agents when there are no scalable locations', async () => {
      jest
        .spyOn(getPrivateLocationsModule, 'getPrivateLocations')
        .mockResolvedValue([location({ isAgentSharding: false })]);
      const getAgentInfo = jest.spyOn(getAgentInfoModule, 'getAgentInfo');

      const result = await makeTask().runTask({ taskInstance: taskInstance({ foo: 1 }) });

      expect(getAgentInfo).not.toHaveBeenCalled();
      expect(mockRebalanceShards).not.toHaveBeenCalled();
      expect(result.state).toEqual({ foo: 1 });
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
      const result = await makeTask().runTask({
        taskInstance: taskInstance({ healthySince: prior }),
      });

      expect(mockRebalanceShards).toHaveBeenCalledWith({
        location: { id: 'loc-1', label: 'Location 1' },
        healthyAgentIds: ['agent-1', 'agent-2'],
        recoveryAgentIds: ['agent-1'],
        capacities: new Map([['agent-1', 2048]]),
      });
      // healthy streaks are persisted into the returned state for the next run
      expect(result.state.healthySince).toEqual({
        [healthySinceKey('ap-1', 'agent-1')]: NOW - RECOVERY_STABILITY_MS - 1,
        [healthySinceKey('ap-1', 'agent-2')]: NOW,
      });
    });

    it('warns and skips the rebalance when a location has no healthy agents', async () => {
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([location()]);
      jest
        .spyOn(getAgentInfoModule, 'getAgentInfo')
        .mockResolvedValue(new Map([['agent-1', agentInfo(NOW - STALE_CHECKIN_MS - 1)]]));

      await makeTask().runTask({ taskInstance: taskInstance() });

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

      await makeTask().runTask({ taskInstance: taskInstance() });

      expect(mockRebalanceShards).toHaveBeenCalledTimes(1);
      expect(mockRebalanceShards).toHaveBeenCalledWith(
        expect.objectContaining({ location: { id: 'loc-b', label: 'Location 1' } })
      );
    });

    it('does not throw when getPrivateLocations fails; returns the prior state', async () => {
      jest
        .spyOn(getPrivateLocationsModule, 'getPrivateLocations')
        .mockRejectedValue(new Error('so boom'));

      const result = await makeTask().runTask({ taskInstance: taskInstance({ keep: 1 }) });

      expect(mockLogger.error).toHaveBeenCalled();
      expect(result.state).toEqual({ keep: 1 });
    });
  });

  describe('runRebalanceShardsTaskSoon', () => {
    it('asks task manager to run the task soon', async () => {
      await runRebalanceShardsTaskSoon({ server: mockServerSetup });
      expect(mockTaskManagerStart.runSoon).toHaveBeenCalledWith(REBALANCE_SHARDS_TASK_ID);
    });
  });
});
