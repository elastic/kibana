/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';

import { registerResilienceTask } from './resilience_task';
import { createAssetManagerClient } from './factories';
import { ENTITY_STORE_STATUS } from '../domain/constants';
import type { EntityStoreCoreSetup } from '../types';

jest.mock('./factories');
// wrapTaskRun adds a tracing span around the run callback; here it just invokes it.
jest.mock('../telemetry/traces', () => ({
  wrapTaskRun: jest.fn(({ run }: { run: () => Promise<unknown> }) => run()),
}));
jest.mock('../telemetry/events', () => ({
  createReportEvent: jest.fn().mockReturnValue({ reportEvent: jest.fn() }),
}));

const createAssetManagerClientMock = createAssetManagerClient as jest.Mock;

const NAMESPACE = 'default';

describe('resilience task', () => {
  let logger: MockedLogger;
  let getStatus: jest.Mock;
  let reinstallSharedAssetsIfMissing: jest.Mock;

  const runResilienceTask = async ({
    namespace = NAMESPACE,
    hasFakeRequest = true,
  }: { namespace?: string; hasFakeRequest?: boolean } = {}) => {
    const taskManager = {
      registerTaskDefinitions: jest.fn(),
    } as unknown as TaskManagerSetupContract;
    const core = { analytics: {} } as unknown as EntityStoreCoreSetup;

    registerResilienceTask({ taskManager, logger, core });

    const [definitions] = (taskManager.registerTaskDefinitions as jest.Mock).mock.calls[0];
    const [taskType] = Object.keys(definitions);
    const runner = definitions[taskType].createTaskRunner({
      taskInstance: { id: `resilience:${namespace}`, state: { namespace } },
      fakeRequest: hasFakeRequest ? {} : undefined,
      signal: new AbortController().signal,
    });
    return runner.run();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggerMock.create();
    getStatus = jest.fn().mockResolvedValue({ status: ENTITY_STORE_STATUS.NOT_INSTALLED });
    reinstallSharedAssetsIfMissing = jest.fn().mockResolvedValue(false);

    createAssetManagerClientMock.mockResolvedValue({
      assetManagerClient: { getStatus, reinstallSharedAssetsIfMissing },
    });
  });

  it('exits early and does not call reinstall when entity store is not installed', async () => {
    getStatus.mockResolvedValue({ status: ENTITY_STORE_STATUS.NOT_INSTALLED });

    const result = await runResilienceTask();

    expect(reinstallSharedAssetsIfMissing).not.toHaveBeenCalled();
    expect(result).toEqual({ state: { namespace: NAMESPACE } });
  });

  it('calls reinstallSharedAssetsIfMissing when entity store is installed', async () => {
    getStatus.mockResolvedValue({ status: ENTITY_STORE_STATUS.RUNNING });

    const result = await runResilienceTask();

    expect(reinstallSharedAssetsIfMissing).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ state: { namespace: NAMESPACE } });
  });

  it('calls reinstallSharedAssetsIfMissing when entity store is stopped', async () => {
    getStatus.mockResolvedValue({ status: ENTITY_STORE_STATUS.STOPPED });

    await runResilienceTask();

    expect(reinstallSharedAssetsIfMissing).toHaveBeenCalledTimes(1);
  });

  it('returns state and logs error when fakeRequest is missing', async () => {
    const result = await runResilienceTask({ hasFakeRequest: false });

    expect(reinstallSharedAssetsIfMissing).not.toHaveBeenCalled();
    expect(result).toEqual({ state: { namespace: NAMESPACE } });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('No fake request found'));
  });

  it('throws when namespace is missing from task state', async () => {
    const taskManager = {
      registerTaskDefinitions: jest.fn(),
    } as unknown as TaskManagerSetupContract;
    const core = { analytics: {} } as unknown as EntityStoreCoreSetup;

    registerResilienceTask({ taskManager, logger, core });

    const [definitions] = (taskManager.registerTaskDefinitions as jest.Mock).mock.calls[0];
    const [taskType] = Object.keys(definitions);
    const runner = definitions[taskType].createTaskRunner({
      taskInstance: { id: 'resilience:missing', state: {} },
      fakeRequest: {},
      signal: new AbortController().signal,
    });

    await expect(runner.run()).rejects.toThrow('Namespace is required');
  });
});
