/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID } from '@kbn/workflows/managed';
import { createSyncWorkflowService } from './sync_workflow';

const createLogger = (): Logger => {
  const logger = {
    get: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
  } as unknown as Logger;
  (logger.get as jest.Mock).mockReturnValue(logger);
  return logger;
};

const createManagementApi = () => {
  const getWorkflow = jest.fn();
  return {
    getWorkflow,
    getClient: jest.fn(() => ({ getWorkflow })),
    updateWorkflow: jest.fn(),
  } as unknown as jest.Mocked<WorkflowsServerPluginSetup['management']>;
};

const createManagedWorkflowsClient = () => ({
  install: jest.fn().mockResolvedValue(undefined),
  uninstall: jest.fn().mockResolvedValue(undefined),
});

const request = {} as KibanaRequest;
const spaceId = 'space-a';
const workflowDocumentId = `${SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID}-${spaceId}`;

describe('SyncWorkflowService', () => {
  let logger: Logger;
  let managementApi: ReturnType<typeof createManagementApi>;
  let managedWorkflowsClient: ReturnType<typeof createManagedWorkflowsClient>;

  beforeEach(() => {
    logger = createLogger();
    managementApi = createManagementApi();
    managedWorkflowsClient = createManagedWorkflowsClient();
  });

  const createService = () =>
    createSyncWorkflowService({
      logger,
      managementApi,
      getManagedWorkflowsClient: jest.fn().mockResolvedValue(managedWorkflowsClient),
    });

  it('enables the workflow when it is installed but disabled', async () => {
    (managementApi.getWorkflow as jest.Mock).mockResolvedValue({ enabled: false });

    await createService().ensureEnabled({ request, spaceId });

    expect(managementApi.getWorkflow).toHaveBeenCalledWith(workflowDocumentId, spaceId);
    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      workflowDocumentId,
      { enabled: true },
      spaceId,
      request
    );
  });

  it('is a no-op when the workflow is already enabled', async () => {
    (managementApi.getWorkflow as jest.Mock).mockResolvedValue({ enabled: true });

    await createService().ensureEnabled({ request, spaceId });

    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
  });

  it('installs the space workflow on first use and enables it', async () => {
    (managementApi.getWorkflow as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ enabled: false });

    await createService().ensureEnabled({ request, spaceId });

    expect(managedWorkflowsClient.install).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
      { spaceId, workflowIdSuffix: spaceId }
    );
    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      workflowDocumentId,
      { enabled: true },
      spaceId,
      request
    );
  });

  it('warns and skips enablement when the install produces no document', async () => {
    (managementApi.getWorkflow as jest.Mock).mockResolvedValue(undefined);

    await createService().ensureEnabled({ request, spaceId });

    expect(managedWorkflowsClient.install).toHaveBeenCalledTimes(1);
    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('uninstalls the legacy default-space sync document after enabling its replacement', async () => {
    (managementApi.getWorkflow as jest.Mock).mockResolvedValue({ enabled: false });

    await createService().ensureEnabled({ request, spaceId: 'default' });

    expect(managedWorkflowsClient.uninstall).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
      { spaceId: 'default' }
    );
  });

  it('does not uninstall the legacy document when enabling in a non-default space', async () => {
    (managementApi.getWorkflow as jest.Mock).mockResolvedValue({ enabled: false });

    await createService().ensureEnabled({ request, spaceId });

    expect(managedWorkflowsClient.uninstall).not.toHaveBeenCalled();
  });

  it('logs a warning but does not throw when legacy uninstall fails', async () => {
    (managementApi.getWorkflow as jest.Mock).mockResolvedValue({ enabled: false });
    managedWorkflowsClient.uninstall.mockRejectedValue(new Error('uninstall failed'));

    await expect(
      createService().ensureEnabled({ request, spaceId: 'default' })
    ).resolves.not.toThrow();
    expect(logger.warn).toHaveBeenCalled();
  });
});
