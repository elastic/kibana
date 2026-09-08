/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';

import { executeGenerationWorkflow } from './execute_generation_workflow';
import { WorkflowExecutionAuthorizationError } from './assert_authorized_to_execute_workflows';
import type { GetStartServices } from './types';

const mockWriteAttackDiscoveryEvent = jest.fn();
const mockFetchAnonymizationFields = jest.fn();
const mockRefreshEventLogIndex = jest.fn().mockResolvedValue(undefined);
const mockRunManualOrchestration = jest.fn();

jest.mock('./get_workflow_loading_message', () => ({
  getWorkflowLoadingMessage: () => 'loading...',
}));

jest.mock('../persistence/event_logging', () => ({
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED: 'generation-failed',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED: 'generation-started',
  writeAttackDiscoveryEvent: (...args: unknown[]) => mockWriteAttackDiscoveryEvent(...args),
}));

jest.mock('../../lib/persistence', () => ({
  getDurationNanoseconds: () => '1000000',
}));

jest.mock('../../lib/helpers/get_space_id', () => ({
  getSpaceId: () => 'default',
}));

const mockIsWorkflowsEnabled = jest.fn();
jest.mock('../../lib/helpers/is_workflows_enabled', () => ({
  isWorkflowsEnabled: (...args: unknown[]) => mockIsWorkflowsEnabled(...args),
}));

jest.mock('./fetch_anonymization_fields', () => ({
  fetchAnonymizationFields: (...args: unknown[]) => mockFetchAnonymizationFields(...args),
}));

jest.mock('./refresh_event_log_index', () => ({
  refreshEventLogIndex: (...args: unknown[]) => mockRefreshEventLogIndex(...args),
}));

jest.mock('./run_manual_orchestration', () => ({
  ...jest.requireActual('./run_manual_orchestration/helpers/pipeline_step_error'),
  runManualOrchestration: (...args: unknown[]) => mockRunManualOrchestration(...args),
}));

const mockReportWorkflowSuccess = jest.fn();
const mockReportWorkflowError = jest.fn();
jest.mock('../../lib/telemetry/report_workflow_telemetry', () => ({
  reportWorkflowError: (...args: unknown[]) => mockReportWorkflowError(...args),
  reportWorkflowSuccess: (...args: unknown[]) => mockReportWorkflowSuccess(...args),
}));

const mockAnonymizationFields = [
  {
    allowed: true,
    anonymized: false,
    field: 'host.name',
    id: 'field-1',
  },
  {
    allowed: true,
    anonymized: true,
    field: 'user.name',
    id: 'field-2',
  },
];

/**
 * Authorized-by-default authz mock: `hasAllRequested` is true so the guard at
 * the top of `executeGenerationWorkflow` resolves. (Unauthorized-path
 * enforcement assertions are added in a later bead.)
 */
const createAuthorizedAuthzMock = () =>
  ({
    actions: { api: { get: (privilege: string) => `api:${privilege}` } },
    checkPrivilegesWithRequest: () => ({
      atSpace: async () => ({ hasAllRequested: true, privileges: { kibana: [] } }),
    }),
  } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['authz']);

/**
 * Unauthorized authz mock: `hasAllRequested` is false so the guard at the top of
 * `executeGenerationWorkflow` throws `WorkflowExecutionAuthorizationError` before
 * any workflow can run.
 */
const createUnauthorizedAuthzMock = () =>
  ({
    actions: { api: { get: (privilege: string) => `api:${privilege}` } },
    checkPrivilegesWithRequest: () => ({
      atSpace: async () => ({ hasAllRequested: false, privileges: { kibana: [] } }),
    }),
  } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['authz']);

