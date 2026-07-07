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
import {
  installSecurityAlertAnalysisWorkflow,
  installSecurityAlertAnalysisWorkflowAndMarkReady,
  readSecurityAlertAnalysisWorkflowSettings,
} from './install';

describe('alert analysis workflow install', () => {
  const createManagedClient = () => ({
    install: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
    ready: jest.fn().mockResolvedValue(undefined),
    getWorkflowStatus: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue('execution-id'),
  });

  it('installs the workflow once in the global space, without a suffix or template values', async () => {
    const managed = createManagedClient();

    await installSecurityAlertAnalysisWorkflow({ managedWorkflowsClient: managed });

    expect(managed.install).toHaveBeenCalledWith(SECURITY_ALERT_ANALYSIS_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
  });

  describe('readSecurityAlertAnalysisWorkflowSettings', () => {
    it('reads the six settings from the given uiSettings client', async () => {
      const uiSettingsClient = {
        get: jest
          .fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(0.8)
          .mockResolvedValueOnce(0.95)
          .mockResolvedValueOnce('connector-abc')
          .mockResolvedValueOnce(false),
      };

      const result = await readSecurityAlertAnalysisWorkflowSettings(uiSettingsClient);

      expect(result).toEqual({
        workflowEnabled: true,
        autoCloseEnabled: true,
        autoCloseConfidenceScoreMinThreshold: 0.8,
        autoCloseConfidenceScoreMaxThreshold: 0.95,
        connectorId: 'connector-abc',
        createConversation: false,
      });
    });
  });

  describe('installSecurityAlertAnalysisWorkflowAndMarkReady', () => {
    it('awaits the install before marking managed workflows ready', async () => {
      const managed = createManagedClient();
      const order: string[] = [];
      managed.install.mockImplementation(async () => {
        order.push('install');
      });
      managed.ready.mockImplementation(async () => {
        order.push('ready');
      });
      const workflowsExtensions = workflowsExtensionsMock.createStart();
      workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managed);

      await installSecurityAlertAnalysisWorkflowAndMarkReady({
        workflowsExtensions,
        logger: loggerMock.create(),
      });

      expect(managed.install).toHaveBeenCalledWith(SECURITY_ALERT_ANALYSIS_WORKFLOW_ID, {
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      });
      // ready() must run only after install resolves, else it closes the startup window and
      // reconciles before the workflow is installed.
      expect(order).toEqual(['install', 'ready']);
    });

    it('logs a warning and does not throw, and does not mark ready, when the install fails', async () => {
      const managed = createManagedClient();
      managed.install.mockRejectedValue(new Error('boom'));
      const workflowsExtensions = workflowsExtensionsMock.createStart();
      workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managed);
      const logger = loggerMock.create();

      await expect(
        installSecurityAlertAnalysisWorkflowAndMarkReady({ workflowsExtensions, logger })
      ).resolves.not.toThrow();

      expect(managed.ready).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to install the alert analysis workflow'),
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });
});
