/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { ConcreteTaskInstance, RunContext } from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { isRetryableError } from '@kbn/task-manager-plugin/server/task_running';
import type { SyntheticsServerSetup } from '../../types';
import {
  AGENT_POLICY_REVISION_BUMP_DELAY_MS,
  AGENT_POLICY_REVISION_BUMP_TASK_TYPE,
  bumpAgentPolicyRevision,
  getAgentPolicyRevisionBumpTaskId,
  registerAgentPolicyRevisionBumpTask,
  scheduleAgentPolicyRevisionBumps,
} from './agent_policy_revision_bump_task';

const NOW = new Date('2026-10-30T12:00:00.000Z');
const TASK_ID = getAgentPolicyRevisionBumpTaskId('policyId');

const makeServer = () => {
  const asScopedToNamespace = jest.fn((space: string) => ({ __space: space }));
  const getByIds = jest.fn().mockResolvedValue([{ id: 'policyId', space_ids: [DEFAULT_SPACE_ID] }]);
  const bumpRevision = jest.fn().mockResolvedValue(undefined);
  const taskManager = taskManagerMock.createStart();

  const server = {
    logger: loggerMock.create(),
    fleet: { agentPolicyService: { getByIds, bumpRevision } },
    coreStart: {
      savedObjects: {
        getUnsafeInternalClient: () => ({ asScopedToNamespace }),
        createInternalRepository: () => ({ __unscoped: true }),
      },
      elasticsearch: { client: { asInternalUser: { __es: true } } },
    },
    pluginsStart: { taskManager },
  } as unknown as SyntheticsServerSetup;

  return { server, getByIds, bumpRevision, asScopedToNamespace, taskManager };
};

const conflict = () => SavedObjectsErrorHelpers.createConflictError('task', TASK_ID);

const existingTask = (status: TaskStatus) => ({ id: TASK_ID, status } as ConcreteTaskInstance);

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('bumpAgentPolicyRevision', () => {
  it('looks the agent policy up across all spaces with an unscoped client', async () => {
    const { server, getByIds } = makeServer();

    await bumpAgentPolicyRevision(server, 'policyId');

    expect(getByIds).toHaveBeenCalledWith(
      { __unscoped: true },
      [{ id: 'policyId', spaceId: ALL_SPACES_ID }],
      expect.objectContaining({ ignoreMissing: true })
    );
  });

  it('bumps through a space the agent policy lives in', async () => {
    const { server, getByIds, bumpRevision } = makeServer();
    getByIds.mockResolvedValue([{ id: 'policyId', space_ids: ['team-x'] }]);

    await bumpAgentPolicyRevision(server, 'policyId');

    expect(bumpRevision).toHaveBeenCalledWith({ __space: 'team-x' }, { __es: true }, 'policyId', {
      asyncDeploy: true,
    });
  });

  it('bumps through the default space for an all-spaces agent policy', async () => {
    const { server, getByIds, bumpRevision } = makeServer();
    // `*` is not a writable namespace, so an all-spaces policy bumps via default.
    getByIds.mockResolvedValue([{ id: 'policyId', space_ids: [ALL_SPACES_ID] }]);

    await bumpAgentPolicyRevision(server, 'policyId');

    expect(bumpRevision).toHaveBeenCalledWith(
      { __space: DEFAULT_SPACE_ID },
      expect.anything(),
      'policyId',
      { asyncDeploy: true }
    );
  });

  it('skips a missing agent policy', async () => {
    const { server, getByIds, bumpRevision } = makeServer();
    getByIds.mockResolvedValue([]);

    await bumpAgentPolicyRevision(server, 'policyId');

    expect(bumpRevision).not.toHaveBeenCalled();
  });
});

