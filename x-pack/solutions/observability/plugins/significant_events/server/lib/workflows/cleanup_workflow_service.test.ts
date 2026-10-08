/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import {
  SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_STATUS_RECONCILE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SignificantEventsMaintenanceService } from '../maintenance/maintenance_service';
import { bootstrapCleanupWorkflow, createCleanupWorkflowService } from './cleanup_workflow';

const createLogger = (): Logger => {
  const logger = {
    get: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;
  (logger.get as jest.Mock).mockReturnValue(logger);
  return logger;
};

const createManagementApi = () => {
  const getWorkflow = jest.fn();
  return {
    getWorkflow,
    getClient: jest.fn(() => ({ getWorkflow })),
    updateWorkflow: jest.fn().mockResolvedValue({}),
  } as unknown as jest.Mocked<WorkflowsServerPluginSetup['management']>;
};

const createManagedWorkflowsClient = () => ({
  install: jest.fn().mockResolvedValue(undefined),
});

const request = {} as KibanaRequest;
const spaceId = 'space-a';
const cleanupDocumentId = `${SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID}-${spaceId}`;
const statusDocumentId = `${SIGNIFICANT_EVENTS_STATUS_RECONCILE_WORKFLOW_ID}-${spaceId}`;

describe('CleanupWorkflowService', () => {
  let logger: Logger;
  let managementApi: ReturnType<typeof createManagementApi>;
  let managedWorkflowsClient: ReturnType<typeof createManagedWorkflowsClient>;

  beforeEach(() => {
    logger = createLogger();
    managementApi = createManagementApi();
    managedWorkflowsClient = createManagedWorkflowsClient();
  });

  const createService = () =>
    createCleanupWorkflowService({
      logger,
      managementApi,
      getManagedWorkflowsClient: jest.fn().mockResolvedValue(managedWorkflowsClient),
    });

  /** Stored workflows by document id; `install` adds a disabled one, as the real client does. */
  const useStore = (stored: Record<string, { enabled: boolean } | undefined> = {}) => {
    const store = new Map(Object.entries(stored));
    (managementApi.getWorkflow as jest.Mock).mockImplementation(async (id: string) =>
      store.get(id)
    );
    managedWorkflowsClient.install.mockImplementation(
      async (workflowId: string, { workflowIdSuffix }: { workflowIdSuffix: string }) => {
        store.set(`${workflowId}-${workflowIdSuffix}`, { enabled: false });
      }
    );
  };

  it('installs and enables the cleanup and status workflows for the requested space', async () => {
    useStore();

    await createService().ensureEnabled({ request, spaceId });

    [
      SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
      SIGNIFICANT_EVENTS_STATUS_RECONCILE_WORKFLOW_ID,
    ].forEach((workflowId) =>
      expect(managedWorkflowsClient.install).toHaveBeenCalledWith(workflowId, {
        spaceId,
        workflowIdSuffix: spaceId,
      })
    );
    [cleanupDocumentId, statusDocumentId].forEach((documentId) =>
      expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
        documentId,
        { enabled: true },
        spaceId,
        request
      )
    );
  });

  it('is a no-op when both per-space workflows are already enabled', async () => {
    useStore({
      [cleanupDocumentId]: { enabled: true },
      [statusDocumentId]: { enabled: true },
    });

    await createService().ensureEnabled({ request, spaceId });

    expect(managedWorkflowsClient.install).not.toHaveBeenCalled();
    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
  });

  it('installs only the workflow that is missing', async () => {
    useStore({ [cleanupDocumentId]: { enabled: true } });

    await createService().ensureEnabled({ request, spaceId });

    expect(managedWorkflowsClient.install).toHaveBeenCalledTimes(1);
    expect(managedWorkflowsClient.install).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_STATUS_RECONCILE_WORKFLOW_ID,
      { spaceId, workflowIdSuffix: spaceId }
    );
  });

  it('does not enable when best-effort installation did not persist the workflow', async () => {
    (managementApi.getWorkflow as jest.Mock).mockResolvedValue(undefined);

    await createService().ensureEnabled({ request, spaceId });

    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      `Managed workflow ${statusDocumentId} was not installed; skipping enablement`
    );
  });

  it('still enables the status workflow when installing the cleanup workflow fails', async () => {
    useStore();
    const install = managedWorkflowsClient.install.getMockImplementation();
    managedWorkflowsClient.install.mockImplementation(async (workflowId, options) => {
      if (workflowId === SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID) {
        throw new Error('install failed');
      }
      return install?.(workflowId, options);
    });

    await expect(createService().ensureEnabled({ request, spaceId })).rejects.toThrow(
      'install failed'
    );
    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      statusDocumentId,
      { enabled: true },
      spaceId,
      request
    );
  });
});

describe('bootstrapCleanupWorkflow', () => {
  const logger = createLogger();
  const ensureEnabled = jest.fn();
  const cleanupWorkflowService = { ensureEnabled };

  beforeEach(() => jest.clearAllMocks());

  it('skips cleanup bootstrap while maintenance is paused', async () => {
    const maintenanceService = {
      getState: jest.fn().mockResolvedValue('paused'),
    } as unknown as SignificantEventsMaintenanceService;

    await bootstrapCleanupWorkflow({
      cleanupWorkflowService,
      maintenanceService,
      request,
      spaceId,
      logger,
    });

    expect(ensureEnabled).not.toHaveBeenCalled();
  });

  it('logs enablement failures without rejecting', async () => {
    ensureEnabled.mockRejectedValue(new Error('workflow unavailable'));
    const maintenanceService = {
      getState: jest.fn().mockResolvedValue('enabled'),
    } as unknown as SignificantEventsMaintenanceService;

    await expect(
      bootstrapCleanupWorkflow({
        cleanupWorkflowService,
        maintenanceService,
        request,
        spaceId,
        logger,
      })
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to ensure Significant Events cleanup and status workflows are enabled: workflow unavailable'
    );
  });
});
