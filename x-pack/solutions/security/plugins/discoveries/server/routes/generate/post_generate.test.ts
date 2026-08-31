/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { IEventLogger } from '@kbn/event-log-plugin/server';

import { AT_LEAST_ONE_RETRIEVAL_TOGGLE_MESSAGE } from '@kbn/discoveries-schemas';

import { assertWorkflowsEnabled } from '../../lib/assert_workflows_enabled';
import { DEFAULT_ROUTE_HANDLER_TIMEOUT_MS } from '../constants';
import { registerGenerateRoute } from './post_generate';

jest.mock('../../lib/assert_workflows_enabled', () => ({
  assertWorkflowsEnabled: jest.fn().mockResolvedValue(null),
}));

const mockAnalytics = coreMock.createSetup().analytics;

jest.mock('@kbn/discoveries/impl/attack_discovery/persistence/event_logging', () => ({
  ...jest.requireActual('@kbn/discoveries/impl/attack_discovery/persistence/event_logging'),
  writeAttackDiscoveryEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-execution-uuid'),
}));

/**
 * Authorized-by-default authz mock: `hasAllRequested` is true so the route's
 * up-front workflow-execution authorization pre-check resolves. (Unauthorized
 * 403 assertions are added in a later bead.)
 */
const createAuthorizedAuthzMock = () => ({
  actions: { api: { get: (privilege: string) => `api:${privilege}` } },
  checkPrivilegesWithRequest: () => ({
    atSpace: async () => ({ hasAllRequested: true, privileges: { kibana: [] } }),
  }),
});

/**
 * Unauthorized authz mock: `hasAllRequested` is false so the route's up-front
 * workflow-execution authorization pre-check throws
 * `WorkflowExecutionAuthorizationError`, which the handler converts to an HTTP
 * 403.
 */
const createUnauthorizedAuthzMock = () => ({
  actions: { api: { get: (privilege: string) => `api:${privilege}` } },
  checkPrivilegesWithRequest: () => ({
    atSpace: async () => ({ hasAllRequested: false, privileges: { kibana: [] } }),
  }),
});

const mockExecuteGenerationWorkflow = jest.fn().mockResolvedValue(undefined);
const mockResolveApiConfig = jest.fn();

jest.mock('./helpers', () => ({
  executeGenerationWorkflow: (...args: unknown[]) => mockExecuteGenerationWorkflow(...args),
  resolveApiConfig: (...args: unknown[]) => mockResolveApiConfig(...args),
}));

