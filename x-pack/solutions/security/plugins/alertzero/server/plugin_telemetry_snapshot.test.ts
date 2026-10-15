/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { AlertZeroConfig } from './config';
import { initializeManagedWorkflows } from './managed_workflows/initialize_managed_workflows';
import { AlertZeroPlugin } from './plugin';
import {
  TELEMETRY_SNAPSHOT_TASK_ID,
  TELEMETRY_SNAPSHOT_TASK_TYPE,
} from './tasks/telemetry_snapshot';

jest.mock('./managed_workflows/register_owner', () => ({
  registerOwner: jest.fn(),
}));

jest.mock('./inference_features', () => ({
  registerAlertZeroInferenceFeatures: jest.fn(),
}));

jest.mock('./managed_workflows/initialize_managed_workflows', () => ({
  initializeManagedWorkflows: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./agent', () => ({
  agentType: { id: 'mock-alertzero-type', baseConfiguration: {} },
  ensureAgent: jest.fn().mockResolvedValue(undefined),
  ensureAgentSafe: jest.fn().mockResolvedValue(undefined),
  registerAgentType: jest.fn(),
}));

jest.mock('./routes/register_routes', () => ({
  registerRoutes: jest.fn(),
}));

const createPlugin = (enabled: boolean) =>
  new AlertZeroPlugin({
    config: { get: (): AlertZeroConfig => ({ enabled }) },
    env: { packageInfo: { buildFlavor: 'traditional' } },
    logger: { get: () => loggerMock.create() },
  } as unknown as ConstructorParameters<typeof AlertZeroPlugin>[0]);

const setupPlugin = (
  plugin: AlertZeroPlugin,
  taskManager: object = taskManagerMock.createSetup()
) =>
  plugin.setup(
    coreMock.createSetup() as never,
    {
      agentBuilder: {
        attachments: { registerType: jest.fn() },
        conversations: { enableUpdatedTrigger: jest.fn() },
        tools: { register: jest.fn() },
        skills: { register: jest.fn() },
      },
      agenticInvestigations: {},
      features: { registerKibanaFeature: jest.fn() },
      proposals: {},
      taskManager,
      workflowsExtensions: {
        registerManagedWorkflowOwner: jest.fn(),
        registerStepDefinition: jest.fn(),
      },
      workflowsManagement: { management: {} },
    } as never
  );

/** AlertZero starts only with Kibana service accounts on, so tests turn them on by default. */
const createCoreStart = (serviceAccountsEnabled: boolean) => {
  const coreStart = coreMock.createStart();
  jest
    .spyOn(coreStart.security.serviceAccounts, 'isEnabled')
    .mockReturnValue(serviceAccountsEnabled);
  return coreStart;
};

const startPlugin = (
  plugin: AlertZeroPlugin,
  taskManager: object = taskManagerMock.createStart(),
  serviceAccountsEnabled = true,
  {
    coreStart = createCoreStart(serviceAccountsEnabled),
    withAgentBuilder = true,
  }: { coreStart?: ReturnType<typeof createCoreStart>; withAgentBuilder?: boolean } = {}
) =>
  plugin.start(coreStart, {
    agentBuilder: withAgentBuilder ? { agents: { ensure: jest.fn() } } : undefined,
    agenticInvestigations: { getImpactClient: jest.fn() },
    proposals: { getProposalsService: jest.fn().mockReturnValue({}) },
    spaces: undefined,
    taskManager,
    workflowsExtensions: { initManagedWorkflowsClient: jest.fn() },
  } as never);

describe('AlertZeroPlugin telemetry snapshot task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when xpack.alertzero.enabled is false', () => {
    it('neither registers nor schedules the snapshot task', () => {
      const plugin = createPlugin(false);
      const taskManagerSetup = taskManagerMock.createSetup();
      const taskManagerStart = taskManagerMock.createStart();

      setupPlugin(plugin, taskManagerSetup);
      startPlugin(plugin, taskManagerStart);

      expect(taskManagerSetup.registerTaskDefinitions).not.toHaveBeenCalled();
      expect(taskManagerStart.ensureScheduled).not.toHaveBeenCalled();
    });
  });

  describe('when xpack.alertzero.enabled is true', () => {
    it('registers the snapshot task type during setup', () => {
      const taskManagerSetup = taskManagerMock.createSetup();

      setupPlugin(createPlugin(true), taskManagerSetup);

      expect(taskManagerSetup.registerTaskDefinitions).toHaveBeenCalledTimes(1);
      expect(Object.keys(taskManagerSetup.registerTaskDefinitions.mock.calls[0][0])).toEqual([
        TELEMETRY_SNAPSHOT_TASK_TYPE,
      ]);
    });

    it('schedules the daily snapshot during start', () => {
      const plugin = createPlugin(true);
      const taskManagerStart = taskManagerMock.createStart();
      setupPlugin(plugin, taskManagerMock.createSetup());

      startPlugin(plugin, taskManagerStart);

      expect(taskManagerStart.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          id: TELEMETRY_SNAPSHOT_TASK_ID,
          taskType: TELEMETRY_SNAPSHOT_TASK_TYPE,
        })
      );
    });

    it('schedules the daily snapshot while service accounts are turned off', () => {
      const plugin = createPlugin(true);
      const taskManagerStart = taskManagerMock.createStart();
      setupPlugin(plugin, taskManagerMock.createSetup());

      startPlugin(plugin, taskManagerStart, false);

      expect(taskManagerStart.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          id: TELEMETRY_SNAPSHOT_TASK_ID,
          taskType: TELEMETRY_SNAPSHOT_TASK_TYPE,
        })
      );
    });

    it('still starts no Workers while service accounts are turned off', () => {
      const plugin = createPlugin(true);
      setupPlugin(plugin, taskManagerMock.createSetup());

      startPlugin(plugin, taskManagerMock.createStart(), false);

      expect(initializeManagedWorkflows).not.toHaveBeenCalled();
    });

    it('follows the Attack Discovery Workflows flag from start until stop', () => {
      const plugin = createPlugin(true);
      const flag$ = new BehaviorSubject(true);
      const coreStart = createCoreStart(true);
      coreStart.featureFlags.getBooleanValue$.mockReturnValue(flag$);
      setupPlugin(plugin, taskManagerMock.createSetup());

      // Without the plugins AlertZero needs, the snapshot task is still registered.
      startPlugin(plugin, taskManagerMock.createStart(), true, {
        coreStart,
        withAgentBuilder: false,
      });

      expect(coreStart.featureFlags.getBooleanValue$).toHaveBeenCalledWith(
        'securitySolution.attackDiscoveryWorkflowsEnabled',
        true
      );
      expect(flag$.observed).toBe(true);

      plugin.stop();

      expect(flag$.observed).toBe(false);
    });

    it('does not schedule the daily snapshot without the plugins AlertZero needs', () => {
      const plugin = createPlugin(true);
      const taskManagerStart = taskManagerMock.createStart();
      setupPlugin(plugin, taskManagerMock.createSetup());

      startPlugin(plugin, taskManagerStart, true, { withAgentBuilder: false });

      expect(taskManagerStart.ensureScheduled).not.toHaveBeenCalled();
    });
  });
});
