/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { loggingSystemMock } from '@kbn/core/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { NativeVulnScannerPlugin } from './plugin';
import type { NativeVulnScannerSetupDeps, NativeVulnScannerStartDeps } from './types';
import { registerRoutes } from './routes/register_routes';
import { ensureFindingsIndex } from './lib/findings';
import { OSQUERY_PACK_SO_TYPE } from './lib/inventory';
import { ensureSummaryIndex } from './lib/summary';
import { installWorkflows } from './managed_workflows/install';
import { registerOwner } from './managed_workflows/register_owner';
import { registerNativeVulnScannerSteps } from './workflows/step_types';

jest.mock('./lib/findings', () => ({ ensureFindingsIndex: jest.fn() }));
jest.mock('./lib/summary', () => ({ ensureSummaryIndex: jest.fn() }));
jest.mock('./managed_workflows/install', () => ({ installWorkflows: jest.fn() }));
jest.mock('./managed_workflows/register_owner', () => ({ registerOwner: jest.fn() }));
jest.mock('./workflows/step_types', () => ({ registerNativeVulnScannerSteps: jest.fn() }));
jest.mock('./routes/register_routes', () => ({ registerRoutes: jest.fn() }));

const registerRoutesMock = registerRoutes as jest.MockedFunction<typeof registerRoutes>;
const workflowsManagement = {
  management: {},
} as unknown as NativeVulnScannerSetupDeps['workflowsManagement'];

const ensureFindingsMock = ensureFindingsIndex as jest.MockedFunction<typeof ensureFindingsIndex>;
const ensureSummaryMock = ensureSummaryIndex as jest.MockedFunction<typeof ensureSummaryIndex>;
const installMock = installWorkflows as jest.MockedFunction<typeof installWorkflows>;
const registerOwnerMock = registerOwner as jest.MockedFunction<typeof registerOwner>;
const registerStepsMock = registerNativeVulnScannerSteps as jest.MockedFunction<
  typeof registerNativeVulnScannerSteps
>;

const startPlugin = async (enabled: boolean) => {
  const context = coreMock.createPluginInitializerContext({ enabled });
  const plugin = new NativeVulnScannerPlugin(context);
  const coreSetup = coreMock.createSetup();
  const workflowsSetup = workflowsExtensionsMock.createSetup();
  plugin.setup(coreSetup, { workflowsExtensions: workflowsSetup, workflowsManagement });
  const core = coreMock.createStart();
  const workflowsStart = workflowsExtensionsMock.createStart();
  const licensing = licensingMock.createStart();
  const fleet = {} as NativeVulnScannerStartDeps['fleet'];
  coreSetup.getStartServices.mockResolvedValue([
    core,
    { workflowsExtensions: workflowsStart, licensing, fleet },
    {},
  ]);
  plugin.start(core, { workflowsExtensions: workflowsStart, licensing });
  await new Promise(process.nextTick);
  return {
    coreSetup,
    licensing,
    fleet,
    core,
    workflowsSetup,
    workflowsStart,
    logger: context.logger.get() as ReturnType<typeof loggingSystemMock.createLogger>,
  };
};

