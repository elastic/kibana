/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import type {
  DiagnosticsContext,
  WorkflowExecutionsTracking,
} from '@kbn/discoveries/impl/attack_discovery/persistence/event_logging';

import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import { registerGetPipelineDataRoute } from './get_pipeline_data';
import { getWorkflowExecutionsTracking } from './helpers/get_workflow_executions_tracking';

jest.mock('../../../lib/assert_workflows_enabled', () => ({
  assertWorkflowsEnabled: jest.fn().mockResolvedValue(null),
}));
import { extractPipelineAlertData } from './helpers/extract_pipeline_alert_data';
import { extractPipelineGenerationData } from './helpers/extract_pipeline_generation_data';
import { extractPipelineValidationData } from './helpers/extract_pipeline_validation_data';
import { computeCombinedAlerts } from './helpers/compute_combined_alerts';
import { getSpaceId } from '@kbn/discoveries/impl/lib/helpers/get_space_id';

jest.mock('./helpers/get_workflow_executions_tracking', () => ({
  getWorkflowExecutionsTracking: jest.fn(),
}));

jest.mock('./helpers/extract_pipeline_alert_data', () => ({
  extractPipelineAlertData: jest.fn(),
}));

jest.mock('./helpers/extract_pipeline_generation_data', () => ({
  extractPipelineGenerationData: jest.fn(),
}));

jest.mock('./helpers/extract_pipeline_validation_data', () => ({
  extractPipelineValidationData: jest.fn(),
}));

jest.mock('./helpers/compute_combined_alerts', () => ({
  computeCombinedAlerts: jest.fn(),
}));

jest.mock('@kbn/discoveries/impl/lib/helpers/get_space_id', () => ({
  getSpaceId: jest.fn(),
}));

const mockGetWorkflowExecutionsTracking = getWorkflowExecutionsTracking as jest.MockedFunction<
  typeof getWorkflowExecutionsTracking
>;
const mockExtractPipelineAlertData = extractPipelineAlertData as jest.MockedFunction<
  typeof extractPipelineAlertData
>;
const mockExtractPipelineGenerationData = extractPipelineGenerationData as jest.MockedFunction<
  typeof extractPipelineGenerationData
>;
const mockExtractPipelineValidationData = extractPipelineValidationData as jest.MockedFunction<
  typeof extractPipelineValidationData
>;
const mockComputeCombinedAlerts = computeCombinedAlerts as jest.MockedFunction<
  typeof computeCombinedAlerts
>;
const mockGetSpaceId = getSpaceId as jest.MockedFunction<typeof getSpaceId>;

const fullTracking: WorkflowExecutionsTracking = {
  alertRetrieval: [
    {
      workflowId: 'workflow-default-alert-retrieval',
      workflowRunId: 'alert-retrieval-run-id',
    },
  ],
  generation: {
    workflowId: 'workflow-generation',
    workflowRunId: 'generation-run-id',
  },
  validation: {
    workflowId: 'workflow-validate',
    workflowRunId: 'validation-run-id',
  },
};

