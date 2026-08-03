/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { RouterMock } from '@kbn/core-http-router-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { SECURITY_ALERT_ANALYSIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import {
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AGENT_ID,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MAX_THRESHOLD,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MIN_THRESHOLD,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_ENABLED,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CONNECTOR_ID,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CREATE_CONVERSATION,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_TAG_PREFIX,
} from '@kbn/management-settings-ids';
import type { StartPlugins } from '../../plugin';
import type {
  SecuritySolutionApiRequestHandlerContext,
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../types';
import { ALERT_ANALYSIS_WORKFLOW_RUNTIME_CONFIG_ROUTE } from '../../../common/workflows/alert_analysis_workflow';
import { ALERT_ANALYSIS_WORKFLOW_SETTINGS_UPDATED_EVENT } from '../../lib/telemetry/event_based/events';
import {
  ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE,
  registerAlertAnalysisWorkflowSettingsRoutes,
} from './settings_routes';

describe('registerAlertAnalysisWorkflowSettingsRoutes', () => {
  let router: RouterMock;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let getStartServices: jest.MockedFunction<StartServicesAccessor<StartPlugins>>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let uiSettingsClient: { get: jest.Mock; setMany: jest.Mock };
  let auditLogger: { log: jest.Mock };
  let hasAtLeast: jest.Mock;
  let managedWorkflowsClient: {
    install: jest.Mock;
    uninstall: jest.Mock;
    ready: jest.Mock;
    getWorkflowStatus: jest.Mock;
    execute: jest.Mock;
  };

  const createContext = (): SecuritySolutionRequestHandlerContext => {
    const securitySolutionContext = {
      getSpaceId: jest.fn().mockReturnValue('space-1'),
      getAuditLogger: jest.fn().mockReturnValue(auditLogger),
    } as unknown as Pick<SecuritySolutionApiRequestHandlerContext, 'getSpaceId' | 'getAuditLogger'>;

    return {
      securitySolution: Promise.resolve(
        securitySolutionContext as unknown as SecuritySolutionApiRequestHandlerContext
      ),
      licensing: Promise.resolve({ license: { hasAtLeast } }),
    } as unknown as SecuritySolutionRequestHandlerContext;
  };

  const createRequest = (body?: unknown) =>
    httpServerMock.createKibanaRequest({
      method: body ? 'put' : 'get',
      path: ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE,
      body: body as Record<string, unknown>,
    });

  beforeEach(() => {
    router = httpServiceMock.createRouter() as unknown as RouterMock;
    coreStart = coreMock.createStart();
    mockResponse = httpServerMock.createResponseFactory();
    auditLogger = { log: jest.fn() };
    hasAtLeast = jest.fn().mockReturnValue(true);
    uiSettingsClient = {
      get: jest.fn(),
      setMany: jest.fn().mockResolvedValue(undefined),
    };
    managedWorkflowsClient = {
      install: jest.fn().mockResolvedValue(undefined),
      uninstall: jest.fn().mockResolvedValue(undefined),
      ready: jest.fn().mockResolvedValue(undefined),
      getWorkflowStatus: jest.fn().mockResolvedValue({ status: 'intact' }),
      execute: jest.fn().mockResolvedValue('mock-execution-id'),
    };

    (coreStart.uiSettings.asScopedToClient as jest.Mock).mockReturnValue(uiSettingsClient);

    const workflowsExtensions = workflowsExtensionsMock.createStart();
    workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managedWorkflowsClient);

    getStartServices = jest
      .fn()
      .mockResolvedValue([
        coreStart,
        { workflowsExtensions } as unknown as StartPlugins,
        undefined,
      ] as unknown as Awaited<ReturnType<StartServicesAccessor<StartPlugins>>>);

    registerAlertAnalysisWorkflowSettingsRoutes(
      router as unknown as SecuritySolutionPluginRouter,
      getStartServices as unknown as StartServicesAccessor<StartPlugins>,
      loggerMock.create()
    );
  });

  describe('GET', () => {
    const mockSettings = () => {
      uiSettingsClient.get
        .mockResolvedValueOnce(true) // workflowEnabled
        .mockResolvedValueOnce(false) // autoCloseEnabled
        .mockResolvedValueOnce(0.7) // autoCloseConfidenceScoreMinThreshold
        .mockResolvedValueOnce(0.9) // autoCloseConfidenceScoreMaxThreshold
        .mockResolvedValueOnce('connector-abc') // connectorId
        .mockResolvedValueOnce('elastic-ai-agent') // agentId
        .mockResolvedValueOnce(true) // createConversation
        .mockResolvedValueOnce('alert-analysis'); // tagPrefix
    };

    it('returns the current space-scoped settings', async () => {
      mockSettings();

      const handler = router.versioned.getRoute('get', ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE)
        .versions['1'].handler;

      await handler(createContext(), createRequest(), mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          settings: {
            workflowEnabled: true,
            autoCloseEnabled: false,
            autoCloseConfidenceScoreMinThreshold: 0.7,
            autoCloseConfidenceScoreMaxThreshold: 0.9,
            connectorId: 'connector-abc',
            agentId: 'elastic-ai-agent',
            createConversation: true,
            tagPrefix: 'alert-analysis',
          },
          workflowId: SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
        },
      });
    });

    it('does not install the workflow on GET', async () => {
      // The workflow is installed once in the global space at plugin start, never from a route.
      mockSettings();

      const handler = router.versioned.getRoute('get', ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE)
        .versions['1'].handler;

      await handler(createContext(), createRequest(), mockResponse);

      expect(managedWorkflowsClient.install).not.toHaveBeenCalled();
    });

    it('returns forbidden when the license does not support the feature', async () => {
      hasAtLeast.mockReturnValue(false);
      const handler = router.versioned.getRoute('get', ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE)
        .versions['1'].handler;

      await handler(createContext(), createRequest(), mockResponse);

      expect(mockResponse.forbidden).toHaveBeenCalled();
      expect(uiSettingsClient.get).not.toHaveBeenCalled();
    });
  });

  describe('PUT', () => {
    const settings = {
      workflowEnabled: true,
      autoCloseEnabled: true,
      autoCloseConfidenceScoreMinThreshold: 0.75,
      autoCloseConfidenceScoreMaxThreshold: 0.95,
      connectorId: 'connector-xyz',
      agentId: 'my-custom-agent',
      createConversation: false,
      tagPrefix: 'alert-analysis',
    };

    it('persists settings without reinstalling the workflow', async () => {
      const handler = router.versioned.getRoute('put', ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE)
        .versions['1'].handler;

      await handler(createContext(), createRequest(settings), mockResponse);

      expect(uiSettingsClient.setMany).toHaveBeenCalledTimes(1);
      expect(uiSettingsClient.setMany).toHaveBeenCalledWith({
        [SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED]: settings.workflowEnabled,
        [SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_ENABLED]: settings.autoCloseEnabled,
        [SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MIN_THRESHOLD]:
          settings.autoCloseConfidenceScoreMinThreshold,
        [SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MAX_THRESHOLD]:
          settings.autoCloseConfidenceScoreMaxThreshold,
        [SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CONNECTOR_ID]: settings.connectorId,
        [SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AGENT_ID]: settings.agentId,
        [SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CREATE_CONVERSATION]:
          settings.createConversation,
        [SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_TAG_PREFIX]: settings.tagPrefix,
      });
      // The globally-installed workflow reads settings from uiSettings on its next run, so saving
      // never reinstalls or rewrites the workflow document.
      expect(managedWorkflowsClient.install).not.toHaveBeenCalled();
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          settings,
          workflowId: SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
        },
      });
    });

    it('logs a successful audit event and reports telemetry on save', async () => {
      const handler = router.versioned.getRoute('put', ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE)
        .versions['1'].handler;

      await handler(createContext(), createRequest(settings), mockResponse);

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: expect.objectContaining({ outcome: 'success' }) })
      );
      expect(coreStart.analytics.reportEvent).toHaveBeenCalledWith(
        ALERT_ANALYSIS_WORKFLOW_SETTINGS_UPDATED_EVENT.eventType,
        expect.objectContaining({
          status: 'success',
          workflowEnabled: settings.workflowEnabled,
          autoCloseEnabled: settings.autoCloseEnabled,
          createConversation: settings.createConversation,
          connectorConfigured: true,
          customAgent: true,
        })
      );
    });

    it('logs a failed audit event and reports telemetry when saving fails', async () => {
      uiSettingsClient.setMany.mockRejectedValue(new Error('boom'));
      const handler = router.versioned.getRoute('put', ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE)
        .versions['1'].handler;

      await handler(createContext(), createRequest(settings), mockResponse);

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: expect.objectContaining({ outcome: 'failure' }) })
      );
      expect(coreStart.analytics.reportEvent).toHaveBeenCalledWith(
        ALERT_ANALYSIS_WORKFLOW_SETTINGS_UPDATED_EVENT.eventType,
        expect.objectContaining({ status: 'error' })
      );
      expect(mockResponse.customError).toHaveBeenCalled();
    });

    it('returns forbidden when the license does not support the feature', async () => {
      hasAtLeast.mockReturnValue(false);
      const handler = router.versioned.getRoute('put', ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE)
        .versions['1'].handler;

      await handler(createContext(), createRequest(settings), mockResponse);

      expect(mockResponse.forbidden).toHaveBeenCalled();
      expect(uiSettingsClient.setMany).not.toHaveBeenCalled();
    });
  });

  describe('runtime_config GET', () => {
    const mockSettings = () => {
      uiSettingsClient.get
        .mockResolvedValueOnce(true) // workflowEnabled
        .mockResolvedValueOnce(true) // autoCloseEnabled
        .mockResolvedValueOnce(0.85) // autoCloseConfidenceScoreMinThreshold
        .mockResolvedValueOnce(1) // autoCloseConfidenceScoreMaxThreshold
        .mockResolvedValueOnce('connector-abc') // connectorId
        .mockResolvedValueOnce('elastic-ai-agent') // agentId
        .mockResolvedValueOnce(true) // createConversation
        .mockResolvedValueOnce('alert-analysis'); // tagPrefix
    };

    const getHandler = () =>
      router.versioned.getRoute('get', ALERT_ANALYSIS_WORKFLOW_RUNTIME_CONFIG_ROUTE).versions['1']
        .handler;

    it('returns the space-scoped settings the workflow reads at run time', async () => {
      mockSettings();

      await getHandler()(createContext(), createRequest(), mockResponse);

      // The runtime route returns the bare settings (no workflowId wrapper); the workflow reads
      // these fields directly.
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          workflowEnabled: true,
          autoCloseEnabled: true,
          autoCloseConfidenceScoreMinThreshold: 0.85,
          autoCloseConfidenceScoreMaxThreshold: 1,
          connectorId: 'connector-abc',
          agentId: 'elastic-ai-agent',
          createConversation: true,
          tagPrefix: 'alert-analysis',
        },
      });
    });

    it('returns forbidden when the license does not support the feature', async () => {
      hasAtLeast.mockReturnValue(false);

      await getHandler()(createContext(), createRequest(), mockResponse);

      expect(mockResponse.forbidden).toHaveBeenCalled();
      expect(uiSettingsClient.get).not.toHaveBeenCalled();
    });
  });
});