describe('NativeVulnScannerPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ensureFindingsMock.mockResolvedValue();
    ensureSummaryMock.mockResolvedValue();
    installMock.mockResolvedValue({ failedIds: [] });
  });

  it('sets up both indices as the internal user when enabled', async () => {
    const { core } = await startPlugin(true);
    expect(ensureFindingsMock).toHaveBeenCalledWith(core.elasticsearch.client.asInternalUser);
    expect(ensureSummaryMock).toHaveBeenCalledWith(core.elasticsearch.client.asInternalUser);
  });

  it('registers the owner and the steps at setup when enabled', async () => {
    const { workflowsSetup } = await startPlugin(true);
    expect(registerOwnerMock).toHaveBeenCalledWith({ workflowsExtensions: workflowsSetup });
    expect(registerStepsMock).toHaveBeenCalledWith(workflowsSetup, expect.any(Object));
  });

  it('installs the workflow once at start, after the indices exist', async () => {
    const order: string[] = [];
    ensureFindingsMock.mockImplementation(async () => {
      order.push('findings');
    });
    ensureSummaryMock.mockImplementation(async () => {
      order.push('summary');
    });
    installMock.mockImplementation(async () => {
      order.push('install');
      return { failedIds: [] };
    });

    const { workflowsStart } = await startPlugin(true);

    expect(installMock).toHaveBeenCalledTimes(1);
    expect(installMock).toHaveBeenCalledWith(
      expect.objectContaining({ workflowsExtensions: workflowsStart })
    );
    expect(order[order.length - 1]).toBe('install');
    expect(order).toEqual(expect.arrayContaining(['findings', 'summary']));
  });

  it('builds scan dependencies from the internal user and an osquery pack repository', async () => {
    const { coreSetup } = await startPlugin(true);
    const [coreStart] = await coreSetup.getStartServices();
    const { getScanDeps } = registerStepsMock.mock.calls[0][1];

    const deps = await getScanDeps();

    expect(deps.es).toBe(coreStart.elasticsearch.client.asInternalUser);
    const { createInternalRepository } = coreStart.savedObjects as jest.Mocked<
      typeof coreStart.savedObjects
    >;
    expect(createInternalRepository).toHaveBeenCalledWith([OSQUERY_PACK_SO_TYPE]);
    expect(deps.packRepository).toBe(createInternalRepository.mock.results[0].value);
  });

  it('reads the licence from the licensing start contract', async () => {
    const { licensing } = await startPlugin(true);
    const current = licenseMock.createLicense({ license: { type: 'enterprise' } });
    licensing.getLicense.mockResolvedValue(current);
    const { getLicense } = registerStepsMock.mock.calls[0][1];

    expect(await getLicense()).toBe(current);
    expect(licensing.getLicense).toHaveBeenCalledTimes(1);
  });

  it('registers the onboarding routes with lazily resolved services when enabled', async () => {
    const { coreSetup, core, fleet } = await startPlugin(true);
    expect(registerRoutesMock).toHaveBeenCalledTimes(1);
    expect(coreSetup.http.createRouter).toHaveBeenCalled();
    const { getServices } = registerRoutesMock.mock.calls[0][0];

    const services = await getServices();

    expect(services.fleet).toBe(fleet);
    expect(services.workflows).toBe(workflowsManagement.management);
    expect(services.es).toBe(core.elasticsearch.client.asInternalUser);
    expect(core.savedObjects.createInternalRepository).toHaveBeenCalledWith([OSQUERY_PACK_SO_TYPE]);
  });

  it('gates the routes on the licensing start contract', async () => {
    const { licensing } = await startPlugin(true);
    const current = licenseMock.createLicense({ license: { type: 'enterprise' } });
    licensing.getLicense.mockResolvedValue(current);
    const { getLicense } = registerRoutesMock.mock.calls[0][0];
    expect(await getLicense()).toBe(current);
  });

  it('touches nothing when disabled', async () => {
    await startPlugin(false);
    expect(registerRoutesMock).not.toHaveBeenCalled();
    expect(registerOwnerMock).not.toHaveBeenCalled();
    expect(registerStepsMock).not.toHaveBeenCalled();
    expect(ensureFindingsMock).not.toHaveBeenCalled();
    expect(ensureSummaryMock).not.toHaveBeenCalled();
    expect(installMock).not.toHaveBeenCalled();
  });

  it('logs instead of failing start when the findings index setup fails', async () => {
    ensureFindingsMock.mockRejectedValue(new Error('boom'));
    const { logger } = await startPlugin(true);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to set up the vulnerability findings index: boom')
    );
  });

  it('logs instead of failing start when the summary index setup fails', async () => {
    ensureSummaryMock.mockRejectedValue(new Error('denied'));
    const { logger } = await startPlugin(true);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('denied'));
  });

  it('logs instead of failing start when the install throws', async () => {
    installMock.mockRejectedValue(new Error('no workflows'));
    const { logger } = await startPlugin(true);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('no workflows'));
  });
});
