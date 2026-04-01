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

import { assertWorkflowsEnabled } from '../../lib/assert_workflows_enabled';
import { DEFAULT_ROUTE_HANDLER_TIMEOUT_MS } from '../..';
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

const mockExecuteGenerationWorkflow = jest.fn().mockResolvedValue(undefined);

jest.mock('./helpers', () => ({
  executeGenerationWorkflow: (...args: unknown[]) => mockExecuteGenerationWorkflow(...args),
}));

const mockResolveConnectorDetails = jest.fn();

jest.mock('../../workflows/helpers/resolve_connector_details', () => ({
  resolveConnectorDetails: (...args: unknown[]) => mockResolveConnectorDetails(...args),
}));

const mockWorkflowInitService = {
  ensureWorkflowsForSpace: jest.fn().mockResolvedValue(null),
  verifyAndRepairWorkflows: jest.fn(),
};

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

    mockResolveConnectorDetails.mockResolvedValue({
      actionTypeId: '.gen-ai',
      connectorName: 'Test Connector',
    });

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
      security: {},
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
      workflowInitService: mockWorkflowInitService,
    });

    expect(mockRouter.versioned.post).toHaveBeenCalledWith({
      access: 'internal',
      path: '/internal/attack_discovery/_generate',
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
      workflowInitService: mockWorkflowInitService,
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
      workflowInitService: mockWorkflowInitService,
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
      workflowInitService: mockWorkflowInitService,
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
      workflowInitService: mockWorkflowInitService,
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
    it('returns bad request when neither default retrieval nor workflow IDs are provided', async () => {
      mockRequest.body = {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector',
        },
        type: 'attack_discovery',
        workflow_config: {
          alert_retrieval_workflow_ids: [],
          default_alert_retrieval_mode: 'disabled' as const,
          validation_workflow_id: 'default',
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
        workflowInitService: mockWorkflowInitService,
      });

      const handler = getVersionHandler(versionHandler);
      await handler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message:
            'At least one alert retrieval method must be specified: either set default_alert_retrieval_mode to a value other than "disabled", or provide alert_retrieval_workflow_ids',
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
          default_alert_retrieval_mode: 'custom_query' as const,
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
        workflowInitService: mockWorkflowInitService,
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
          default_alert_retrieval_mode: 'disabled' as const,
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
        workflowInitService: mockWorkflowInitService,
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
          default_alert_retrieval_mode: 'custom_query' as const,
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
        workflowInitService: mockWorkflowInitService,
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
        workflowInitService: mockWorkflowInitService,
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

    it('resolves action_type_id from connector_id when action_type_id is not provided', async () => {
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
        workflowInitService: mockWorkflowInitService,
      });

      await getHandler()(mockContext, mockRequest, mockResponse);

      expect(mockResolveConnectorDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'test-connector',
        })
      );

      expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          apiConfig: expect.objectContaining({
            action_type_id: '.gen-ai',
            connector_id: 'test-connector',
          }),
        })
      );
    });

    it('does not resolve action_type_id when it is already provided', async () => {
      mockRequest.body = {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.bedrock',
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
        workflowInitService: mockWorkflowInitService,
      });

      await getHandler()(mockContext, mockRequest, mockResponse);

      expect(mockResolveConnectorDetails).not.toHaveBeenCalled();
    });

    it('returns an error when connector resolution fails', async () => {
      mockResolveConnectorDetails.mockRejectedValue(
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
        workflowInitService: mockWorkflowInitService,
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
        workflowInitService: mockWorkflowInitService,
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
        workflowInitService: mockWorkflowInitService,
      });

      await getHandler()(mockContext, mockRequest, mockResponse);

      expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          alertsIndexPattern: '.alerts-security.alerts-default',
          executionUuid: 'test-execution-uuid',
          type: 'attack_discovery',
          workflowConfig: {
            alert_retrieval_workflow_ids: [],
            default_alert_retrieval_mode: 'custom_query' as const,
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
        workflowInitService: mockWorkflowInitService,
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