describe('registerGetPipelineDataRoute', () => {
  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const mockEsClient = {
    search: jest.fn(),
  };

  const mockGetWorkflowExecution = jest.fn();

  const mockWorkflowsManagementApi = {
    getWorkflow: jest.fn(),
    getWorkflowExecution: mockGetWorkflowExecution,
    runWorkflow: jest.fn(),
  };

  const getStartServices = jest.fn().mockResolvedValue({
    coreStart: {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: mockEsClient,
          }),
        },
      },
    },
    pluginsStart: {
      spaces: { spacesService: null },
    },
  });

  const getEventLogIndex = jest.fn().mockResolvedValue('.kibana-event-log-test');

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSpaceId.mockReturnValue('default');
  });

  const mockWorkflowInitService = {
    ensureWorkflowsForSpace: jest.fn().mockResolvedValue(null),
    verifyAndRepairWorkflows: jest.fn(),
  };

  const registerAndGetHandler = (workflowsManagement: unknown = mockWorkflowsManagementApi) => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({
      addVersion: addVersionMock,
    });

    registerGetPipelineDataRoute(router, logger, {
      getEventLogIndex,
      getStartServices,
      workflowInitService: mockWorkflowInitService,
      workflowsManagementApi: workflowsManagement as Parameters<
        typeof registerGetPipelineDataRoute
      >[2]['workflowsManagementApi'],
    });

    return addVersionMock.mock.calls[0][1] as (
      ctx: unknown,
      req: unknown,
      res: unknown
    ) => Promise<unknown>;
  };

  const createRequest = (params = {}) =>
    httpServerMock.createKibanaRequest({
      params: {
        execution_id: 'test-execution-uuid',
        workflow_id: 'workflow-generation',
        ...params,
      },
    });

  it('returns 404 when workflows feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const handler = registerAndGetHandler();
    const request = createRequest();
    const response = httpServerMock.createResponseFactory();

    const result = await handler({}, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns 200 with full pipeline data on success', async () => {
    const handler = registerAndGetHandler();

    mockGetWorkflowExecutionsTracking.mockResolvedValue(fullTracking);
    mockGetWorkflowExecution.mockResolvedValue({ stepExecutions: [] });

    const mockAlertData = {
      alerts: ['alert-1', 'alert-2'],
      alerts_context_count: 2,
      extraction_strategy: 'default_esql' as const,
    };

    mockExtractPipelineAlertData.mockReturnValue(mockAlertData);

    const mockGenerationData = {
      attack_discoveries: [
        {
          alert_ids: ['alert-1'],
          details_markdown: 'details',
          summary_markdown: 'summary',
          title: 'Attack 1',
        },
      ],
      execution_uuid: 'test-execution-uuid',
      replacements: { key: 'value' },
    };

    mockExtractPipelineGenerationData.mockReturnValue(mockGenerationData);

    const mockValidationData = [
      {
        alert_ids: ['alert-1'],
        connector_id: 'test-connector',
        connector_name: 'Test Connector',
        details_markdown: 'details',
        generation_uuid: 'test-execution-uuid',
        id: 'discovery-1',
        summary_markdown: 'summary',
        timestamp: '2024-01-01T00:00:00Z',
        title: 'Attack 1',
      },
    ];

    mockExtractPipelineValidationData.mockReturnValue(mockValidationData);

    const mockCombinedAlerts = {
      alerts: ['alert-1', 'alert-2'],
      alerts_context_count: 2,
    };

    mockComputeCombinedAlerts.mockReturnValue(mockCombinedAlerts);

    const responseMock = httpServerMock.createResponseFactory();
    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      createRequest(),
      responseMock
    );

    expect(responseMock.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        alert_retrieval: [
          expect.objectContaining({
            alerts: ['alert-1', 'alert-2'],
            alerts_context_count: 2,
            extraction_strategy: 'default_esql',
            workflow_id: 'workflow-default-alert-retrieval',
            workflow_run_id: 'alert-retrieval-run-id',
          }),
        ],
        combined_alerts: mockCombinedAlerts,
        generation: mockGenerationData,
        validated_discoveries: mockValidationData,
        workflow_executions_tracking: {
          alert_retrieval: [
            {
              workflow_id: 'workflow-default-alert-retrieval',
              workflow_run_id: 'alert-retrieval-run-id',
            },
          ],
          generation: {
            workflow_id: 'workflow-generation',
            workflow_run_id: 'generation-run-id',
          },
          validation: {
            workflow_id: 'workflow-validate',
            workflow_run_id: 'validation-run-id',
          },
        },
      }),
    });
  });

  it('returns 404 when execution not found in event log', async () => {
    const handler = registerAndGetHandler();

    mockGetWorkflowExecutionsTracking.mockResolvedValue(null);

    const responseMock = httpServerMock.createResponseFactory();
    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      createRequest(),
      responseMock
    );

    expect(responseMock.notFound).toHaveBeenCalledWith({
      body: { message: 'Execution test-execution-uuid not found in event log' },
    });
  });

  it('returns 503 when workflowsManagementApi is not available', async () => {
    const handler = registerAndGetHandler(null);

    mockGetWorkflowExecutionsTracking.mockResolvedValue(fullTracking);

    const responseMock = httpServerMock.createResponseFactory();
    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      createRequest(),
      responseMock
    );

    expect(responseMock.customError).toHaveBeenCalledWith({
      body: { message: 'WorkflowsManagement API is not available' },
      statusCode: 503,
    });
  });

  it('returns null generation when generation execution not yet complete', async () => {
    const partialTracking: WorkflowExecutionsTracking = {
      alertRetrieval: [
        {
          workflowId: 'workflow-default-alert-retrieval',
          workflowRunId: 'alert-retrieval-run-id',
        },
      ],
      generation: {
        workflowId: 'workflow-generation',
        workflowRunId: 'generation-run-id',
      },
      validation: null,
    };

    const handler = registerAndGetHandler();

    mockGetWorkflowExecutionsTracking.mockResolvedValue(partialTracking);
    mockGetWorkflowExecution.mockResolvedValue({ stepExecutions: [] });

    mockExtractPipelineAlertData.mockReturnValue({
      alerts: ['alert-1'],
      alerts_context_count: 1,
      extraction_strategy: 'default_esql' as const,
    });

    // Generation step not yet complete: extractPipelineGenerationData returns null
    mockExtractPipelineGenerationData.mockReturnValue(null);

    mockComputeCombinedAlerts.mockReturnValue({
      alerts: ['alert-1'],
      alerts_context_count: 1,
    });

    const responseMock = httpServerMock.createResponseFactory();
    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      createRequest(),
      responseMock
    );

    expect(responseMock.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        generation: null,
        validated_discoveries: null,
      }),
    });
  });

  it('returns null validation when validation has not started', async () => {
    const trackingWithoutValidation: WorkflowExecutionsTracking = {
      alertRetrieval: null,
      generation: {
        workflowId: 'workflow-generation',
        workflowRunId: 'generation-run-id',
      },
      validation: null,
    };

    const handler = registerAndGetHandler();

    mockGetWorkflowExecutionsTracking.mockResolvedValue(trackingWithoutValidation);
    mockGetWorkflowExecution.mockResolvedValue({ stepExecutions: [] });

    mockExtractPipelineGenerationData.mockReturnValue({
      attack_discoveries: [],
      execution_uuid: 'test-uuid',
      replacements: {},
    });

    const responseMock = httpServerMock.createResponseFactory();
    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      createRequest(),
      responseMock
    );

    expect(responseMock.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        alert_retrieval: null,
        combined_alerts: null,
        validated_discoveries: null,
      }),
    });
  });

  it('handles errors and returns customError', async () => {
    const handler = registerAndGetHandler();

    mockGetWorkflowExecutionsTracking.mockRejectedValue(new Error('Event log query failed'));

    const responseMock = httpServerMock.createResponseFactory();
    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      createRequest(),
      responseMock
    );

    expect(responseMock.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        body: expect.objectContaining({
          message: 'Event log query failed',
        }),
      })
    );
  });

  it('warns and skips when alert extraction fails for a workflow', async () => {
    const handler = registerAndGetHandler();

    mockGetWorkflowExecutionsTracking.mockResolvedValue(fullTracking);
    mockGetWorkflowExecution.mockResolvedValue({ stepExecutions: [] });

    mockExtractPipelineAlertData.mockImplementation(() => {
      throw new Error('Alert retrieval workflow failed');
    });

    mockExtractPipelineGenerationData.mockReturnValue(null);
    mockExtractPipelineValidationData.mockReturnValue(null);

    const responseMock = httpServerMock.createResponseFactory();
    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      createRequest(),
      responseMock
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to extract alert data')
    );

    expect(responseMock.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        alert_retrieval: null,
        combined_alerts: null,
      }),
    });
  });

  it('fetches correct workflow executions by workflowRunId and spaceId', async () => {
    const handler = registerAndGetHandler();

    mockGetWorkflowExecutionsTracking.mockResolvedValue(fullTracking);
    mockGetWorkflowExecution.mockResolvedValue({ stepExecutions: [] });

    mockExtractPipelineAlertData.mockReturnValue({
      alerts: [],
      alerts_context_count: 0,
      extraction_strategy: 'default_esql' as const,
    });

    mockExtractPipelineGenerationData.mockReturnValue(null);
    mockExtractPipelineValidationData.mockReturnValue(null);

    mockComputeCombinedAlerts.mockReturnValue({
      alerts: [],
      alerts_context_count: 0,
    });

    const responseMock = httpServerMock.createResponseFactory();
    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      createRequest(),
      responseMock
    );

    expect(mockGetWorkflowExecution).toHaveBeenCalledWith('alert-retrieval-run-id', 'default', {
      includeInput: true,
      includeOutput: true,
    });

    expect(mockGetWorkflowExecution).toHaveBeenCalledWith('generation-run-id', 'default', {
      includeInput: false,
      includeOutput: true,
    });

    expect(mockGetWorkflowExecution).toHaveBeenCalledWith('validation-run-id', 'default', {
      includeOutput: true,
    });
  });

  it('warns and returns null generation when generation execution fails', async () => {
    const trackingWithOrchestrator: WorkflowExecutionsTracking = {
      alertRetrieval: null,
      generation: {
        workflowId: 'workflow-generation',
        workflowRunId: 'generation-run-id',
      },
      validation: null,
    };

    const handler = registerAndGetHandler();

    mockGetWorkflowExecutionsTracking.mockResolvedValue(trackingWithOrchestrator);
    mockGetWorkflowExecution.mockRejectedValue(new Error('Orchestrator API error'));

    const responseMock = httpServerMock.createResponseFactory();
    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      createRequest(),
      responseMock
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to extract generation data from generation workflow')
    );

    expect(responseMock.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        generation: null,
      }),
    });
  });

  it('warns and returns null validation when validation execution fails', async () => {
    const trackingWithValidation: WorkflowExecutionsTracking = {
      alertRetrieval: null,
      generation: null,
      validation: {
        workflowId: 'workflow-validate',
        workflowRunId: 'validation-run-id',
      },
    };

    const handler = registerAndGetHandler();

    mockGetWorkflowExecutionsTracking.mockResolvedValue(trackingWithValidation);
    mockGetWorkflowExecution.mockRejectedValue(new Error('Validation API error'));

    const responseMock = httpServerMock.createResponseFactory();
    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      createRequest(),
      responseMock
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to extract validation data from workflow')
    );

    expect(responseMock.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        validated_discoveries: null,
      }),
    });
  });

  it('includes diagnostics_context in response when tracking contains diagnosticsContext', async () => {
    const mockDiagnosticsContext: DiagnosticsContext = {
      config: {
        alertRetrievalMode: 'default_esql',
        alertRetrievalWorkflowCount: 1,
        connectorType: '.gen-ai',
        hasCustomValidation: false,
      },
      preExecutionChecks: [
        { check: 'Connector availability', message: 'Connector is reachable', passed: true },
      ],
      workflowIntegrity: {
        repaired: [],
        status: 'all_intact',
        unrepairableErrors: [],
      },
    };

    const trackingWithDiagnostics = {
      ...fullTracking,
      diagnosticsContext: mockDiagnosticsContext,
    };

    const handler = registerAndGetHandler();

    mockGetWorkflowExecutionsTracking.mockResolvedValue(trackingWithDiagnostics);
    mockGetWorkflowExecution.mockResolvedValue({ stepExecutions: [] });
    mockExtractPipelineAlertData.mockReturnValue({
      alerts: [],
      alerts_context_count: 0,
      extraction_strategy: 'default_esql' as const,
    });
    mockExtractPipelineGenerationData.mockReturnValue(null);
    mockExtractPipelineValidationData.mockReturnValue(null);
    mockComputeCombinedAlerts.mockReturnValue({ alerts: [], alerts_context_count: 0 });

    const responseMock = httpServerMock.createResponseFactory();
    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      createRequest(),
      responseMock
    );

    expect(responseMock.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        diagnostics_context: mockDiagnosticsContext,
      }),
    });
  });

  it('returns 404 when the feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const handler = registerAndGetHandler();
    const responseMock = httpServerMock.createResponseFactory();

    const result = await handler({}, createRequest(), responseMock);

    expect(result).toEqual(mockNotFoundResponse);
    expect(responseMock.ok).not.toHaveBeenCalled();
  });

  it('omits diagnostics_context from response when tracking has none', async () => {
    const handler = registerAndGetHandler();

    mockGetWorkflowExecutionsTracking.mockResolvedValue(fullTracking);
    mockGetWorkflowExecution.mockResolvedValue({ stepExecutions: [] });
    mockExtractPipelineAlertData.mockReturnValue({
      alerts: [],
      alerts_context_count: 0,
      extraction_strategy: 'default_esql' as const,
    });
    mockExtractPipelineGenerationData.mockReturnValue(null);
    mockExtractPipelineValidationData.mockReturnValue(null);
    mockComputeCombinedAlerts.mockReturnValue({ alerts: [], alerts_context_count: 0 });

    const responseMock = httpServerMock.createResponseFactory();
    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      createRequest(),
      responseMock
    );

    expect(responseMock.ok).toHaveBeenCalledWith({
      body: expect.not.objectContaining({
        diagnostics_context: expect.anything(),
      }),
    });
  });

  it('registers the route with correct path and security', () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({
      addVersion: addVersionMock,
    });

    registerGetPipelineDataRoute(router, logger, {
      getEventLogIndex,
      getStartServices,
      workflowInitService: mockWorkflowInitService,
      workflowsManagementApi: mockWorkflowsManagementApi as unknown as Parameters<
        typeof registerGetPipelineDataRoute
      >[2]['workflowsManagementApi'],
    });

    expect(router.versioned.get).toHaveBeenCalledWith(
      expect.objectContaining({
        access: 'internal',
        path: '/internal/attack_discovery/workflow/{workflow_id}/execution/{execution_id}',
        security: {
          authz: {
            requiredPrivileges: ['securitySolution-attackDiscoveryAll'],
          },
        },
      })
    );
  });
});
