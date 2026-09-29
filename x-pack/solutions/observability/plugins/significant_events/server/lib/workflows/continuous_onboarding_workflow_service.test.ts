/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';
import { createContinuousOnboardingWorkflowService } from './continuous_onboarding_workflow';
import type { SignificantEventsKIsOnboardingClient } from './onboarding_workflow_client';

jest.mock('./poll_until', () => ({
  pollUntil: jest.fn().mockResolvedValue(undefined),
}));

const createManagementApi = () => {
  const getWorkflow = jest.fn();
  return {
    getWorkflow,
    getClient: jest.fn(() => ({ getWorkflow })),
    updateWorkflow: jest.fn().mockResolvedValue({}),
    getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<WorkflowsServerPluginSetup['management']>;
};

const createManagedWorkflowsClient = () => ({
  install: jest.fn().mockResolvedValue(undefined),
  uninstall: jest.fn().mockResolvedValue(undefined),
});

const request = {} as KibanaRequest;
const spaceId = 'space-a';
const workflowId = SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID;
const workflowDocumentId = `${workflowId}-${spaceId}`;

describe('ContinuousOnboardingWorkflowService', () => {
  let logger: MockedLogger;
  let managementApi: ReturnType<typeof createManagementApi>;
  let managedWorkflowsClient: ReturnType<typeof createManagedWorkflowsClient>;
  let cancelAllRunning: jest.Mock;

  beforeEach(() => {
    logger = loggerMock.create();
    managementApi = createManagementApi();
    managedWorkflowsClient = createManagedWorkflowsClient();
    cancelAllRunning = jest.fn().mockResolvedValue(0);
  });

  const createService = () =>
    createContinuousOnboardingWorkflowService({
      logger,
      managementApi,
      streamsKIsOnboardingClient: {
        cancelAllRunning,
      } as unknown as SignificantEventsKIsOnboardingClient,
      getManagedWorkflowsClient: jest.fn().mockResolvedValue(managedWorkflowsClient),
    });

  describe('enabling', () => {
    it('installs the workflow for the space and then enables its document', async () => {
      (managementApi.getWorkflow as jest.Mock).mockResolvedValue({ enabled: false });

      await createService().ensureWorkflow({ enabled: true, request, spaceId });

      expect(managedWorkflowsClient.install).toHaveBeenCalledWith(workflowId, {
        spaceId,
        workflowIdSuffix: spaceId,
      });
      expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
        workflowDocumentId,
        { enabled: true },
        spaceId,
        request
      );
      expect(managedWorkflowsClient.install.mock.invocationCallOrder[0]).toBeLessThan(
        (managementApi.updateWorkflow as jest.Mock).mock.invocationCallOrder[0]
      );
    });

    it('does not update a document that is already enabled', async () => {
      (managementApi.getWorkflow as jest.Mock).mockResolvedValue({ enabled: true });

      await createService().ensureWorkflow({ enabled: true, request, spaceId });

      expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
    });

    it('throws when the install did not leave a document to enable', async () => {
      (managementApi.getWorkflow as jest.Mock).mockResolvedValue(undefined);

      await expect(
        createService().ensureWorkflow({ enabled: true, request, spaceId })
      ).rejects.toThrow(`Managed continuous onboarding workflow ${workflowDocumentId}`);
      expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('disabling', () => {
    it('disables, drains, cancels onboarding runs, then uninstalls the space document', async () => {
      (managementApi.getWorkflow as jest.Mock).mockResolvedValue({ enabled: true });
      (managementApi.getWorkflowExecutions as jest.Mock).mockResolvedValue({
        results: [{ id: 'exec-1' }],
        total: 1,
      });

      await createService().ensureWorkflow({ enabled: false, request, spaceId });

      expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
        workflowDocumentId,
        { enabled: false },
        spaceId,
        request
      );
      expect(managementApi.getWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ workflowId: workflowDocumentId }),
        spaceId
      );
      expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledWith(
        'exec-1',
        spaceId,
        request
      );
      expect(cancelAllRunning).toHaveBeenCalledWith({ request });
      expect(managedWorkflowsClient.uninstall).toHaveBeenCalledWith(workflowId, {
        spaceId,
        workflowIdSuffix: spaceId,
      });

      const order = [
        (managementApi.updateWorkflow as jest.Mock).mock.invocationCallOrder[0],
        (managementApi.cancelWorkflowExecution as jest.Mock).mock.invocationCallOrder[0],
        cancelAllRunning.mock.invocationCallOrder[0],
        managedWorkflowsClient.uninstall.mock.invocationCallOrder[0],
      ];
      expect(order).toEqual([...order].sort((left, right) => left - right));
    });

    it.each([
      ['already disabled', { enabled: false }],
      ['missing', undefined],
    ])('still uninstalls when the document is %s', async (_state, existing) => {
      (managementApi.getWorkflow as jest.Mock).mockResolvedValue(existing);

      await createService().ensureWorkflow({ enabled: false, request, spaceId });

      expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
      expect(managedWorkflowsClient.uninstall).toHaveBeenCalledTimes(1);
    });

    it('warns and keeps going when cancelling executions fails', async () => {
      (managementApi.getWorkflow as jest.Mock).mockResolvedValue({ enabled: true });
      (managementApi.getWorkflowExecutions as jest.Mock).mockRejectedValue(new Error('es down'));
      cancelAllRunning.mockRejectedValue(new Error('cancel failed'));

      await createService().ensureWorkflow({ enabled: false, request, spaceId });

      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(managedWorkflowsClient.uninstall).toHaveBeenCalledTimes(1);
    });

    it('does not uninstall when disabling the document fails', async () => {
      (managementApi.getWorkflow as jest.Mock).mockResolvedValue({ enabled: true });
      (managementApi.updateWorkflow as jest.Mock).mockRejectedValue(new Error('update failed'));

      await expect(
        createService().ensureWorkflow({ enabled: false, request, spaceId })
      ).rejects.toThrow('update failed');
      expect(managedWorkflowsClient.uninstall).not.toHaveBeenCalled();
    });
  });
});
