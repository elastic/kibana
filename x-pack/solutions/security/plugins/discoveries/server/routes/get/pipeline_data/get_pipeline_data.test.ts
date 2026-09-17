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
import { registerGetPipelineDataRoute, type GetPipelineDataResponse } from './get_pipeline_data';
import { getWorkflowExecutionsTracking } from './helpers/get_workflow_executions_tracking';
import type { EventLogData } from './helpers/get_workflow_executions_tracking';

jest.mock('../../../lib/assert_workflows_enabled', () => ({
  assertWorkflowsEnabled: jest.fn().mockResolvedValue(null),
}));
import { extractPipelineAlertData } from './helpers/extract_pipeline_alert_data';
import { extractPipelineGateData } from './helpers/extract_pipeline_gate_data';
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

jest.mock('./helpers/extract_pipeline_gate_data', () => ({
  extractPipelineGateData: jest.fn(),
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
const mockExtractPipelineGateData = extractPipelineGateData as jest.MockedFunction<
  typeof extractPipelineGateData
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

  const mockGetCurrentUser = jest.fn();

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
      security: {
        authc: {
          getCurrentUser: mockGetCurrentUser,
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
    mockGetCurrentUser.mockReturnValue({ username: 'test-user' });
  });

  const registerAndGetHandler = (workflowsManagement: unknown = mockWorkflowsManagementApi) => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({
      addVersion: addVersionMock,
    });

    registerGetPipelineDataRoute(router, logger, {
      getEventLogIndex,
      getStartServices,
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
          gate: null,
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

  it('surfaces gate-bucket runs in alert_retrieval with a gate-aware (kept + added) count', async () => {
    const trackingWithGate: WorkflowExecutionsTracking = {
      alertRetrieval: [
        {
          workflowId: 'workflow-default-alert-retrieval',
          workflowRunId: 'alert-retrieval-run-id',
        },
      ],
      gate: [
        {
          workflowId: 'system-attack-discovery-skill-alert-retrieval',
          workflowRunId: 'gate-run-id',
        },
      ],
      generation: {
        workflowId: 'workflow-generation',
        workflowRunId: 'generation-run-id',
      },
      validation: null,
    };

    const handler = registerAndGetHandler();

    mockGetWorkflowExecutionsTracking.mockResolvedValue(trackingWithGate);
    mockGetWorkflowExecution.mockResolvedValue({ stepExecutions: [] });
    mockExtractPipelineAlertData.mockReturnValue({
      alerts: ['alert-1', 'alert-2'],
      alerts_context_count: 2,
      extraction_strategy: 'default_esql' as const,
    });
    mockExtractPipelineGateData.mockReturnValue({
      alerts: [],
      alerts_context_count: 5,
      extraction_strategy: 'skill' as const,
    });
    mockExtractPipelineGenerationData.mockReturnValue(null);
    mockExtractPipelineValidationData.mockReturnValue(null);
    mockComputeCombinedAlerts.mockReturnValue({
      alerts: ['alert-1', 'alert-2'],
      alerts_context_count: 2,
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

    const body = responseMock.ok.mock.calls[0]?.[0]?.body as GetPipelineDataResponse;

    // gate run is surfaced in alert_retrieval, keyed by its run id, with the gate-aware count
    expect(body.alert_retrieval).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          alerts: [],
          alerts_context_count: 5,
          extraction_strategy: 'skill',
          workflow_id: 'system-attack-discovery-skill-alert-retrieval',
          workflow_run_id: 'gate-run-id',
        }),
      ])
    );

    // gate runs are excluded from the combined alert-retrieval computation
    expect(mockComputeCombinedAlerts).toHaveBeenCalledWith([
      expect.objectContaining({ workflow_run_id: 'alert-retrieval-run-id' }),
    ]);

    // gate bucket is surfaced in the snake_case tracking response
    expect(body.workflow_executions_tracking.gate).toEqual([
      {
        workflow_id: 'system-attack-discovery-skill-alert-retrieval',
        workflow_run_id: 'gate-run-id',
      },
    ]);
  });

  it('surfaces the real alerts passed to generation on the gate (skill) entry (enables inspect)', async () => {
    const trackingWithGate: WorkflowExecutionsTracking = {
      alertRetrieval: null,
      gate: [
        {
          workflowId: 'system-attack-discovery-skill-alert-retrieval',
          workflowRunId: 'gate-run-id',
        },
      ],
      generation: {
        workflowId: 'workflow-generation',
        workflowRunId: 'generation-run-id',
      },
      validation: null,
    };

    // The real events passed to generation live in the generate_discoveries
    // step's input.alerts (kept candidates pass through as-is + any net-new).
    const generationInputAlerts = ['_id,a1\nhost.name,web-01', '_id,a2\nhost.name,web-02'];

    const handler = registerAndGetHandler();

    mockGetWorkflowExecutionsTracking.mockResolvedValue(trackingWithGate);
    mockGetWorkflowExecution.mockImplementation((runId: string) =>
      runId === 'generation-run-id'
        ? Promise.resolve({
            stepExecutions: [
              { input: { alerts: generationInputAlerts }, stepId: 'generate_discoveries' },
            ],
          })
        : Promise.resolve({ stepExecutions: [] })
    );
    // The gate emits ids only, so extractPipelineGateData carries no raw alerts.
    mockExtractPipelineGateData.mockReturnValue({
      alerts: [],
      alerts_context_count: 2,
      extraction_strategy: 'skill' as const,
    });
    mockExtractPipelineGenerationData.mockReturnValue({
      attack_discoveries: [],
      execution_uuid: 'test-uuid',
      replacements: {},
    });
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

    const body = responseMock.ok.mock.calls[0]?.[0]?.body as GetPipelineDataResponse;

    // The gate (skill) entry now carries the real alerts passed to generation so
    // its inspect button is enabled and shows exactly what generation received.
    expect(body.alert_retrieval).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          alerts: generationInputAlerts,
          alerts_context_count: 2,
          extraction_strategy: 'skill',
          workflow_run_id: 'gate-run-id',
        }),
      ])
    );
  });

  describe('provided-alerts reconstruction (Step 2.5)', () => {
    // The precondition used here is the one the product actually produces for a
    // pre-provided run (the agent-builder run tool / `security.attack-discovery.run`
    // step with `alerts` supplied): no alert-retrieval workflow executes, the
    // supplied alerts are recorded in the generate-step-started event reference,
    // and the diagnostics context records `custom_query`. The generation workflow
    // config types `alert_retrieval_mode` as the built-in default-retrieval query
    // mode (`custom_query | esql`) and every bridge derives it as
    // `mode === 'esql' ? 'esql' : 'custom_query'`, so `provided` never reaches the
    // diagnostics context — a reconstruction gated on that string can never fire.
    const suppliedAlerts = ['_id,a1\nhost.name,web-01', '_id,a2\nhost.name,web-02'];
    const resolvedGenerationAlerts = [
      '_id,a1\nhost.name,web-01',
      '_id,a2\nhost.name,web-02',
      '_id,a3\nhost.name,web-03',
    ];

    const providedRunTracking: EventLogData = {
      alertRetrieval: null,
      diagnosticsContext: {
        config: {
          alertRetrievalMode: 'custom_query',
          alertRetrievalWorkflowCount: 0,
          connectorType: '.gen-ai',
          hasCustomValidation: false,
        },
        preExecutionChecks: [],
        workflowIntegrity: { repaired: [], status: 'all_intact', unrepairableErrors: [] },
      },
      generation: {
        workflowId: 'workflow-generation',
        workflowRunId: 'generation-run-id',
      },
      providedAlerts: suppliedAlerts,
      validation: null,
    };

    const invokeHandler = async (): Promise<GetPipelineDataResponse> => {
      const handler = registerAndGetHandler();
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

      return responseMock.ok.mock.calls[0]?.[0]?.body as GetPipelineDataResponse;
    };

    const mockGenerationExecutionWithAlerts = (alerts: string[]) =>
      mockGetWorkflowExecution.mockImplementation((runId: string) =>
        runId === 'generation-run-id'
          ? Promise.resolve({
              stepExecutions: [{ input: { alerts }, stepId: 'generate_discoveries' }],
            })
          : Promise.resolve({ stepExecutions: [] })
      );

    it('reconstructs the provided-alert entry from the event-log tracking while generation is still running', async () => {
      mockGetWorkflowExecutionsTracking.mockResolvedValue(providedRunTracking);
      // Generation has started, but its step input is not populated yet.
      mockGetWorkflowExecution.mockResolvedValue({ stepExecutions: [] });
      mockExtractPipelineGenerationData.mockReturnValue(null);
      mockExtractPipelineValidationData.mockReturnValue(null);
      mockComputeCombinedAlerts.mockReturnValue({
        alerts: suppliedAlerts,
        alerts_context_count: suppliedAlerts.length,
      });

      const body = await invokeHandler();

      expect(body.alert_retrieval).toEqual([
        expect.objectContaining({
          alerts: suppliedAlerts,
          alerts_context_count: suppliedAlerts.length,
          extraction_strategy: 'provided',
          workflow_id: 'provided',
          workflow_run_id: 'provided',
        }),
      ]);
      // The reconstruction feeds the combined ("Combined alert retrieval") view
      // built from the Alert retrieval phase.
      expect(mockComputeCombinedAlerts).toHaveBeenCalledWith([
        expect.objectContaining({ alerts_context_count: suppliedAlerts.length }),
      ]);
    });

    it('uses the tracked supplied alerts for the provided entry even when the gate added net-new alerts', async () => {
      // A provided run can execute the gate (`skill_enabled: true` in the run
      // tool). Once the generate step completes, its `input.alerts` holds the
      // FULL generation input: the supplied alerts PLUS the net-new alerts the
      // gate added. The `provided` entry must stay scoped to what the user
      // supplied (the tracked list) — labelling the step input `provided` would
      // mislabel the gate-added alerts as supplied and fold them, via Combined
      // alert retrieval, into a phase that intentionally excludes gate results.
      // The step input is reserved for the gate inspect data (Step 5b) instead.
      mockGetWorkflowExecutionsTracking.mockResolvedValue({
        ...providedRunTracking,
        gate: [
          {
            workflowId: 'system-attack-discovery-skill-alert-retrieval',
            workflowRunId: 'gate-run-id',
          },
        ],
      });
      mockGenerationExecutionWithAlerts(resolvedGenerationAlerts);
      mockExtractPipelineGateData.mockReturnValue({
        alerts: [],
        alerts_context_count: resolvedGenerationAlerts.length,
        extraction_strategy: 'skill' as const,
      });
      mockExtractPipelineGenerationData.mockReturnValue(null);
      mockExtractPipelineValidationData.mockReturnValue(null);
      mockComputeCombinedAlerts.mockReturnValue({
        alerts: suppliedAlerts,
        alerts_context_count: suppliedAlerts.length,
      });

      const body = await invokeHandler();

      // The provided entry carries the SUPPLIED alerts, not the step input —
      // the count matches the tracked supplied list (2), not the generation
      // input (3).
      expect(body.alert_retrieval).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alerts: suppliedAlerts,
            alerts_context_count: suppliedAlerts.length,
            extraction_strategy: 'provided',
            workflow_id: 'provided',
            workflow_run_id: 'provided',
          }),
        ])
      );
      // The full generation input (kept + gate-added) is surfaced on the gate
      // (skill) inspect entry instead.
      expect(body.alert_retrieval).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alerts: resolvedGenerationAlerts,
            alerts_context_count: resolvedGenerationAlerts.length,
            extraction_strategy: 'skill',
            workflow_run_id: 'gate-run-id',
          }),
        ])
      );
      // Combined alert retrieval is computed from the provided entry only — the
      // gate entry belongs to the Generation phase and is excluded.
      expect(mockComputeCombinedAlerts).toHaveBeenCalledTimes(1);
      expect(mockComputeCombinedAlerts).toHaveBeenCalledWith([
        expect.objectContaining({
          alerts: suppliedAlerts,
          alerts_context_count: suppliedAlerts.length,
        }),
      ]);
    });

    it('reports the same provided list and count in the running and completed states', async () => {
      mockGetWorkflowExecutionsTracking.mockResolvedValue(providedRunTracking);
      mockExtractPipelineGenerationData.mockReturnValue(null);
      mockExtractPipelineValidationData.mockReturnValue(null);

      // Running state: the generate step has started, its input is not
      // populated yet.
      mockGetWorkflowExecution.mockResolvedValue({ stepExecutions: [] });

      const runningBody = await invokeHandler();

      // Completed state: the generate step input is now resolved.
      mockGenerationExecutionWithAlerts(resolvedGenerationAlerts);

      const completedBody = await invokeHandler();

      const runningEntry = runningBody.alert_retrieval?.find(
        (entry) => entry.extraction_strategy === 'provided'
      );
      const completedEntry = completedBody.alert_retrieval?.find(
        (entry) => entry.extraction_strategy === 'provided'
      );

      expect(runningEntry).toEqual(
        expect.objectContaining({
          alerts: suppliedAlerts,
          alerts_context_count: suppliedAlerts.length,
        })
      );
      // The displayed provided entry must not change between states.
      expect(completedEntry).toEqual(runningEntry);
    });

    it('does not label retrieved alerts as provided when an alert-retrieval workflow ran', async () => {
      mockGetWorkflowExecutionsTracking.mockResolvedValue({
        alertRetrieval: [
          {
            workflowId: 'workflow-default-alert-retrieval',
            workflowRunId: 'alert-retrieval-run-id',
          },
        ],
        diagnosticsContext: {
          config: {
            alertRetrievalMode: 'esql',
            alertRetrievalWorkflowCount: 0,
            connectorType: '.gen-ai',
            hasCustomValidation: false,
          },
          preExecutionChecks: [],
          workflowIntegrity: { repaired: [], status: 'all_intact', unrepairableErrors: [] },
        },
        generation: {
          workflowId: 'workflow-generation',
          workflowRunId: 'generation-run-id',
        },
        validation: null,
      });
      mockGenerationExecutionWithAlerts(resolvedGenerationAlerts);
      mockExtractPipelineAlertData.mockReturnValue({
        alerts: resolvedGenerationAlerts,
        alerts_context_count: resolvedGenerationAlerts.length,
        extraction_strategy: 'default_esql' as const,
      });
      mockExtractPipelineGenerationData.mockReturnValue(null);
      mockExtractPipelineValidationData.mockReturnValue(null);

      const body = await invokeHandler();

      expect(body.alert_retrieval).toEqual([
        expect.objectContaining({
          alerts_context_count: resolvedGenerationAlerts.length,
          extraction_strategy: 'default_esql',
        }),
      ]);
      expect(body.alert_retrieval?.some((entry) => entry.extraction_strategy === 'provided')).toBe(
        false
      );
    });

    it('does not synthesise a provided entry when the run recorded no supplied alerts', async () => {
      // Not a provided run (or the generate-step-started event was lost): the
      // generate step input alone must not be presented as pre-provided alerts,
      // because in every retrieval mode it also carries the retrieved candidates.
      mockGetWorkflowExecutionsTracking.mockResolvedValue({
        alertRetrieval: null,
        diagnosticsContext: providedRunTracking.diagnosticsContext,
        generation: {
          workflowId: 'workflow-generation',
          workflowRunId: 'generation-run-id',
        },
        validation: null,
      });
      mockGenerationExecutionWithAlerts(resolvedGenerationAlerts);
      mockExtractPipelineGenerationData.mockReturnValue(null);
      mockExtractPipelineValidationData.mockReturnValue(null);

      const body = await invokeHandler();

      expect(body.alert_retrieval).toBeNull();
    });
  });

  it('falls back to standard alert extraction for non-gate-decision runs in the gate bucket', async () => {
    const trackingWithGateRefetch: WorkflowExecutionsTracking = {
      alertRetrieval: null,
      gate: [
        {
          workflowId: 'workflow-default-alert-retrieval',
          workflowRunId: 'gate-refetch-run-id',
        },
      ],
      generation: {
        workflowId: 'workflow-generation',
        workflowRunId: 'generation-run-id',
      },
      validation: null,
    };

    const handler = registerAndGetHandler();

    mockGetWorkflowExecutionsTracking.mockResolvedValue(trackingWithGateRefetch);
    mockGetWorkflowExecution.mockResolvedValue({ stepExecutions: [] });
    // not a gate decision → extractPipelineGateData returns null
    mockExtractPipelineGateData.mockReturnValue(null);
    mockExtractPipelineAlertData.mockReturnValue({
      alerts: ['_id,added-1\nx'],
      alerts_context_count: 1,
      extraction_strategy: 'default_esql' as const,
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

    const body = responseMock.ok.mock.calls[0]?.[0]?.body as GetPipelineDataResponse;

    expect(body.alert_retrieval).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          alerts_context_count: 1,
          workflow_run_id: 'gate-refetch-run-id',
        }),
      ])
    );
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

  it('scopes tracking retrieval to the requesting principal (object-level authz)', async () => {
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

    expect(mockGetWorkflowExecutionsTracking).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'test-user' })
    );
  });

  it('returns 403 when the requesting principal cannot be determined', async () => {
    mockGetCurrentUser.mockReturnValue(null);

    const handler = registerAndGetHandler();

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

    expect(responseMock.forbidden).toHaveBeenCalled();
    expect(mockGetWorkflowExecutionsTracking).not.toHaveBeenCalled();
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

    // Generation is always fetched with includeInput so the generate step's
    // input.alerts (the real events passed to generation) can be surfaced on the
    // gate (skill) inspect and used for provided-mode reconstruction.
    expect(mockGetWorkflowExecution).toHaveBeenCalledWith('generation-run-id', 'default', {
      includeInput: true,
      includeOutput: true,
    });

    expect(mockGetWorkflowExecution).toHaveBeenCalledWith('validation-run-id', 'default', {
      includeInput: true,
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

  it('registers the route with ATTACK_DISCOVERY_API_ACTION_ALL in requiredPrivileges', () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({
      addVersion: addVersionMock,
    });

    registerGetPipelineDataRoute(router, logger, {
      getEventLogIndex,
      getStartServices,
      workflowsManagementApi: mockWorkflowsManagementApi as unknown as Parameters<
        typeof registerGetPipelineDataRoute
      >[2]['workflowsManagementApi'],
    });

    expect(router.versioned.get).toHaveBeenCalledWith(
      expect.objectContaining({
        security: expect.objectContaining({
          authz: expect.objectContaining({
            requiredPrivileges: expect.arrayContaining(['securitySolution-attackDiscoveryAll']),
          }),
        }),
      })
    );
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
            requiredPrivileges: [
              'securitySolution-attackDiscoveryAll',
              'alerts-read',
              'workflowsManagement:read',
            ],
          },
        },
      })
    );
  });

  it('registers the route with the workflows read privilege in requiredPrivileges', () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({
      addVersion: addVersionMock,
    });

    registerGetPipelineDataRoute(router, logger, {
      getEventLogIndex,
      getStartServices,
      workflowsManagementApi: mockWorkflowsManagementApi as unknown as Parameters<
        typeof registerGetPipelineDataRoute
      >[2]['workflowsManagementApi'],
    });

    expect(router.versioned.get).toHaveBeenCalledWith(
      expect.objectContaining({
        security: expect.objectContaining({
          authz: expect.objectContaining({
            requiredPrivileges: expect.arrayContaining(['workflowsManagement:read']),
          }),
        }),
      })
    );
  });
});