describe('registerGenerateRoute', () => {
  let mockRouter: jest.Mocked<IRouter>;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockGetEventLogIndex: jest.Mock;
  let mockGetEventLogger: jest.Mock;
  let mockGetStartServices: jest.Mock;
  let mockCoreStart: any;
  let mockPluginsStart: any;
  let mockRequest: any;

  const getVersionHandler = (handler: Function | undefined): Function => {
    if (!handler) {
      throw new Error('Expected versioned route handler to be set');
    }

    return handler;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockResolveApiConfig.mockImplementation(
      ({ apiConfig }: { apiConfig: Record<string, unknown> }) =>
        Promise.resolve({ ...apiConfig, action_type_id: apiConfig.action_type_id || '.gen-ai' })
    );

    mockRouter = {
      versioned: {
        post: jest.fn().mockReturnThis(),
        addVersion: jest.fn(),
      },
    } as unknown as jest.Mocked<IRouter>;

    mockLogger = loggingSystemMock.createLogger();

    mockGetEventLogIndex = jest.fn().mockResolvedValue('.kibana-event-log');
    mockGetEventLogger = jest.fn().mockResolvedValue({} as unknown as IEventLogger);

    mockRequest = {
      body: {},
    };

    mockCoreStart = {
      elasticsearch: {
        client: {
          asScoped: jest.fn().mockReturnValue({
            asCurrentUser: {
              security: {
                authenticate: jest.fn().mockResolvedValue({
                  authentication_provider: { name: 'basic', type: 'basic' },
                  email: 'test@example.com',
                  full_name: 'Test User',
                  roles: [],
                  username: 'test-user',
                }),
              },
            },
          }),
        },
      },
      savedObjects: {
        getScopedClient: jest.fn(),
      },
    };

    mockPluginsStart = {
      actions: {
        getActionsClientWithRequest: jest.fn().mockResolvedValue({
          get: jest.fn().mockResolvedValue({
            actionTypeId: '.gen-ai',
            name: 'Test Connector',
          }),
        }),
      },
      security: { authz: createAuthorizedAuthzMock() },
    };

    mockGetStartServices = jest.fn().mockResolvedValue({
      coreStart: mockCoreStart,
      pluginsStart: mockPluginsStart,
    });
  });

  it('registers the route with correct path and options', () => {
    registerGenerateRoute(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    expect(mockRouter.versioned.post).toHaveBeenCalledWith({
      access: 'internal',
      path: '/internal/attack_discovery/_generate',
      security: {
        authz: {
          requiredPrivileges: [
            'securitySolution-attackDiscoveryAll',
            'alerts-read',
            'workflowsManagement:read',
            'workflowsManagement:execute',
          ],
        },
      },
      options: {
        timeout: {
          idleSocket: DEFAULT_ROUTE_HANDLER_TIMEOUT_MS,
        },
      },
    });
  });

  it('registers the route with ATTACK_DISCOVERY_API_ACTION_ALL in requiredPrivileges', () => {
    registerGenerateRoute(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    expect(mockRouter.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        security: expect.objectContaining({
          authz: expect.objectContaining({
            requiredPrivileges: expect.arrayContaining(['securitySolution-attackDiscoveryAll']),
          }),
        }),
      })
    );
  });

  it('registers the route with the workflows read + execute privileges in requiredPrivileges', () => {
    registerGenerateRoute(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    expect(mockRouter.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        security: expect.objectContaining({
          authz: expect.objectContaining({
            requiredPrivileges: expect.arrayContaining([
              'workflowsManagement:read',
              'workflowsManagement:execute',
            ]),
          }),
        }),
      })
    );
  });

  it('returns 404 when workflows feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    mockRequest.body = {
      alerts_index_pattern: '.alerts-security.alerts-default',
      api_config: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector',
      },
      type: 'attack_discovery',
    };

    const mockResponse = {
      badRequest: jest.fn(),
      customError: jest.fn(),
      ok: jest.fn(),
    };

    const mockContext = {};
    let versionHandler: Function | undefined;

    (mockRouter.versioned.post as jest.Mock).mockReturnValue({
      addVersion: jest.fn((config, handler) => {
        versionHandler = handler;
      }),
    });

    registerGenerateRoute(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    const handler = getVersionHandler(versionHandler);
    const result = await handler(mockContext, mockRequest, mockResponse);

    expect(result).toEqual(mockNotFoundResponse);
    expect(mockResponse.ok).not.toHaveBeenCalled();
  });

  it('returns execution_uuid in response', async () => {
    mockRequest.body = {
      alerts_index_pattern: '.alerts-security.alerts-default',
      api_config: {
        connector_id: 'test-connector',
        action_type_id: '.gen-ai',
      },
      type: 'attack_discovery',
    };

    const mockResponse = {
      ok: jest.fn((obj) => obj),
      badRequest: jest.fn(),
      customError: jest.fn(),
    };

    const mockContext = {
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    let versionHandler: Function | undefined;

    (mockRouter.versioned.post as jest.Mock).mockReturnValue({
      addVersion: jest.fn((config, handler) => {
        versionHandler = handler;
      }),
    });

    registerGenerateRoute(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    const handler = getVersionHandler(versionHandler);
    const result = await handler(mockContext, mockRequest, mockResponse);

    expect(result).toEqual({
      body: {
        execution_uuid: 'test-execution-uuid',
      },
    });
    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        execution_uuid: 'test-execution-uuid',
      },
    });
  });

  it('returns bad request for invalid body', async () => {
    mockRequest.body = {
      // Missing required fields
    };

    const mockResponse = {
      ok: jest.fn(),
      badRequest: jest.fn((obj) => obj),
      customError: jest.fn(),
    };

    const mockContext = {
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    let versionHandler: Function | undefined;

    (mockRouter.versioned.post as jest.Mock).mockReturnValue({
      addVersion: jest.fn((config, handler) => {
        versionHandler = handler;
      }),
    });

    registerGenerateRoute(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    const handler = getVersionHandler(versionHandler);
    await handler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.badRequest).toHaveBeenCalled();
  });

  it('logs the start of generation', async () => {
    mockRequest.body = {
      alerts_index_pattern: '.alerts-security.alerts-default',
      api_config: {
        connector_id: 'test-connector',
        action_type_id: '.gen-ai',
      },
      type: 'attack_discovery',
    };

    const mockResponse = {
      ok: jest.fn((obj) => obj),
      badRequest: jest.fn(),
      customError: jest.fn(),
    };

    const mockContext = {
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    let versionHandler: Function | undefined;

    (mockRouter.versioned.post as jest.Mock).mockReturnValue({
      addVersion: jest.fn((config, handler) => {
        versionHandler = handler;
      }),
    });

    registerGenerateRoute(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    const handler = getVersionHandler(versionHandler);
    await handler(mockContext, mockRequest, mockResponse);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(
        'Starting Attack discovery attack_discovery pipeline via generation workflow'
      )
    );
  });

  describe('workflow_config validation', () => {
    it('returns bad request when no retrieval toggle is enabled', async () => {
      mockRequest.body = {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector',
        },
        type: 'attack_discovery',
        workflow_config: {
          alert_retrieval_workflows_enabled: false,
          default_retrieval_enabled: false,
          skill_enabled: false,
        },
      };

      const mockResponse = {
        badRequest: jest.fn((obj) => obj),
        customError: jest.fn(),
        ok: jest.fn(),
      };

      const mockContext = {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      };

      let versionHandler: Function | undefined;

      (mockRouter.versioned.post as jest.Mock).mockReturnValue({
        addVersion: jest.fn((config, handler) => {
          versionHandler = handler;
        }),
      });

      registerGenerateRoute(mockRouter, mockLogger, {
        analytics: mockAnalytics,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
      });

      const handler = getVersionHandler(versionHandler);
      await handler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message: AT_LEAST_ONE_RETRIEVAL_TOGGLE_MESSAGE,
        },
      });
    });

    it('accepts workflow_config with default retrieval enabled', async () => {
      mockRequest.body = {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector',
        },
        type: 'attack_discovery',
        workflow_config: {
          alert_retrieval_workflow_ids: [],
          alert_retrieval_mode: 'custom_query' as const,
          validation_workflow_id: 'default',
        },
      };

      const mockResponse = {
        badRequest: jest.fn(),
        customError: jest.fn(),
        ok: jest.fn((obj) => obj),
      };

      const mockContext = {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      };

      let versionHandler: Function | undefined;

      (mockRouter.versioned.post as jest.Mock).mockReturnValue({
        addVersion: jest.fn((config, handler) => {
          versionHandler = handler;
        }),
      });

      registerGenerateRoute(mockRouter, mockLogger, {
        analytics: mockAnalytics,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
      });

      const handler = getVersionHandler(versionHandler);
      await handler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          execution_uuid: 'test-execution-uuid',
        },
      });
    });

    it('accepts workflow_config with workflow IDs provided', async () => {
      mockRequest.body = {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector',
        },
        type: 'attack_discovery',
        workflow_config: {
          alert_retrieval_workflow_ids: ['workflow-1', 'workflow-2'],
          alert_retrieval_workflows_enabled: true,
          default_retrieval_enabled: false,
          skill_enabled: false,
          validation_workflow_id: 'custom-validation',
        },
      };

      const mockResponse = {
        badRequest: jest.fn(),
        customError: jest.fn(),
        ok: jest.fn((obj) => obj),
      };

      const mockContext = {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      };

      let versionHandler: Function | undefined;

      (mockRouter.versioned.post as jest.Mock).mockReturnValue({
        addVersion: jest.fn((config, handler) => {
          versionHandler = handler;
        }),
      });

      registerGenerateRoute(mockRouter, mockLogger, {
        analytics: mockAnalytics,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
      });

      const handler = getVersionHandler(versionHandler);
      await handler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          execution_uuid: 'test-execution-uuid',
        },
      });
    });

    it('logs workflow configuration when provided', async () => {
      mockRequest.body = {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector',
        },
        type: 'attack_discovery',
        workflow_config: {
          alert_retrieval_workflow_ids: ['workflow-1'],
          alert_retrieval_mode: 'custom_query' as const,
          validation_workflow_id: 'custom-validation',
        },
      };

      const mockResponse = {
        badRequest: jest.fn(),
        customError: jest.fn(),
        ok: jest.fn((obj) => obj),
      };

      const mockContext = {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      };

      let versionHandler: Function | undefined;

      (mockRouter.versioned.post as jest.Mock).mockReturnValue({
        addVersion: jest.fn((config, handler) => {
          versionHandler = handler;
        }),
      });

      registerGenerateRoute(mockRouter, mockLogger, {
        analytics: mockAnalytics,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
      });

      const handler = getVersionHandler(versionHandler);
      await handler(mockContext, mockRequest, mockResponse);

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
      const debugCall = (mockLogger.debug as jest.Mock).mock.calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'function' && arg().includes('Workflow configuration');
      });
      expect(debugCall).toBeDefined();
    });

    it('uses default workflow_config when not provided', async () => {
      mockRequest.body = {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector',
        },
        type: 'attack_discovery',
      };

      const mockResponse = {
        badRequest: jest.fn(),
        customError: jest.fn(),
        ok: jest.fn((obj) => obj),
      };

      const mockContext = {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      };

      let versionHandler: Function | undefined;

      (mockRouter.versioned.post as jest.Mock).mockReturnValue({
        addVersion: jest.fn((config, handler) => {
          versionHandler = handler;
        }),
      });

      registerGenerateRoute(mockRouter, mockLogger, {
        analytics: mockAnalytics,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
      });

      const handler = getVersionHandler(versionHandler);
      await handler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          execution_uuid: 'test-execution-uuid',
        },
      });
    });
  });

  describe('action_type_id resolution', () => {
    const setVersionHandler = () => {
      let versionHandler: Function | undefined;

      (mockRouter.versioned.post as jest.Mock).mockReturnValue({
        addVersion: jest.fn((config, handler) => {
          versionHandler = handler;
        }),
      });

      return () => getVersionHandler(versionHandler);
    };

    it('calls resolveApiConfig with the request api_config, getStartServices, logger, and request', async () => {
      mockRequest.body = {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          connector_id: 'test-connector',
        },
        type: 'attack_discovery',
      };

      const mockResponse = {
        badRequest: jest.fn(),
        customError: jest.fn(),
        ok: jest.fn((obj) => obj),
      };

      const mockContext = {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      };
      const getHandler = setVersionHandler();

      registerGenerateRoute(mockRouter, mockLogger, {
        analytics: mockAnalytics,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
      });

      await getHandler()(mockContext, mockRequest, mockResponse);

      expect(mockResolveApiConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          apiConfig: expect.objectContaining({
            connector_id: 'test-connector',
          }),
          getStartServices: mockGetStartServices,
        })
      );
    });

    it('passes the resolved api_config from resolveApiConfig to executeGenerationWorkflow', async () => {
      const resolvedConfig = {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector',
      };

      mockResolveApiConfig.mockResolvedValue(resolvedConfig);

      mockRequest.body = {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          connector_id: 'test-connector',
        },
        type: 'attack_discovery',
      };

      const mockResponse = {
        badRequest: jest.fn(),
        customError: jest.fn(),
        ok: jest.fn((obj) => obj),
      };

      const mockContext = {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      };
      const getHandler = setVersionHandler();

      registerGenerateRoute(mockRouter, mockLogger, {
        analytics: mockAnalytics,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
      });

      await getHandler()(mockContext, mockRequest, mockResponse);

      expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          apiConfig: resolvedConfig,
        })
      );
    });

    it('returns an error when resolveApiConfig fails', async () => {
      mockResolveApiConfig.mockRejectedValue(
        new Error('Failed to resolve connector details for test-connector: Not found')
      );

      mockRequest.body = {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          connector_id: 'test-connector',
        },
        type: 'attack_discovery',
      };

      const mockResponse = {
        badRequest: jest.fn(),
        customError: jest.fn((obj) => obj),
        ok: jest.fn(),
      };

      const mockContext = {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      };
      const getHandler = setVersionHandler();

      registerGenerateRoute(mockRouter, mockLogger, {
        analytics: mockAnalytics,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
      });

      await getHandler()(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            message: expect.stringContaining('Failed to resolve connector details'),
          }),
        })
      );
    });
  });

  describe('generation workflow execution', () => {
    const setVersionHandler = () => {
      let versionHandler: Function | undefined;

      (mockRouter.versioned.post as jest.Mock).mockReturnValue({
        addVersion: jest.fn((config, handler) => {
          versionHandler = handler;
        }),
      });

      return () => getVersionHandler(versionHandler);
    };

    it('returns bad request when alerts_index_pattern is empty', async () => {
      mockRequest.body = {
        alerts_index_pattern: '',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector',
        },
        type: 'attack_discovery',
      };

      const mockResponse = {
        badRequest: jest.fn((obj) => obj),
        customError: jest.fn(),
        ok: jest.fn(),
      };

      const mockContext = {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      };
      const getHandler = setVersionHandler();

      registerGenerateRoute(mockRouter, mockLogger, {
        analytics: mockAnalytics,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
      });

      await getHandler()(mockContext, mockRequest, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message: 'alerts_index_pattern is required for pipeline kickoff',
        },
      });
    });

    it('calls executeGenerationWorkflow for pipeline requests', async () => {
      mockRequest.body = {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector',
        },
        type: 'attack_discovery',
      };

      const mockResponse = {
        badRequest: jest.fn(),
        customError: jest.fn(),
        ok: jest.fn((obj) => obj),
      };

      const mockContext = {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      };
      const getHandler = setVersionHandler();

      registerGenerateRoute(mockRouter, mockLogger, {
        analytics: mockAnalytics,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
      });

      await getHandler()(mockContext, mockRequest, mockResponse);

      expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          alertsIndexPattern: '.alerts-security.alerts-default',
          executionUuid: 'test-execution-uuid',
          type: 'attack_discovery',
          workflowConfig: {
            alert_retrieval_mode: 'custom_query' as const,
            alert_retrieval_workflow_ids: [],
            alert_retrieval_workflows_enabled: false,
            default_retrieval_enabled: false,
            skill_enabled: true,
            validation_workflow_id: 'default',
          },
        })
      );
    });

    it('returns execution_uuid in response for pipeline requests', async () => {
      mockRequest.body = {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector',
        },
        type: 'attack_discovery',
      };

      const mockResponse = {
        badRequest: jest.fn(),
        customError: jest.fn(),
        ok: jest.fn((obj) => obj),
      };

      const mockContext = {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      };
      const getHandler = setVersionHandler();

      registerGenerateRoute(mockRouter, mockLogger, {
        analytics: mockAnalytics,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
      });

      await getHandler()(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          execution_uuid: 'test-execution-uuid',
        },
      });
    });
  });

  describe('workflow-execution authorization', () => {
    const validBody = {
      alerts_index_pattern: '.alerts-security.alerts-default',
      api_config: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector',
      },
      type: 'attack_discovery',
    };

    const mockContext = {
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    const setVersionHandler = () => {
      let versionHandler: Function | undefined;

      (mockRouter.versioned.post as jest.Mock).mockReturnValue({
        addVersion: jest.fn((config, handler) => {
          versionHandler = handler;
        }),
      });

      return () => getVersionHandler(versionHandler);
    };

    it('returns 403 when the caller is unauthorized to execute workflows', async () => {
      mockPluginsStart.security.authz = createUnauthorizedAuthzMock();
      mockRequest.body = validBody;

      const mockResponse = {
        badRequest: jest.fn(),
        customError: jest.fn(),
        forbidden: jest.fn((obj) => obj),
        ok: jest.fn(),
      };
      const getHandler = setVersionHandler();

      registerGenerateRoute(mockRouter, mockLogger, {
        analytics: mockAnalytics,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
      });

      await getHandler()(mockContext, mockRequest, mockResponse);

      expect(mockResponse.forbidden).toHaveBeenCalled();
    });

    it('does not start the generation pipeline when the caller is unauthorized', async () => {
      mockPluginsStart.security.authz = createUnauthorizedAuthzMock();
      mockRequest.body = validBody;

      const mockResponse = {
        badRequest: jest.fn(),
        customError: jest.fn(),
        forbidden: jest.fn((obj) => obj),
        ok: jest.fn(),
      };
      const getHandler = setVersionHandler();

      registerGenerateRoute(mockRouter, mockLogger, {
        analytics: mockAnalytics,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
      });

      await getHandler()(mockContext, mockRequest, mockResponse);

      expect(mockExecuteGenerationWorkflow).not.toHaveBeenCalled();
    });

    it('returns 200 with execution_uuid when the caller is authorized', async () => {
      mockRequest.body = validBody;

      const mockResponse = {
        badRequest: jest.fn(),
        customError: jest.fn(),
        forbidden: jest.fn(),
        ok: jest.fn((obj) => obj),
      };
      const getHandler = setVersionHandler();

      registerGenerateRoute(mockRouter, mockLogger, {
        analytics: mockAnalytics,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
      });

      await getHandler()(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          execution_uuid: 'test-execution-uuid',
        },
      });
    });
  });
});
