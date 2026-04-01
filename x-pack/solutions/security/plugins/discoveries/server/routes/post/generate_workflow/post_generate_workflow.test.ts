/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import { DEFAULT_ROUTE_HANDLER_TIMEOUT_MS } from '../../..';
import { registerGenerateWorkflowRoute } from './post_generate_workflow';

jest.mock('../../../lib/assert_workflows_enabled', () => ({
  assertWorkflowsEnabled: jest.fn().mockResolvedValue(null),
}));

const mockGenerateWorkflowWithRetries = jest.fn();

jest.mock('./helpers/generate_workflow_with_retries', () => ({
  generateWorkflowWithRetries: (...args: unknown[]) => mockGenerateWorkflowWithRetries(...args),
}));

const mockGetSpaceId = jest.fn().mockReturnValue('default');

jest.mock('@kbn/discoveries/impl/lib/helpers/get_space_id', () => ({
  getSpaceId: (...args: unknown[]) => mockGetSpaceId(...args),
}));

const mockWorkflowInitService = {
  ensureWorkflowsForSpace: jest.fn().mockResolvedValue(null),
  verifyAndRepairWorkflows: jest.fn(),
};

describe('registerGenerateWorkflowRoute', () => {
  let mockRouter: jest.Mocked<IRouter>;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockGetStartServices: jest.Mock;
  let mockWorkflowsManagementApi: { createWorkflow: jest.Mock };
  let mockRequest: { body: { connector_id: string; description: string } };

  const getVersionHandler = (handler: Function | undefined): Function => {
    if (!handler) {
      throw new Error('Expected versioned route handler to be set');
    }

    return handler;
  };

  const setupVersionHandler = (): (() => Function) => {
    let versionHandler: Function | undefined;

    (mockRouter.versioned.post as jest.Mock).mockReturnValue({
      addVersion: jest.fn((config: unknown, handler: Function) => {
        versionHandler = handler;
      }),
    });

    return () => getVersionHandler(versionHandler);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouter = {
      versioned: {
        post: jest.fn().mockReturnThis(),
        addVersion: jest.fn(),
      },
    } as unknown as jest.Mocked<IRouter>;

    mockLogger = loggingSystemMock.createLogger();

    mockRequest = {
      body: {
        connector_id: 'test-connector',
        description: 'Retrieve high-severity alerts from the last 24 hours',
      },
    };

    mockGetStartServices = jest.fn().mockResolvedValue({
      coreStart: {},
      pluginsStart: {
        agentBuilder: {
          agents: {
            runAgent: jest.fn(),
          },
        },
        spaces: {
          spacesService: {},
        },
      },
    });

    mockWorkflowsManagementApi = {
      createWorkflow: jest.fn().mockResolvedValue({
        id: 'workflow-test-id',
        name: 'high-severity-alerts',
      }),
    };

    mockGenerateWorkflowWithRetries.mockResolvedValue({
      ok: true,
      retries: 0,
      workflow: { name: 'high-severity-alerts' },
      yaml: 'name: high-severity-alerts\nversion: "1"',
    });

    mockGetSpaceId.mockReturnValue('default');
  });

  it('registers the route with correct path and options', () => {
    registerGenerateWorkflowRoute(mockRouter, mockLogger, {
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
      workflowsManagementApi: mockWorkflowsManagementApi as never,
    });

    expect(mockRouter.versioned.post).toHaveBeenCalledWith({
      access: 'internal',
      path: '/internal/attack_discovery/_generate_workflow',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution-attackDiscoveryAll'],
        },
      },
      options: {
        timeout: {
          idleSocket: DEFAULT_ROUTE_HANDLER_TIMEOUT_MS,
        },
      },
    });
  });

  it('returns 404 when workflows feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const getHandler = setupVersionHandler();
    const mockResponse = {
      customError: jest.fn(),
      ok: jest.fn(),
    };

    registerGenerateWorkflowRoute(mockRouter, mockLogger, {
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
      workflowsManagementApi: mockWorkflowsManagementApi as never,
    });

    const result = await getHandler()({}, mockRequest, mockResponse);

    expect(result).toEqual(mockNotFoundResponse);
    expect(mockResponse.ok).not.toHaveBeenCalled();
  });

  describe('successful generation', () => {
    it('returns workflow_id and workflow_name on success', async () => {
      const getHandler = setupVersionHandler();
      const mockResponse = {
        customError: jest.fn(),
        ok: jest.fn((obj: unknown) => obj),
      };

      registerGenerateWorkflowRoute(mockRouter, mockLogger, {
        getStartServices: mockGetStartServices,
        workflowInitService: mockWorkflowInitService,
        workflowsManagementApi: mockWorkflowsManagementApi as never,
      });

      const result = await getHandler()(
        {
          core: Promise.resolve({
            featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
          }),
        },
        mockRequest,
        mockResponse
      );

      expect(result).toEqual({
        body: {
          workflow_id: 'workflow-test-id',
          workflow_name: 'high-severity-alerts',
        },
      });
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          workflow_id: 'workflow-test-id',
          workflow_name: 'high-severity-alerts',
        },
      });
    });

    it('calls generateWorkflowWithRetries with the correct params', async () => {
      const getHandler = setupVersionHandler();
      const mockResponse = {
        customError: jest.fn(),
        ok: jest.fn((obj: unknown) => obj),
      };

      registerGenerateWorkflowRoute(mockRouter, mockLogger, {
        getStartServices: mockGetStartServices,
        workflowInitService: mockWorkflowInitService,
        workflowsManagementApi: mockWorkflowsManagementApi as never,
      });

      await getHandler()(
        {
          core: Promise.resolve({
            featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
          }),
        },
        mockRequest,
        mockResponse
      );

      expect(mockGenerateWorkflowWithRetries).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'elastic-ai-agent',
          connectorId: 'test-connector',
          description: 'Retrieve high-severity alerts from the last 24 hours',
          logger: mockLogger,
          request: mockRequest,
        })
      );
    });

    it('passes configurationOverrides built from the skill to generateWorkflowWithRetries', async () => {
      const getHandler = setupVersionHandler();
      const mockResponse = {
        customError: jest.fn(),
        ok: jest.fn((obj: unknown) => obj),
      };

      registerGenerateWorkflowRoute(mockRouter, mockLogger, {
        getStartServices: mockGetStartServices,
        workflowInitService: mockWorkflowInitService,
        workflowsManagementApi: mockWorkflowsManagementApi as never,
      });

      await getHandler()(
        {
          core: Promise.resolve({
            featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
          }),
        },
        mockRequest,
        mockResponse
      );

      const callArgs = mockGenerateWorkflowWithRetries.mock.calls[0][0];

      expect(callArgs.configurationOverrides).toBeDefined();
      expect(callArgs.configurationOverrides.instructions).toContain(
        'Attack Discovery Alerts ES|QL Query Builder'
      );
      expect(callArgs.configurationOverrides.tools).toEqual([
        { tool_ids: ['platform.core.generate_esql', 'platform.core.execute_esql'] },
      ]);
    });

    it('calls createWorkflow with the generated YAML, spaceId, and request', async () => {
      const getHandler = setupVersionHandler();
      const mockResponse = {
        customError: jest.fn(),
        ok: jest.fn((obj: unknown) => obj),
      };

      registerGenerateWorkflowRoute(mockRouter, mockLogger, {
        getStartServices: mockGetStartServices,
        workflowInitService: mockWorkflowInitService,
        workflowsManagementApi: mockWorkflowsManagementApi as never,
      });

      await getHandler()(
        {
          core: Promise.resolve({
            featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
          }),
        },
        mockRequest,
        mockResponse
      );

      expect(mockWorkflowsManagementApi.createWorkflow).toHaveBeenCalledWith(
        { yaml: 'name: high-severity-alerts\nversion: "1"' },
        'default',
        mockRequest
      );
    });

    it('resolves spaceId from the spaces service', async () => {
      const getHandler = setupVersionHandler();
      const mockResponse = {
        customError: jest.fn(),
        ok: jest.fn((obj: unknown) => obj),
      };

      registerGenerateWorkflowRoute(mockRouter, mockLogger, {
        getStartServices: mockGetStartServices,
        workflowInitService: mockWorkflowInitService,
        workflowsManagementApi: mockWorkflowsManagementApi as never,
      });

      await getHandler()(
        {
          core: Promise.resolve({
            featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
          }),
        },
        mockRequest,
        mockResponse
      );

      expect(mockGetSpaceId).toHaveBeenCalledWith({
        request: mockRequest,
        spaces: expect.anything(),
      });
    });
  });

  describe('agent builder unavailable', () => {
    it('returns 503 when agentBuilder is not available', async () => {
      mockGetStartServices.mockResolvedValue({
        coreStart: {},
        pluginsStart: {
          spaces: { spacesService: {} },
        },
      });

      const getHandler = setupVersionHandler();
      const mockResponse = {
        customError: jest.fn((obj: unknown) => obj),
        ok: jest.fn(),
      };

      registerGenerateWorkflowRoute(mockRouter, mockLogger, {
        getStartServices: mockGetStartServices,
        workflowInitService: mockWorkflowInitService,
        workflowsManagementApi: mockWorkflowsManagementApi as never,
      });

      const result = await getHandler()(
        {
          core: Promise.resolve({
            featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
          }),
        },
        mockRequest,
        mockResponse
      );

      expect(mockResponse.customError).toHaveBeenCalledWith({
        body: {
          message: 'Agent builder service is not available',
        },
        statusCode: 503,
      });
      expect(result).toEqual(
        expect.objectContaining({
          statusCode: 503,
        })
      );
    });
  });

  describe('workflows management API unavailable', () => {
    it('returns 503 when workflowsManagementApi is not provided', async () => {
      const getHandler = setupVersionHandler();
      const mockResponse = {
        customError: jest.fn((obj: unknown) => obj),
        ok: jest.fn(),
      };

      registerGenerateWorkflowRoute(mockRouter, mockLogger, {
        getStartServices: mockGetStartServices,
        workflowInitService: mockWorkflowInitService,
      });

      const result = await getHandler()(
        {
          core: Promise.resolve({
            featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
          }),
        },
        mockRequest,
        mockResponse
      );

      expect(mockResponse.customError).toHaveBeenCalledWith({
        body: {
          message: 'Workflows management API is not available',
        },
        statusCode: 503,
      });
      expect(result).toEqual(
        expect.objectContaining({
          statusCode: 503,
        })
      );
    });
  });

  describe('generation failure after retries exhausted', () => {
    it('returns 500 when generation fails after retries', async () => {
      mockGenerateWorkflowWithRetries.mockResolvedValue({
        error: 'Workflow generation failed after 4 attempts. Last error: Validation failed',
        ok: false,
        retries: 3,
      });

      const getHandler = setupVersionHandler();
      const mockResponse = {
        customError: jest.fn((obj: unknown) => obj),
        ok: jest.fn(),
      };

      registerGenerateWorkflowRoute(mockRouter, mockLogger, {
        getStartServices: mockGetStartServices,
        workflowInitService: mockWorkflowInitService,
        workflowsManagementApi: mockWorkflowsManagementApi as never,
      });

      const result = await getHandler()(
        {
          core: Promise.resolve({
            featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
          }),
        },
        mockRequest,
        mockResponse
      );

      expect(mockResponse.customError).toHaveBeenCalledWith({
        body: {
          message: 'Workflow generation failed after 4 attempts. Last error: Validation failed',
        },
        statusCode: 500,
      });
      expect(result).toEqual(
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });

    it('logs the generation error', async () => {
      mockGenerateWorkflowWithRetries.mockResolvedValue({
        error: 'Generation failed',
        ok: false,
        retries: 3,
      });

      const getHandler = setupVersionHandler();
      const mockResponse = {
        customError: jest.fn((obj: unknown) => obj),
        ok: jest.fn(),
      };

      registerGenerateWorkflowRoute(mockRouter, mockLogger, {
        getStartServices: mockGetStartServices,
        workflowInitService: mockWorkflowInitService,
        workflowsManagementApi: mockWorkflowsManagementApi as never,
      });

      await getHandler()(
        {
          core: Promise.resolve({
            featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
          }),
        },
        mockRequest,
        mockResponse
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[generate_workflow] Generation failed: Generation failed'
      );
    });
  });

  describe('createWorkflow failure', () => {
    it('returns error when createWorkflow throws', async () => {
      mockWorkflowsManagementApi.createWorkflow.mockRejectedValue(
        new Error('Failed to create workflow')
      );

      const getHandler = setupVersionHandler();
      const mockResponse = {
        customError: jest.fn((obj: unknown) => obj),
        ok: jest.fn(),
      };

      registerGenerateWorkflowRoute(mockRouter, mockLogger, {
        getStartServices: mockGetStartServices,
        workflowInitService: mockWorkflowInitService,
        workflowsManagementApi: mockWorkflowsManagementApi as never,
      });

      await getHandler()(
        {
          core: Promise.resolve({
            featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
          }),
        },
        mockRequest,
        mockResponse
      );

      expect(mockResponse.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            message: 'Failed to create workflow',
          },
        })
      );
    });
  });

  describe('logging', () => {
    it('logs debug message at start of generation', async () => {
      const getHandler = setupVersionHandler();
      const mockResponse = {
        customError: jest.fn(),
        ok: jest.fn((obj: unknown) => obj),
      };

      registerGenerateWorkflowRoute(mockRouter, mockLogger, {
        getStartServices: mockGetStartServices,
        workflowInitService: mockWorkflowInitService,
        workflowsManagementApi: mockWorkflowsManagementApi as never,
      });

      await getHandler()(
        {
          core: Promise.resolve({
            featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
          }),
        },
        mockRequest,
        mockResponse
      );

      const startLogCall = (mockLogger.debug as jest.Mock).mock.calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'function' && arg().includes('Starting workflow generation');
      });
      expect(startLogCall).toBeDefined();
    });

    it('logs debug message on successful workflow creation', async () => {
      const getHandler = setupVersionHandler();
      const mockResponse = {
        customError: jest.fn(),
        ok: jest.fn((obj: unknown) => obj),
      };

      registerGenerateWorkflowRoute(mockRouter, mockLogger, {
        getStartServices: mockGetStartServices,
        workflowInitService: mockWorkflowInitService,
        workflowsManagementApi: mockWorkflowsManagementApi as never,
      });

      await getHandler()(
        {
          core: Promise.resolve({
            featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
          }),
        },
        mockRequest,
        mockResponse
      );

      const createdLogCall = (mockLogger.debug as jest.Mock).mock.calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'function' && arg().includes('Workflow created');
      });
      expect(createdLogCall).toBeDefined();
    });
  });
});
