/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SignificantEventsMaintenanceService } from '../maintenance/maintenance_service';
import { bootstrapCleanupWorkflow, createCleanupWorkflowService } from './cleanup_workflow';

const createLogger = (): Logger => {
  const logger = {
    get: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  } as unknown as Logger;
  (logger.get as Mock).mockReturnValue(logger);
  return logger;
};

const createManagementApi = () => {
  const getWorkflow = vi.fn();
  return {
    getWorkflow,
    getClient: vi.fn(() => ({ getWorkflow })),
    updateWorkflow: vi.fn().mockResolvedValue({}),
  } as unknown as Mocked<WorkflowsServerPluginSetup['management']>;
};

const createManagedWorkflowsClient = () => ({
  install: vi.fn().mockResolvedValue(undefined),
});

const request = {} as KibanaRequest;
const spaceId = 'space-a';
const workflowDocumentId = `${SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID}-${spaceId}`;

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
      getManagedWorkflowsClient: vi.fn().mockResolvedValue(managedWorkflowsClient),
    });

  it('installs and enables the workflow for the requested space', async () => {
    (managementApi.getWorkflow as Mock)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ enabled: false });

    await createService().ensureEnabled({ request, spaceId });

    expect(managedWorkflowsClient.install).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
      { spaceId, workflowIdSuffix: spaceId }
    );
    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      workflowDocumentId,
      { enabled: true },
      spaceId,
      request
    );
  });

  it('is a no-op when the per-space workflow is already enabled', async () => {
    (managementApi.getWorkflow as Mock).mockResolvedValue({ enabled: true });

    await createService().ensureEnabled({ request, spaceId });

    expect(managedWorkflowsClient.install).not.toHaveBeenCalled();
    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
  });

  it('does not enable when best-effort installation did not persist the workflow', async () => {
    (managementApi.getWorkflow as Mock).mockResolvedValue(undefined);

    await createService().ensureEnabled({ request, spaceId });

    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      `Managed cleanup workflow ${workflowDocumentId} was not installed; skipping enablement`
    );
  });
});

describe('bootstrapCleanupWorkflow', () => {
  const logger = createLogger();
  const ensureEnabled = vi.fn();
  const cleanupWorkflowService = { ensureEnabled };

  beforeEach(() => vi.clearAllMocks());

  it('skips cleanup bootstrap while maintenance is paused', async () => {
    const maintenanceService = {
      getState: vi.fn().mockResolvedValue('paused'),
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
      getState: vi.fn().mockResolvedValue('enabled'),
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
      'Failed to ensure Significant Events cleanup workflow is enabled: workflow unavailable'
    );
  });
});
