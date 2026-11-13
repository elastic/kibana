/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { loggingSystemMock } from '@kbn/core/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { NativeVulnScannerPlugin } from './plugin';
import { ensureFindingsIndex } from './lib/findings';
import { OSQUERY_PACK_SO_TYPE } from './lib/inventory';
import { registerScanTask, scheduleScanTask } from './tasks/scan_task';

jest.mock('./lib/findings', () => ({ ensureFindingsIndex: jest.fn() }));
jest.mock('./tasks/scan_task', () => ({
  registerScanTask: jest.fn(),
  scheduleScanTask: jest.fn(),
}));

const ensureMock = ensureFindingsIndex as jest.MockedFunction<typeof ensureFindingsIndex>;
const registerMock = registerScanTask as jest.MockedFunction<typeof registerScanTask>;
const scheduleMock = scheduleScanTask as jest.MockedFunction<typeof scheduleScanTask>;

const startPlugin = async (enabled: boolean) => {
  const context = coreMock.createPluginInitializerContext({ enabled });
  const plugin = new NativeVulnScannerPlugin(context);
  const coreSetup = coreMock.createSetup();
  const taskManagerSetup = taskManagerMock.createSetup();
  plugin.setup(coreSetup, { taskManager: taskManagerSetup });
  const core = coreMock.createStart();
  const taskManagerStart = taskManagerMock.createStart();
  plugin.start(core, { taskManager: taskManagerStart });
  await new Promise(process.nextTick);
  return {
    coreSetup,
    core,
    taskManagerSetup,
    taskManagerStart,
    logger: context.logger.get() as ReturnType<typeof loggingSystemMock.createLogger>,
  };
};

describe('NativeVulnScannerPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ensureMock.mockResolvedValue();
    scheduleMock.mockResolvedValue();
  });

  it('sets up the findings index as the internal user when enabled', async () => {
    const { core } = await startPlugin(true);
    expect(ensureMock).toHaveBeenCalledWith(core.elasticsearch.client.asInternalUser);
  });

  it('registers and schedules the scan task when enabled', async () => {
    const { taskManagerSetup, taskManagerStart } = await startPlugin(true);
    expect(registerMock).toHaveBeenCalledWith(taskManagerSetup, expect.any(Function));
    expect(scheduleMock).toHaveBeenCalledWith(taskManagerStart);
  });

  it('builds scan dependencies from the internal user and an osquery pack repository', async () => {
    const { coreSetup } = await startPlugin(true);
    const [coreStart] = await coreSetup.getStartServices();
    const getDeps = registerMock.mock.calls[0][1];

    const deps = await getDeps();

    expect(deps.es).toBe(coreStart.elasticsearch.client.asInternalUser);
    const { createInternalRepository } = coreStart.savedObjects as jest.Mocked<
      typeof coreStart.savedObjects
    >;
    expect(createInternalRepository).toHaveBeenCalledWith([OSQUERY_PACK_SO_TYPE]);
    expect(deps.packRepository).toBe(createInternalRepository.mock.results[0].value);
  });

  it('touches nothing when disabled', async () => {
    await startPlugin(false);
    expect(ensureMock).not.toHaveBeenCalled();
    expect(registerMock).not.toHaveBeenCalled();
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('logs instead of failing start when the index setup fails', async () => {
    ensureMock.mockRejectedValue(new Error('boom'));
    const { logger } = await startPlugin(true);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('logs instead of failing start when scheduling fails', async () => {
    scheduleMock.mockRejectedValue(new Error('no task store'));
    const { logger } = await startPlugin(true);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('no task store'));
  });
});