describe('executeGenerationWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFetchAnonymizationFields.mockResolvedValue(mockAnonymizationFields);
    mockRunManualOrchestration.mockResolvedValue({ outcome: 'validation_succeeded' });
    mockIsWorkflowsEnabled.mockResolvedValue(true);
  });

  it('writes generation-started event without stub workflowRunId', async () => {
    const mockEventLogger: jest.Mocked<IEventLogger> = {
      logEvent: jest.fn(),
    } as unknown as jest.Mocked<IEventLogger>;

    const coreStartMock: CoreStart = {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: {
              indices: {
                refresh: jest.fn().mockResolvedValue(undefined),
              },
              security: {
                authenticate: jest.fn().mockResolvedValue({ username: 'test-user' }),
              },
            },
          }),
        },
      },
      http: { basePath: { get: jest.fn().mockReturnValue('') } },
    } as unknown as CoreStart;

    const pluginsStartMock: Record<string, unknown> = {};

    const mockGetStartServices: GetStartServices = async () => ({
      coreStart: coreStartMock,
      pluginsStart: pluginsStartMock,
    });

    await executeGenerationWorkflow({
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector-id',
        model: 'gpt-4',
      },
      authz: createAuthorizedAuthzMock(),
      executionUuid: 'test-execution-uuid',
      getEventLogIndex: async () => '.kibana-event-log-test',
      getEventLogger: async () => mockEventLogger,
      getStartServices: mockGetStartServices,
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
      } as unknown as Logger,
      request: {} as unknown as KibanaRequest,
      type: 'attack_discovery',
      workflowConfig: {
        alert_retrieval_workflow_ids: ['default-attack-discovery-alert-retrieval'],
        alert_retrieval_mode: 'custom_query' as const,
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: true,
        skill_enabled: true,
        validation_workflow_id: 'default',
      },
      workflowsManagementApi: {
        createWorkflow: jest.fn(),
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest.fn(),
        getWorkflows: jest.fn(),
        runWorkflow: jest.fn(),
      } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['workflowsManagementApi'],
    });

    expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'generation-started',
      })
    );

    const [firstCallArgs] = mockWriteAttackDiscoveryEvent.mock.calls[0];

    expect(firstCallArgs).not.toHaveProperty('workflowRunId');
  });

  it('fetches anonymization fields and passes them to runManualOrchestration', async () => {
    const mockEventLogger: jest.Mocked<IEventLogger> = {
      logEvent: jest.fn(),
    } as unknown as jest.Mocked<IEventLogger>;

    const coreStartMock: CoreStart = {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: {
              indices: {
                refresh: jest.fn().mockResolvedValue(undefined),
              },
              security: {
                authenticate: jest.fn().mockResolvedValue({ username: 'test-user' }),
              },
            },
          }),
        },
      },
      http: { basePath: { get: jest.fn().mockReturnValue('') } },
    } as unknown as CoreStart;

    const pluginsStartMock: Record<string, unknown> = {};

    const mockGetStartServices: GetStartServices = async () => ({
      coreStart: coreStartMock,
      pluginsStart: pluginsStartMock,
    });

    await executeGenerationWorkflow({
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector-id',
        model: 'gpt-4',
      },
      authz: createAuthorizedAuthzMock(),
      executionUuid: 'test-execution-uuid',
      getEventLogIndex: async () => '.kibana-event-log-test',
      getEventLogger: async () => mockEventLogger,
      getStartServices: mockGetStartServices,
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
      } as unknown as Logger,
      request: {} as unknown as KibanaRequest,
      type: 'attack_discovery',
      workflowConfig: {
        alert_retrieval_workflow_ids: [],
        alert_retrieval_mode: 'custom_query' as const,
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: true,
        skill_enabled: true,
        validation_workflow_id: 'default',
      },
      workflowsManagementApi: {
        createWorkflow: jest.fn(),
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest.fn(),
        getWorkflows: jest.fn(),
        runWorkflow: jest.fn(),
      } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['workflowsManagementApi'],
    });

    expect(mockFetchAnonymizationFields).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'default',
      })
    );

    expect(mockRunManualOrchestration).toHaveBeenCalledWith(
      expect.objectContaining({
        anonymizationFields: mockAnonymizationFields,
      })
    );
  });

  it('returns the ManualOrchestrationOutcome from runManualOrchestration', async () => {
    const mockOutcome = {
      alertRetrievalResult: { alertsContextCount: 5 },
      generationResult: { attackDiscoveries: [{ title: 'Test' }] },
      outcome: 'validation_succeeded',
      validationResult: {
        duplicatesDroppedCount: 0,
        generatedCount: 1,
        success: true,
        validationSummary: {
          generatedCount: 1,
          persistedCount: 1,
        },
      },
    };

    mockRunManualOrchestration.mockResolvedValue(mockOutcome);

    const mockEventLogger: jest.Mocked<IEventLogger> = {
      logEvent: jest.fn(),
    } as unknown as jest.Mocked<IEventLogger>;

    const coreStartMock: CoreStart = {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: {
              indices: {
                refresh: jest.fn().mockResolvedValue(undefined),
              },
              security: {
                authenticate: jest.fn().mockResolvedValue({ username: 'test-user' }),
              },
            },
          }),
        },
      },
      http: { basePath: { get: jest.fn().mockReturnValue('') } },
    } as unknown as CoreStart;

    const pluginsStartMock: Record<string, unknown> = {};

    const mockGetStartServices: GetStartServices = async () => ({
      coreStart: coreStartMock,
      pluginsStart: pluginsStartMock,
    });

    const result = await executeGenerationWorkflow({
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector-id',
        model: 'gpt-4',
      },
      authz: createAuthorizedAuthzMock(),
      executionUuid: 'test-execution-uuid',
      getEventLogIndex: async () => '.kibana-event-log-test',
      getEventLogger: async () => mockEventLogger,
      getStartServices: mockGetStartServices,
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
      } as unknown as Logger,
      request: {} as unknown as KibanaRequest,
      type: 'attack_discovery',
      workflowConfig: {
        alert_retrieval_workflow_ids: [],
        alert_retrieval_mode: 'custom_query' as const,
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: true,
        skill_enabled: true,
        validation_workflow_id: 'default',
      },
      workflowsManagementApi: {
        createWorkflow: jest.fn(),
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest.fn(),
        getWorkflows: jest.fn(),
        runWorkflow: jest.fn(),
      } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['workflowsManagementApi'],
    });

    expect(result).toEqual(mockOutcome);
  });

  it('calls reportWorkflowSuccess with duplicatesDroppedCount when analytics is provided', async () => {
    const mockOutcome = {
      alertRetrievalResult: { alertsContextCount: 5 },
      generationResult: { attackDiscoveries: [{ title: 'Test' }] },
      outcome: 'validation_succeeded' as const,
      validationResult: {
        duplicatesDroppedCount: 2,
        generatedCount: 1,
        success: true,
        validationSummary: {
          duplicatesDroppedCount: 2,
          generatedCount: 1,
          persistedCount: 1,
        },
      },
    };

    mockRunManualOrchestration.mockResolvedValue(mockOutcome);

    const mockAnalytics = { reportEvent: jest.fn() };
    const mockEventLogger: jest.Mocked<IEventLogger> = {
      logEvent: jest.fn(),
    } as unknown as jest.Mocked<IEventLogger>;

    const coreStartMock: CoreStart = {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: {
              indices: {
                refresh: jest.fn().mockResolvedValue(undefined),
              },
              security: {
                authenticate: jest.fn().mockResolvedValue({ username: 'test-user' }),
              },
            },
          }),
        },
      },
      http: { basePath: { get: jest.fn().mockReturnValue('') } },
    } as unknown as CoreStart;

    const pluginsStartMock: Record<string, unknown> = {};

    const mockGetStartServices: GetStartServices = async () => ({
      coreStart: coreStartMock,
      pluginsStart: pluginsStartMock,
    });

    await executeGenerationWorkflow({
      analytics: mockAnalytics as never,
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector-id',
        model: 'gpt-4',
      },
      authz: createAuthorizedAuthzMock(),
      executionUuid: 'test-execution-uuid',
      getEventLogIndex: async () => '.kibana-event-log-test',
      getEventLogger: async () => mockEventLogger,
      getStartServices: mockGetStartServices,
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
      } as unknown as Logger,
      request: {} as unknown as KibanaRequest,
      type: 'attack_discovery',
      workflowConfig: {
        alert_retrieval_workflow_ids: [],
        alert_retrieval_mode: 'custom_query' as const,
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: true,
        skill_enabled: true,
        validation_workflow_id: 'default',
      },
      workflowsManagementApi: {
        createWorkflow: jest.fn(),
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest.fn(),
        getWorkflows: jest.fn(),
        runWorkflow: jest.fn(),
      } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['workflowsManagementApi'],
    });

    expect(mockReportWorkflowSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          duplicatesDroppedCount: 2,
        }),
      })
    );
  });

  it('reports validation_discoveries_count using persistedCount (not generatedCount)', async () => {
    const mockOutcome = {
      alertRetrievalResult: { alertsContextCount: 5 },
      generationResult: { attackDiscoveries: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] },
      outcome: 'validation_succeeded' as const,
      validationResult: {
        duplicatesDroppedCount: 1,
        generatedCount: 3,
        success: true,
        validationSummary: {
          duplicatesDroppedCount: 1,
          generatedCount: 3,
          persistedCount: 2,
        },
      },
    };

    mockRunManualOrchestration.mockResolvedValue(mockOutcome);

    const mockAnalytics = { reportEvent: jest.fn() };
    const mockEventLogger: jest.Mocked<IEventLogger> = {
      logEvent: jest.fn(),
    } as unknown as jest.Mocked<IEventLogger>;

    const coreStartMock: CoreStart = {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: {
              indices: { refresh: jest.fn().mockResolvedValue(undefined) },
              security: { authenticate: jest.fn().mockResolvedValue({ username: 'test-user' }) },
            },
          }),
        },
      },
      http: { basePath: { get: jest.fn().mockReturnValue('') } },
    } as unknown as CoreStart;

    const mockGetStartServices: GetStartServices = async () => ({
      coreStart: coreStartMock,
      pluginsStart: {},
    });

    await executeGenerationWorkflow({
      analytics: mockAnalytics as never,
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector-id',
        model: 'gpt-4',
      },
      authz: createAuthorizedAuthzMock(),
      executionUuid: 'test-execution-uuid',
      getEventLogIndex: async () => '.kibana-event-log-test',
      getEventLogger: async () => mockEventLogger,
      getStartServices: mockGetStartServices,
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
      } as unknown as Logger,
      request: {} as unknown as KibanaRequest,
      type: 'attack_discovery',
      workflowConfig: {
        alert_retrieval_workflow_ids: [],
        alert_retrieval_mode: 'custom_query' as const,
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: true,
        skill_enabled: true,
        validation_workflow_id: 'default',
      },
      workflowsManagementApi: {
        createWorkflow: jest.fn(),
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest.fn(),
        getWorkflows: jest.fn(),
        runWorkflow: jest.fn(),
      } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['workflowsManagementApi'],
    });

    expect(mockReportWorkflowSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          validation_discoveries_count: 2, // persistedCount, not generatedCount (3)
        }),
      })
    );
  });

  it('reports hallucinations_filtered_count when available in validationSummary', async () => {
    const mockOutcome = {
      alertRetrievalResult: { alertsContextCount: 5 },
      generationResult: { attackDiscoveries: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] },
      outcome: 'validation_succeeded' as const,
      validationResult: {
        duplicatesDroppedCount: 0,
        generatedCount: 3,
        success: true,
        validationSummary: {
          generatedCount: 3,
          hallucinationsFilteredCount: 1,
          persistedCount: 2,
        },
      },
    };

    mockRunManualOrchestration.mockResolvedValue(mockOutcome);

    const mockAnalytics = { reportEvent: jest.fn() };
    const mockEventLogger: jest.Mocked<IEventLogger> = {
      logEvent: jest.fn(),
    } as unknown as jest.Mocked<IEventLogger>;

    const coreStartMock: CoreStart = {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: {
              indices: { refresh: jest.fn().mockResolvedValue(undefined) },
              security: { authenticate: jest.fn().mockResolvedValue({ username: 'test-user' }) },
            },
          }),
        },
      },
      http: { basePath: { get: jest.fn().mockReturnValue('') } },
    } as unknown as CoreStart;

    const mockGetStartServices: GetStartServices = async () => ({
      coreStart: coreStartMock,
      pluginsStart: {},
    });

    await executeGenerationWorkflow({
      analytics: mockAnalytics as never,
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector-id',
        model: 'gpt-4',
      },
      authz: createAuthorizedAuthzMock(),
      executionUuid: 'test-execution-uuid',
      getEventLogIndex: async () => '.kibana-event-log-test',
      getEventLogger: async () => mockEventLogger,
      getStartServices: mockGetStartServices,
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
      } as unknown as Logger,
      request: {} as unknown as KibanaRequest,
      type: 'attack_discovery',
      workflowConfig: {
        alert_retrieval_workflow_ids: [],
        alert_retrieval_mode: 'custom_query' as const,
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: true,
        skill_enabled: true,
        validation_workflow_id: 'default',
      },
      workflowsManagementApi: {
        createWorkflow: jest.fn(),
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest.fn(),
        getWorkflows: jest.fn(),
        runWorkflow: jest.fn(),
      } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['workflowsManagementApi'],
    });

    expect(mockReportWorkflowSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          hallucinations_filtered_count: 1,
          validation_discoveries_count: 2,
        }),
      })
    );
  });

  it('omits hallucinations_filtered_count when not present in validationSummary', async () => {
    const mockOutcome = {
      alertRetrievalResult: { alertsContextCount: 5 },
      generationResult: { attackDiscoveries: [{ title: 'A' }] },
      outcome: 'validation_succeeded' as const,
      validationResult: {
        generatedCount: 1,
        success: true,
        validationSummary: {
          generatedCount: 1,
          persistedCount: 1,
        },
      },
    };

    mockRunManualOrchestration.mockResolvedValue(mockOutcome);

    const mockAnalytics = { reportEvent: jest.fn() };
    const mockEventLogger: jest.Mocked<IEventLogger> = {
      logEvent: jest.fn(),
    } as unknown as jest.Mocked<IEventLogger>;

    const coreStartMock: CoreStart = {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: {
              indices: { refresh: jest.fn().mockResolvedValue(undefined) },
              security: { authenticate: jest.fn().mockResolvedValue({ username: 'test-user' }) },
            },
          }),
        },
      },
      http: { basePath: { get: jest.fn().mockReturnValue('') } },
    } as unknown as CoreStart;

    const mockGetStartServices: GetStartServices = async () => ({
      coreStart: coreStartMock,
      pluginsStart: {},
    });

    await executeGenerationWorkflow({
      analytics: mockAnalytics as never,
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector-id',
        model: 'gpt-4',
      },
      authz: createAuthorizedAuthzMock(),
      executionUuid: 'test-execution-uuid',
      getEventLogIndex: async () => '.kibana-event-log-test',
      getEventLogger: async () => mockEventLogger,
      getStartServices: mockGetStartServices,
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
      } as unknown as Logger,
      request: {} as unknown as KibanaRequest,
      type: 'attack_discovery',
      workflowConfig: {
        alert_retrieval_workflow_ids: [],
        alert_retrieval_mode: 'custom_query' as const,
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: true,
        skill_enabled: true,
        validation_workflow_id: 'default',
      },
      workflowsManagementApi: {
        createWorkflow: jest.fn(),
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest.fn(),
        getWorkflows: jest.fn(),
        runWorkflow: jest.fn(),
      } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['workflowsManagementApi'],
    });

    const call = mockReportWorkflowSuccess.mock.calls[0][0] as {
      params: Record<string, unknown>;
    };
    expect(call.params.hallucinations_filtered_count).toBeUndefined();
  });

  it('passes repaired workflow IDs (not original stale IDs) to runManualOrchestration', async () => {
    const mockEventLogger: jest.Mocked<IEventLogger> = {
      logEvent: jest.fn(),
    } as unknown as jest.Mocked<IEventLogger>;

    const coreStartMock: CoreStart = {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: {
              indices: { refresh: jest.fn().mockResolvedValue(undefined) },
              security: { authenticate: jest.fn().mockResolvedValue({ username: 'test-user' }) },
            },
          }),
        },
      },
      http: { basePath: { get: jest.fn().mockReturnValue('') } },
    } as unknown as CoreStart;

    await executeGenerationWorkflow({
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector-id',
        model: 'gpt-4',
      },
      authz: createAuthorizedAuthzMock(),
      checkIntegrity: async () => ({
        optionalRepaired: [],
        optionalWarnings: [],
        repaired: [{ key: 'generation', workflowId: 'new-generation-id-after-repair' }],
        status: 'repaired',
        unrepairableErrors: [],
      }),
      executionUuid: 'test-execution-uuid',
      getEventLogIndex: async () => '.kibana-event-log-test',
      getEventLogger: async () => mockEventLogger,
      getStartServices: async () => ({ coreStart: coreStartMock, pluginsStart: {} }),
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
      } as unknown as Logger,
      request: {} as unknown as KibanaRequest,
      type: 'attack_discovery',
      workflowConfig: {
        alert_retrieval_workflow_ids: [],
        alert_retrieval_mode: 'custom_query' as const,
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: true,
        skill_enabled: true,
        validation_workflow_id: 'default',
      },
      workflowsManagementApi: {
        createWorkflow: jest.fn(),
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest.fn(),
        getWorkflows: jest.fn(),
        runWorkflow: jest.fn(),
      } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['workflowsManagementApi'],
    });

    // The repaired generation workflow ID must be used, not the original stale ID
    expect(mockRunManualOrchestration).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultWorkflowIds: expect.objectContaining({
          generation: 'new-generation-id-after-repair',
        }),
      })
    );
  });

  it('writes generation-failed event when fetchAnonymizationFields throws', async () => {
    const anonymizationError = new Error('No anonymization fields found for space default');
    mockFetchAnonymizationFields.mockRejectedValue(anonymizationError);

    const mockEventLogger: jest.Mocked<IEventLogger> = {
      logEvent: jest.fn(),
    } as unknown as jest.Mocked<IEventLogger>;

    const coreStartMock: CoreStart = {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: {
              indices: {
                refresh: jest.fn().mockResolvedValue(undefined),
              },
              security: {
                authenticate: jest.fn().mockResolvedValue({ username: 'test-user' }),
              },
            },
          }),
        },
      },
      http: { basePath: { get: jest.fn().mockReturnValue('') } },
    } as unknown as CoreStart;

    const pluginsStartMock: Record<string, unknown> = {};

    const mockGetStartServices: GetStartServices = async () => ({
      coreStart: coreStartMock,
      pluginsStart: pluginsStartMock,
    });

    await expect(
      executeGenerationWorkflow({
        alertsIndexPattern: '.alerts-security.alerts-default',
        apiConfig: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector-id',
          model: 'gpt-4',
        },
        authz: createAuthorizedAuthzMock(),
        executionUuid: 'test-execution-uuid',
        getEventLogIndex: async () => '.kibana-event-log-test',
        getEventLogger: async () => mockEventLogger,
        getStartServices: mockGetStartServices,
        logger: {
          debug: jest.fn(),
          error: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
        } as unknown as Logger,
        request: {} as unknown as KibanaRequest,
        type: 'attack_discovery',
        workflowConfig: {
          alert_retrieval_workflow_ids: [],
          alert_retrieval_mode: 'custom_query' as const,
          alert_retrieval_workflows_enabled: false,
          default_retrieval_enabled: true,
          skill_enabled: true,
          validation_workflow_id: 'default',
        },
        workflowsManagementApi: {
          createWorkflow: jest.fn(),
          getWorkflow: jest.fn(),
          getWorkflowExecution: jest.fn(),
          getWorkflows: jest.fn(),
          runWorkflow: jest.fn(),
        } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['workflowsManagementApi'],
      })
    ).rejects.toThrow(anonymizationError);

    // Verify that a generation-failed event was written to the event log,
    // even though the error occurred before runManualOrchestration was called.
    // This requires the event logger to be initialized BEFORE fetchAnonymizationFields.
    expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'generation-failed',
      })
    );
  });

  describe('when shouldStopExecution() reports the rule was cancelled (timed out)', () => {
    const buildCancelledRunArgs = () => {
      const mockEventLogger: jest.Mocked<IEventLogger> = {
        logEvent: jest.fn(),
      } as unknown as jest.Mocked<IEventLogger>;

      const coreStartMock: CoreStart = {
        elasticsearch: {
          client: {
            asScoped: () => ({
              asCurrentUser: {
                indices: {
                  refresh: jest.fn().mockResolvedValue(undefined),
                },
                security: {
                  authenticate: jest.fn().mockResolvedValue({ username: 'test-user' }),
                },
              },
            }),
          },
        },
        http: { basePath: { get: jest.fn().mockReturnValue('') } },
      } as unknown as CoreStart;

      const mockGetStartServices: GetStartServices = async () => ({
        coreStart: coreStartMock,
        pluginsStart: {},
      });

      return {
        alertsIndexPattern: '.alerts-security.alerts-default',
        apiConfig: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector-id',
          model: 'gpt-4',
        },
        authz: createAuthorizedAuthzMock(),
        executionUuid: 'test-execution-uuid',
        getEventLogIndex: async () => '.kibana-event-log-test',
        getEventLogger: async () => mockEventLogger,
        getStartServices: mockGetStartServices,
        logger: {
          debug: jest.fn(),
          error: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
        } as unknown as Logger,
        request: {} as unknown as KibanaRequest,
        shouldStopExecution: () => true,
        source: 'scheduled' as const,
        type: 'attack_discovery',
        workflowConfig: {
          alert_retrieval_workflow_ids: [],
          alert_retrieval_mode: 'custom_query' as const,
          alert_retrieval_workflows_enabled: false,
          default_retrieval_enabled: true,
          skill_enabled: true,
          validation_workflow_id: 'default',
        },
        workflowsManagementApi: {
          createWorkflow: jest.fn(),
          getWorkflow: jest.fn(),
          getWorkflowExecution: jest.fn(),
          getWorkflows: jest.fn(),
          runWorkflow: jest.fn(),
        } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['workflowsManagementApi'],
      };
    };

    it('rejects with a timeout error after the orchestration completes', async () => {
      await expect(executeGenerationWorkflow(buildCancelledRunArgs())).rejects.toThrow(
        'Rule execution cancelled due to timeout'
      );
    });

    it('writes a generation-failed event so the UI reflects the real outcome', async () => {
      await expect(executeGenerationWorkflow(buildCancelledRunArgs())).rejects.toThrow();

      expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'generation-failed',
        })
      );
    });
  });

  it('passes scheduleInfo to reportWorkflowSuccess when provided', async () => {
    const mockOutcome = {
      alertRetrievalResult: { alertsContextCount: 5 },
      generationResult: { attackDiscoveries: [{ title: 'Test' }] },
      outcome: 'validation_succeeded' as const,
      validationResult: {
        duplicatesDroppedCount: 0,
        generatedCount: 1,
        success: true,
        validationSummary: {
          generatedCount: 1,
          persistedCount: 1,
        },
      },
    };

    mockRunManualOrchestration.mockResolvedValue(mockOutcome);

    const mockAnalytics = { reportEvent: jest.fn() };
    const mockEventLogger: jest.Mocked<IEventLogger> = {
      logEvent: jest.fn(),
    } as unknown as jest.Mocked<IEventLogger>;

    const coreStartMock: CoreStart = {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: {
              indices: { refresh: jest.fn().mockResolvedValue(undefined) },
              security: { authenticate: jest.fn().mockResolvedValue({ username: 'test-user' }) },
            },
          }),
        },
      },
      http: { basePath: { get: jest.fn().mockReturnValue('') } },
    } as unknown as CoreStart;

    const scheduleInfo = { actions: ['action-type-1'], id: 'rule-id-1', interval: '1h' };

    await executeGenerationWorkflow({
      analytics: mockAnalytics as never,
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector-id',
        model: 'gpt-4',
      },
      authz: createAuthorizedAuthzMock(),
      executionUuid: 'test-execution-uuid',
      getEventLogIndex: async () => '.kibana-event-log-test',
      getEventLogger: async () => mockEventLogger,
      getStartServices: async () => ({ coreStart: coreStartMock, pluginsStart: {} }),
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
      } as unknown as Logger,
      request: {} as unknown as KibanaRequest,
      scheduleInfo,
      type: 'attack_discovery',
      workflowConfig: {
        alert_retrieval_workflow_ids: [],
        alert_retrieval_mode: 'custom_query' as const,
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: true,
        skill_enabled: true,
        validation_workflow_id: 'default',
      },
      workflowsManagementApi: {
        createWorkflow: jest.fn(),
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest.fn(),
        getWorkflows: jest.fn(),
        runWorkflow: jest.fn(),
      } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['workflowsManagementApi'],
    });

    expect(mockReportWorkflowSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          scheduleInfo,
        }),
      })
    );
  });

  it('passes scheduleInfo to reportWorkflowError when provided', async () => {
    const pipelineError = new Error('generation failed');
    mockRunManualOrchestration.mockRejectedValue(pipelineError);

    const mockAnalytics = { reportEvent: jest.fn() };
    const mockEventLogger: jest.Mocked<IEventLogger> = {
      logEvent: jest.fn(),
    } as unknown as jest.Mocked<IEventLogger>;

    const coreStartMock: CoreStart = {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: {
              indices: { refresh: jest.fn().mockResolvedValue(undefined) },
              security: { authenticate: jest.fn().mockResolvedValue({ username: 'test-user' }) },
            },
          }),
        },
      },
      http: { basePath: { get: jest.fn().mockReturnValue('') } },
    } as unknown as CoreStart;

    const scheduleInfo = { actions: ['action-type-1'], id: 'rule-id-1', interval: '1h' };

    await expect(
      executeGenerationWorkflow({
        analytics: mockAnalytics as never,
        alertsIndexPattern: '.alerts-security.alerts-default',
        apiConfig: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector-id',
          model: 'gpt-4',
        },
        authz: createAuthorizedAuthzMock(),
        executionUuid: 'test-execution-uuid',
        getEventLogIndex: async () => '.kibana-event-log-test',
        getEventLogger: async () => mockEventLogger,
        getStartServices: async () => ({ coreStart: coreStartMock, pluginsStart: {} }),
        logger: {
          debug: jest.fn(),
          error: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
        } as unknown as Logger,
        request: {} as unknown as KibanaRequest,
        scheduleInfo,
        type: 'attack_discovery',
        workflowConfig: {
          alert_retrieval_workflow_ids: [],
          alert_retrieval_mode: 'custom_query' as const,
          alert_retrieval_workflows_enabled: false,
          default_retrieval_enabled: true,
          skill_enabled: true,
          validation_workflow_id: 'default',
        },
        workflowsManagementApi: {
          createWorkflow: jest.fn(),
          getWorkflow: jest.fn(),
          getWorkflowExecution: jest.fn(),
          getWorkflows: jest.fn(),
          runWorkflow: jest.fn(),
        } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['workflowsManagementApi'],
      })
    ).rejects.toThrow(pipelineError);

    expect(mockReportWorkflowError).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          scheduleInfo,
        }),
      })
    );
  });

  it('omits scheduleInfo from telemetry when not provided (ad-hoc execution)', async () => {
    const mockOutcome = {
      alertRetrievalResult: { alertsContextCount: 5 },
      generationResult: { attackDiscoveries: [{ title: 'Test' }] },
      outcome: 'validation_succeeded' as const,
      validationResult: {
        duplicatesDroppedCount: 0,
        generatedCount: 1,
        success: true,
        validationSummary: {
          generatedCount: 1,
          persistedCount: 1,
        },
      },
    };

    mockRunManualOrchestration.mockResolvedValue(mockOutcome);

    const mockAnalytics = { reportEvent: jest.fn() };
    const mockEventLogger: jest.Mocked<IEventLogger> = {
      logEvent: jest.fn(),
    } as unknown as jest.Mocked<IEventLogger>;

    const coreStartMock: CoreStart = {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: {
              indices: { refresh: jest.fn().mockResolvedValue(undefined) },
              security: { authenticate: jest.fn().mockResolvedValue({ username: 'test-user' }) },
            },
          }),
        },
      },
      http: { basePath: { get: jest.fn().mockReturnValue('') } },
    } as unknown as CoreStart;

    await executeGenerationWorkflow({
      analytics: mockAnalytics as never,
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector-id',
        model: 'gpt-4',
      },
      authz: createAuthorizedAuthzMock(),
      executionUuid: 'test-execution-uuid',
      getEventLogIndex: async () => '.kibana-event-log-test',
      getEventLogger: async () => mockEventLogger,
      getStartServices: async () => ({ coreStart: coreStartMock, pluginsStart: {} }),
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
      } as unknown as Logger,
      request: {} as unknown as KibanaRequest,
      type: 'attack_discovery',
      workflowConfig: {
        alert_retrieval_workflow_ids: [],
        alert_retrieval_mode: 'custom_query' as const,
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: true,
        skill_enabled: true,
        validation_workflow_id: 'default',
      },
      workflowsManagementApi: {
        createWorkflow: jest.fn(),
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest.fn(),
        getWorkflows: jest.fn(),
        runWorkflow: jest.fn(),
      } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['workflowsManagementApi'],
    });

    const successCall = mockReportWorkflowSuccess.mock.calls[0][0] as {
      params: Record<string, unknown>;
    };
    expect(successCall.params.scheduleInfo).toBeUndefined();
  });

  it('refreshes the event log index after writing generation-failed so the UI can immediately detect the failure', async () => {
    // Bug 1: When the pipeline fails (e.g. because a custom alert retrieval workflow
    // was deleted), the generation-failed event is written but refreshEventLogIndex
    // is NOT called. This leaves the UI polling in "loading" state indefinitely
    // because it only sees "generation-started" until a periodic ES refresh fires.
    const pipelineError = new Error(
      '1 custom alert retrieval workflow(s) failed: wf-id (not found)'
    );
    mockRunManualOrchestration.mockRejectedValue(pipelineError);

    const mockEventLogger: jest.Mocked<IEventLogger> = {
      logEvent: jest.fn(),
    } as unknown as jest.Mocked<IEventLogger>;

    const coreStartMock: CoreStart = {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: {
              indices: {
                refresh: jest.fn().mockResolvedValue(undefined),
              },
              security: {
                authenticate: jest.fn().mockResolvedValue({ username: 'test-user' }),
              },
            },
          }),
        },
      },
      http: { basePath: { get: jest.fn().mockReturnValue('') } },
    } as unknown as CoreStart;

    await expect(
      executeGenerationWorkflow({
        alertsIndexPattern: '.alerts-security.alerts-default',
        apiConfig: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector-id',
          model: 'gpt-4',
        },
        authz: createAuthorizedAuthzMock(),
        executionUuid: 'test-execution-uuid',
        getEventLogIndex: async () => '.kibana-event-log-test',
        getEventLogger: async () => mockEventLogger,
        getStartServices: async () => ({ coreStart: coreStartMock, pluginsStart: {} }),
        logger: {
          debug: jest.fn(),
          error: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
        } as unknown as Logger,
        request: {} as unknown as KibanaRequest,
        type: 'attack_discovery',
        workflowConfig: {
          alert_retrieval_workflow_ids: [],
          alert_retrieval_mode: 'custom_query' as const,
          alert_retrieval_workflows_enabled: false,
          default_retrieval_enabled: true,
          skill_enabled: true,
          validation_workflow_id: 'default',
        },
        workflowsManagementApi: {
          createWorkflow: jest.fn(),
          getWorkflow: jest.fn(),
          getWorkflowExecution: jest.fn(),
          getWorkflows: jest.fn(),
          runWorkflow: jest.fn(),
        } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['workflowsManagementApi'],
      })
    ).rejects.toThrow(pipelineError);

    // generation-failed must be written
    expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'generation-failed' })
    );

    // The event log index must be refreshed AFTER writing generation-failed so the UI
    // sees the failure immediately rather than remaining stuck in "loading" state.
    const failedWriteCallOrderIndex = mockWriteAttackDiscoveryEvent.mock.calls.findIndex(
      (args) => (args[0] as Record<string, unknown>)?.action === 'generation-failed'
    );
    expect(failedWriteCallOrderIndex).toBeGreaterThanOrEqual(0);

    const failedWriteCallOrder =
      mockWriteAttackDiscoveryEvent.mock.invocationCallOrder[failedWriteCallOrderIndex];

    // There must be at least one refreshEventLogIndex call AFTER the generation-failed write.
    // (There may also be a call in the happy-path try block before the failure.)
    const hasRefreshAfterFailedWrite = mockRefreshEventLogIndex.mock.invocationCallOrder.some(
      (order) => order > failedWriteCallOrder
    );
    expect(hasRefreshAfterFailedWrite).toBe(true);
  });

  describe('workflow-execution authorization guard', () => {
    const buildRunArgs = (authz: Parameters<typeof executeGenerationWorkflow>[0]['authz']) => {
      const mockEventLogger: jest.Mocked<IEventLogger> = {
        logEvent: jest.fn(),
      } as unknown as jest.Mocked<IEventLogger>;

      const coreStartMock: CoreStart = {
        elasticsearch: {
          client: {
            asScoped: () => ({
              asCurrentUser: {
                indices: { refresh: jest.fn().mockResolvedValue(undefined) },
                security: { authenticate: jest.fn().mockResolvedValue({ username: 'test-user' }) },
              },
            }),
          },
        },
        http: { basePath: { get: jest.fn().mockReturnValue('') } },
      } as unknown as CoreStart;

      return {
        alertsIndexPattern: '.alerts-security.alerts-default',
        apiConfig: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector-id',
          model: 'gpt-4',
        },
        authz,
        executionUuid: 'test-execution-uuid',
        getEventLogIndex: async () => '.kibana-event-log-test',
        getEventLogger: async () => mockEventLogger,
        getStartServices: async () => ({ coreStart: coreStartMock, pluginsStart: {} }),
        logger: {
          debug: jest.fn(),
          error: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
        } as unknown as Logger,
        request: {} as unknown as KibanaRequest,
        type: 'attack_discovery',
        workflowConfig: {
          alert_retrieval_workflow_ids: [],
          alert_retrieval_mode: 'custom_query' as const,
          alert_retrieval_workflows_enabled: false,
          default_retrieval_enabled: true,
          skill_enabled: true,
          validation_workflow_id: 'default',
        },
        workflowsManagementApi: {
          createWorkflow: jest.fn(),
          getWorkflow: jest.fn(),
          getWorkflowExecution: jest.fn(),
          getWorkflows: jest.fn(),
          runWorkflow: jest.fn(),
        } as unknown as Parameters<typeof executeGenerationWorkflow>[0]['workflowsManagementApi'],
      };
    };

    it('never runs a workflow (does not reach runManualOrchestration) when unauthorized', async () => {
      await executeGenerationWorkflow(buildRunArgs(createUnauthorizedAuthzMock())).catch(() => {});

      expect(mockRunManualOrchestration).not.toHaveBeenCalled();
    });

    it('throws WorkflowExecutionAuthorizationError when unauthorized', async () => {
      await expect(
        executeGenerationWorkflow(buildRunArgs(createUnauthorizedAuthzMock()))
      ).rejects.toBeInstanceOf(WorkflowExecutionAuthorizationError);
    });

    it('proceeds to runManualOrchestration when authorized', async () => {
      await executeGenerationWorkflow(buildRunArgs(createAuthorizedAuthzMock()));

      expect(mockRunManualOrchestration).toHaveBeenCalled();
    });

    it('throws and never runs a workflow when the feature flag is OFF', async () => {
      mockIsWorkflowsEnabled.mockResolvedValue(false);

      await expect(
        executeGenerationWorkflow(buildRunArgs(createAuthorizedAuthzMock()))
      ).rejects.toThrow('Attack Discovery workflows are not enabled');

      expect(mockRunManualOrchestration).not.toHaveBeenCalled();
    });
  });
});