describe('scheduleAgentPolicyRevisionBumps', () => {
  it('schedules one delayed task per agent policy, keyed on the policy id', async () => {
    const { server, taskManager, bumpRevision } = makeServer();

    await scheduleAgentPolicyRevisionBumps(server, ['policyId', 'policyId', 'otherPolicyId']);

    expect(taskManager.schedule).toHaveBeenCalledTimes(2);
    expect(taskManager.schedule).toHaveBeenCalledWith({
      id: TASK_ID,
      taskType: AGENT_POLICY_REVISION_BUMP_TASK_TYPE,
      params: { policyId: 'policyId' },
      state: {},
      runAt: new Date(NOW.getTime() + AGENT_POLICY_REVISION_BUMP_DELAY_MS),
    });
    expect(bumpRevision).not.toHaveBeenCalled();
  });

  it('runs right away when immediate', async () => {
    const { server, taskManager } = makeServer();

    await scheduleAgentPolicyRevisionBumps(server, ['policyId'], { immediate: true });

    expect(taskManager.schedule).toHaveBeenCalledWith(expect.objectContaining({ runAt: NOW }));
  });

  it.each([TaskStatus.Idle, TaskStatus.Claiming])(
    'joins a pending %s bump instead of bumping again',
    async (status) => {
      const { server, taskManager, bumpRevision } = makeServer();
      taskManager.schedule.mockRejectedValue(conflict());
      taskManager.get.mockResolvedValue(existingTask(status));

      await scheduleAgentPolicyRevisionBumps(server, ['policyId']);

      expect(taskManager.runSoon).not.toHaveBeenCalled();
      expect(bumpRevision).not.toHaveBeenCalled();
    }
  );

  it('pulls a pending bump forward when immediate', async () => {
    const { server, taskManager, bumpRevision } = makeServer();
    taskManager.schedule.mockRejectedValue(conflict());
    taskManager.get.mockResolvedValue(existingTask(TaskStatus.Idle));

    await scheduleAgentPolicyRevisionBumps(server, ['policyId'], { immediate: true });

    expect(taskManager.runSoon).toHaveBeenCalledWith(TASK_ID);
    expect(bumpRevision).not.toHaveBeenCalled();
  });

  it('bumps directly when a running bump may already have read the agent policy', async () => {
    const { server, taskManager, bumpRevision } = makeServer();
    taskManager.schedule.mockRejectedValue(conflict());
    taskManager.get.mockResolvedValue(existingTask(TaskStatus.Running));

    await scheduleAgentPolicyRevisionBumps(server, ['policyId']);

    expect(bumpRevision).toHaveBeenCalledTimes(1);
  });

  it('schedules again when the pending bump finished in between', async () => {
    const { server, taskManager, bumpRevision } = makeServer();
    taskManager.schedule.mockRejectedValueOnce(conflict());
    taskManager.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError('task', TASK_ID)
    );

    await scheduleAgentPolicyRevisionBumps(server, ['policyId']);

    expect(taskManager.schedule).toHaveBeenCalledTimes(2);
    expect(bumpRevision).not.toHaveBeenCalled();
  });

  it('bumps directly when Task Manager cannot schedule the bump', async () => {
    const { server, taskManager, bumpRevision } = makeServer();
    taskManager.schedule.mockRejectedValue(new Error('task index unavailable'));

    await scheduleAgentPolicyRevisionBumps(server, ['policyId']);

    expect(bumpRevision).toHaveBeenCalledTimes(1);
    expect(server.logger.warn).toHaveBeenCalled();
  });
});

describe('agent policy revision bump task', () => {
  const runTask = async (server: SyntheticsServerSetup, signal = new AbortController().signal) => {
    const taskManagerSetup = taskManagerMock.createSetup();
    registerAgentPolicyRevisionBumpTask(server, taskManagerSetup);
    const [[definitions]] = taskManagerSetup.registerTaskDefinitions.mock.calls;
    const { createTaskRunner } = definitions[AGENT_POLICY_REVISION_BUMP_TASK_TYPE];

    return createTaskRunner({
      taskInstance: { params: { policyId: 'policyId' } },
      signal,
    } as unknown as RunContext).run();
  };

  it('bumps the agent policy revision', async () => {
    const { server, bumpRevision } = makeServer();

    await expect(runTask(server)).resolves.toEqual({ state: {} });

    expect(bumpRevision).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'policyId', {
      asyncDeploy: true,
    });
  });

  it('retries a version conflict shortly', async () => {
    const { server, bumpRevision } = makeServer();
    bumpRevision.mockRejectedValue(SavedObjectsErrorHelpers.createConflictError('x', 'y'));

    const error = await runTask(server).catch((e) => e);

    expect(isRetryableError(error)).toEqual(new Date(NOW.getTime() + 1_000));
  });

  it('retries other failures with the default backoff', async () => {
    const { server, bumpRevision } = makeServer();
    bumpRevision.mockRejectedValue(new Error('fleet down'));

    const error = await runTask(server).catch((e) => e);

    expect(isRetryableError(error)).toBe(true);
  });

  it('retries instead of dropping the bump when aborted', async () => {
    const { server, bumpRevision } = makeServer();
    const controller = new AbortController();
    controller.abort();

    const error = await runTask(server, controller.signal).catch((e) => e);

    expect(isRetryableError(error)).toBe(true);
    expect(bumpRevision).not.toHaveBeenCalled();
  });
});
