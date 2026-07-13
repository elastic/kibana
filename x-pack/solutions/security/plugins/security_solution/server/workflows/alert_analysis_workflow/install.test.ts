/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ALERT_ANALYSIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import {
  installSecurityAlertAnalysisWorkflow,
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
    it('reads the settings from the given uiSettings client', async () => {
      const uiSettingsClient = {
        get: jest
          .fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(0.8)
          .mockResolvedValueOnce(0.95)
          .mockResolvedValueOnce('connector-abc')
          .mockResolvedValueOnce('elastic-ai-agent')
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce('alert-analysis'),
      };

      const result = await readSecurityAlertAnalysisWorkflowSettings(uiSettingsClient);

      expect(result).toEqual({
        workflowEnabled: true,
        autoCloseEnabled: true,
        autoCloseConfidenceScoreMinThreshold: 0.8,
        autoCloseConfidenceScoreMaxThreshold: 0.95,
        connectorId: 'connector-abc',
        agentId: 'elastic-ai-agent',
        createConversation: false,
        tagPrefix: 'alert-analysis',
      });
    });
  });
});
