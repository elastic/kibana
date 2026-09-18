/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ALERT_ANALYSIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { installSecurityManagedWorkflowsAndMarkReady } from './security_managed_workflows';
import * as threatIntelInstall from './threat_intel_workflow/install';
import * as alertAnalysisInstall from './alert_analysis_workflow/install';
import * as enumerate from './lib/enumerate_space_ids';

jest.mock('./threat_intel_workflow/install');
jest.mock('./alert_analysis_workflow/install');
jest.mock('./lib/enumerate_space_ids');

describe('installSecurityManagedWorkflowsAndMarkReady', () => {
  const createManagedClient = () => ({
    install: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
    ready: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue('mock-execution-id'),
    getInstalledWorkflowState: jest.fn().mockResolvedValue(null),
    listInstalledWorkflowStates: jest.fn().mockResolvedValue([]),
    getWorkflowStatus: jest.fn().mockResolvedValue({
      status: 'intact',
      workflowId: SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
      definitionId: SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
      spaceId: 'default',
      installed: true,
      enabled: true,
      valid: true,
      managedBy: 'securitySolution',
      storedVersion: 1,
      registryVersion: 1,
      storedHash: 'mock-hash',
      registryHash: 'mock-hash',
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (enumerate.enumerateSpaceIds as jest.Mock).mockResolvedValue(['default']);
    (alertAnalysisInstall.installSecurityAlertAnalysisWorkflow as jest.Mock).mockResolvedValue(
      undefined
    );
    (threatIntelInstall.installThreatIntelManagedWorkflows as jest.Mock).mockResolvedValue(
      undefined
    );
    (threatIntelInstall.uninstallThreatIntelManagedWorkflows as jest.Mock).mockResolvedValue(
      undefined
    );
  });

  it('calls ready exactly once after alert analysis and threat intel install when the flag is on', async () => {
    const managed = createManagedClient();
    const order: string[] = [];
    managed.ready.mockImplementation(async () => {
      order.push('ready');
    });
    (alertAnalysisInstall.installSecurityAlertAnalysisWorkflow as jest.Mock).mockImplementation(
      async () => {
        order.push('alert');
      }
    );
    (threatIntelInstall.installThreatIntelManagedWorkflows as jest.Mock).mockImplementation(
      async () => {
        order.push('ti');
      }
    );

    const workflowsExtensions = workflowsExtensionsMock.createStart();
    workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managed);

    await installSecurityManagedWorkflowsAndMarkReady({
      workflowsExtensions,
      logger: loggerMock.create(),
      threatIntelSupplyEnabled: true,
      bootstrapReady: Promise.resolve(),
      core: coreMock.createStart(),
    });

    expect(order).toEqual(['alert', 'ti', 'ready']);
    expect(managed.ready).toHaveBeenCalledTimes(1);
    expect(threatIntelInstall.installThreatIntelManagedWorkflows).toHaveBeenCalled();
    expect(threatIntelInstall.uninstallThreatIntelManagedWorkflows).not.toHaveBeenCalled();
  });

  it('uninstalls threat intel workflows and still calls ready once when the flag is off', async () => {
    const managed = createManagedClient();
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managed);

    await installSecurityManagedWorkflowsAndMarkReady({
      workflowsExtensions,
      logger: loggerMock.create(),
      threatIntelSupplyEnabled: false,
      bootstrapReady: Promise.resolve(),
      core: coreMock.createStart(),
    });

    expect(alertAnalysisInstall.installSecurityAlertAnalysisWorkflow).toHaveBeenCalledWith({
      managedWorkflowsClient: managed,
    });
    expect(threatIntelInstall.uninstallThreatIntelManagedWorkflows).toHaveBeenCalled();
    expect(threatIntelInstall.installThreatIntelManagedWorkflows).not.toHaveBeenCalled();
    expect(managed.ready).toHaveBeenCalledTimes(1);
  });

  it('still calls ready when threat intel install fails', async () => {
    const managed = createManagedClient();
    (threatIntelInstall.installThreatIntelManagedWorkflows as jest.Mock).mockRejectedValue(
      new Error('boom')
    );
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managed);

    await installSecurityManagedWorkflowsAndMarkReady({
      workflowsExtensions,
      logger: loggerMock.create(),
      threatIntelSupplyEnabled: true,
      bootstrapReady: Promise.resolve(),
      core: coreMock.createStart(),
    });

    expect(managed.ready).toHaveBeenCalledTimes(1);
  });

  it('still calls ready when alert analysis install fails', async () => {
    const managed = createManagedClient();
    (alertAnalysisInstall.installSecurityAlertAnalysisWorkflow as jest.Mock).mockRejectedValue(
      new Error('boom')
    );
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managed);

    await installSecurityManagedWorkflowsAndMarkReady({
      workflowsExtensions,
      logger: loggerMock.create(),
      threatIntelSupplyEnabled: false,
      bootstrapReady: Promise.resolve(),
      core: coreMock.createStart(),
    });

    expect(managed.ready).toHaveBeenCalledTimes(1);
  });

  it('awaits bootstrap before installing threat intel workflows', async () => {
    let resolveBootstrap!: () => void;
    const bootstrapReady = new Promise<void>((resolve) => {
      resolveBootstrap = resolve;
    });
    const managed = createManagedClient();
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managed);

    const pending = installSecurityManagedWorkflowsAndMarkReady({
      workflowsExtensions,
      logger: loggerMock.create(),
      threatIntelSupplyEnabled: true,
      bootstrapReady,
      core: coreMock.createStart(),
    });

    await new Promise(process.nextTick);
    expect(threatIntelInstall.installThreatIntelManagedWorkflows).not.toHaveBeenCalled();
    resolveBootstrap();
    await pending;
    expect(threatIntelInstall.installThreatIntelManagedWorkflows).toHaveBeenCalled();
  });

  it('installs alert analysis in the global space via the shared client', async () => {
    const managed = createManagedClient();
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managed);
    (alertAnalysisInstall.installSecurityAlertAnalysisWorkflow as jest.Mock).mockImplementation(
      async ({ managedWorkflowsClient }) => {
        await managedWorkflowsClient.install(SECURITY_ALERT_ANALYSIS_WORKFLOW_ID, {
          spaceId: GLOBAL_WORKFLOW_SPACE_ID,
        });
      }
    );

    await installSecurityManagedWorkflowsAndMarkReady({
      workflowsExtensions,
      logger: loggerMock.create(),
      threatIntelSupplyEnabled: false,
      bootstrapReady: Promise.resolve(),
      core: coreMock.createStart(),
    });

    expect(alertAnalysisInstall.installSecurityAlertAnalysisWorkflow).toHaveBeenCalled();
  });
});
