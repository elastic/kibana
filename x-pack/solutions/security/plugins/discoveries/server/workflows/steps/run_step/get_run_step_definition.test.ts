/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { WorkflowExecutionAuthorizationError } from '@kbn/discoveries/impl/attack_discovery/generation/assert_authorized_to_execute_workflows';

import { resolveConnectorDetails } from '../../helpers/resolve_connector_details';
import { resolveDefaultConnectorId } from '../../helpers/resolve_default_connector_id';

jest.mock('./constants', () => ({
  ATTACK_DISCOVERY_RUN_SOFT_DEADLINE_MS: 25,
}));

const mockIsWorkflowsEnabledForSpace = jest.fn();

jest.mock('../../../lib/is_workflows_enabled_for_space', () => ({
  isWorkflowsEnabledForSpace: (...args: unknown[]) => mockIsWorkflowsEnabledForSpace(...args),
}));

import { getRunStepDefinition } from './get_run_step_definition';

const mockExecuteGenerationWorkflow = jest.fn();

jest.mock('@kbn/discoveries/impl/attack_discovery/generation/execute_generation_workflow', () => ({
  executeGenerationWorkflow: (...args: unknown[]) => mockExecuteGenerationWorkflow(...args),
}));

jest.mock('../../helpers/resolve_connector_details', () => ({
  resolveConnectorDetails: jest.fn(),
}));

jest.mock('../../helpers/resolve_default_connector_id', () => ({
  resolveDefaultConnectorId: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: () => 'test-execution-uuid',
}));

const mockResolveConnectorDetails = resolveConnectorDetails as jest.MockedFunction<
  typeof resolveConnectorDetails
>;

const mockResolveDefaultConnectorId = resolveDefaultConnectorId as jest.MockedFunction<
  typeof resolveDefaultConnectorId
>;

describe('getRunStepDefinition', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const mockActionsClient = { get: jest.fn() };

  const mockUiSettingsClient = { get: jest.fn() };

  const mockGetStartServices = jest.fn().mockResolvedValue({
    coreStart: {
      elasticsearch: {
        client: {
          asScoped: jest.fn().mockReturnValue({
            asCurrentUser: {},
          }),
        },
      },
      savedObjects: {
        getScopedClient: jest.fn().mockReturnValue({}),
      },
      uiSettings: {
        asScopedToClient: jest.fn().mockReturnValue(mockUiSettingsClient),
      },
    },
    pluginsStart: {
      actions: {
        getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
      },
      security: { authz: {} },
    },
  });

  const mockGetEventLogIndex = jest.fn().mockResolvedValue('.kibana-event-log-*');
  const mockGetEventLogger = jest.fn().mockResolvedValue({});

  const baseMockContext = {
    abortSignal: new AbortController().signal,
    contextManager: {
      getContext: jest.fn().mockReturnValue({
        execution: { id: 'workflow-run-1' },
        workflow: { id: 'workflow-1', spaceId: 'default' },
      }),
      getFakeRequest: jest.fn().mockReturnValue({
        headers: {},
      }),
      getScopedEsClient: jest.fn(),
      renderInputTemplate: jest.fn(),
    },
    logger: {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    },
    stepId: 'run-step-1',
    stepType: 'security.attack-discovery.run',
  };

  const syncMockContext = {
    ...baseMockContext,
    input: {
      alert_retrieval_mode: 'custom_query' as const,
      alert_retrieval_workflow_ids: [],
      connector_id: 'test-connector',
      mode: 'sync' as const,
      validation_workflow_id: '',
    },
  };

  const asyncMockContext = {
    ...baseMockContext,
    input: {
      alert_retrieval_mode: 'custom_query' as const,
      alert_retrieval_workflow_ids: [],
      connector_id: 'test-connector',
      mode: 'async' as const,
      validation_workflow_id: '',
    },
  };

  const mockSuccessOutcome = {
    alertRetrievalResult: {
      alerts: ['alert-1', 'alert-2'],
      alertsContextCount: 5,
      anonymizedAlerts: [],
      apiConfig: { action_type_id: '.gen-ai', connector_id: 'test-connector' },
      connectorName: 'Test Connector',
      replacements: { 'uuid-1': 'real-value-1', 'uuid-2': 'real-value-2' },
      workflowExecutions: [],
    },
    generationResult: {
      alertsContextCount: 5,
      attackDiscoveries: [
        {
          alert_ids: ['alert-1'],
          details_markdown: 'Details about the attack',
          entity_summary_markdown: 'Entity summary',
          mitre_attack_tactics: ['Initial Access'],
          summary_markdown: 'A summary',
          title: 'Test Discovery',
        },
      ],
      executionUuid: 'test-execution-uuid',
      replacements: { 'uuid-1': 'real-value-1', 'uuid-2': 'real-value-2' },
      workflowId: 'gen-workflow-1',
      workflowRunId: 'gen-run-1',
    },
    outcome: 'validation_succeeded' as const,
    validationResult: {
      discoveriesToPersist: [
        {
          alert_ids: ['alert-1'],
          details_markdown: 'Validated details',
          entity_summary_markdown: 'Validated entity summary',
          mitre_attack_tactics: ['Execution'],
          summary_markdown: 'A validated summary',
          title: 'Validated Discovery',
        },
      ],
      duplicatesDroppedCount: 0,
      generatedCount: 1,
      success: true,
      workflowId: 'val-workflow-1',
      workflowRunId: 'val-run-1',
    },
  };

  const handoverDiscoveries = [
    {
      alert_ids: ['alert-1'],
      details_markdown: 'Validated details',
      entity_summary_markdown: 'Validated entity summary',
      mitre_attack_tactics: ['Execution'],
      summary_markdown: 'A validated summary',
      title: 'Validated Discovery',
    },
  ];

  const getStepDefinition = () =>
    getRunStepDefinition({
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      logger: mockLogger,
    });

  beforeEach(() => {
    jest.clearAllMocks();

    mockIsWorkflowsEnabledForSpace.mockResolvedValue(true);

    mockResolveConnectorDetails.mockResolvedValue({
      actionTypeId: '.gen-ai',
      connectorName: 'Test Connector',
    });

    mockResolveDefaultConnectorId.mockResolvedValue('default-connector');

    mockExecuteGenerationWorkflow.mockResolvedValue(mockSuccessOutcome);
  });

  describe('step definition metadata', () => {
    it('has the correct id', () => {
      const stepDefinition = getStepDefinition();

      expect(stepDefinition.id).toBe('security.attack-discovery.run');
    });
  });

  describe('space-bounded alerts index', () => {
    it('derives the alerts index from the resolved space', async () => {
      mockGetStartServices.mockResolvedValueOnce({
        coreStart: {
          elasticsearch: {
            client: { asScoped: jest.fn().mockReturnValue({ asCurrentUser: {} }) },
          },
          savedObjects: { getScopedClient: jest.fn().mockReturnValue({}) },
          uiSettings: { asScopedToClient: jest.fn().mockReturnValue(mockUiSettingsClient) },
        },
        pluginsStart: {
          actions: {
            getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
          },
          security: { authz: {} },
          spaces: { spacesService: { getSpaceId: jest.fn().mockReturnValue('finance') } },
        },
      });

      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(asyncMockContext as never);

      expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ alertsIndexPattern: '.alerts-security.alerts-finance' })
      );
    });
  });

  describe('connector resolution', () => {
    it('resolves connector details when only connector_id is provided', async () => {
      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(syncMockContext as never);

      expect(mockResolveConnectorDetails).toHaveBeenCalledWith({
        actionsClient: mockActionsClient,
        connectorId: 'test-connector',
        inference: undefined,
        logger: mockLogger,
        request: { headers: {} },
      });
    });

    it('does not resolve a default connector when connector_id is provided', async () => {
      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(syncMockContext as never);

      expect(mockResolveDefaultConnectorId).not.toHaveBeenCalled();
    });

    it('resolves the default connector when connector_id is omitted', async () => {
      const contextWithoutConnectorId = {
        ...baseMockContext,
        input: {
          alert_retrieval_mode: 'custom_query' as const,
          alert_retrieval_workflow_ids: [],
          mode: 'sync' as const,
          validation_workflow_id: '',
        },
      };

      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(contextWithoutConnectorId as never);

      expect(mockResolveDefaultConnectorId).toHaveBeenCalledWith({
        inference: undefined,
        logger: mockLogger,
        request: { headers: {} },
        uiSettingsClient: mockUiSettingsClient,
      });
    });

    it('uses the resolved default connector id for connector details when connector_id is omitted', async () => {
      const contextWithoutConnectorId = {
        ...baseMockContext,
        input: {
          alert_retrieval_mode: 'custom_query' as const,
          alert_retrieval_workflow_ids: [],
          mode: 'sync' as const,
          validation_workflow_id: '',
        },
      };

      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(contextWithoutConnectorId as never);

      expect(mockResolveConnectorDetails).toHaveBeenCalledWith({
        actionsClient: mockActionsClient,
        connectorId: 'default-connector',
        inference: undefined,
        logger: mockLogger,
        request: { headers: {} },
      });
    });

    it('uses the resolved default connector id in the apiConfig passed to the pipeline', async () => {
      const contextWithoutConnectorId = {
        ...baseMockContext,
        input: {
          alert_retrieval_mode: 'custom_query' as const,
          alert_retrieval_workflow_ids: [],
          mode: 'sync' as const,
          validation_workflow_id: '',
        },
      };

      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(contextWithoutConnectorId as never);

      expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          apiConfig: expect.objectContaining({
            connector_id: 'default-connector',
          }),
        })
      );
    });
  });

  describe('sync mode', () => {
    it('returns discoveries without replacements', async () => {
      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.output).toEqual({
        alerts_context_count: 5,
        attack_discoveries: handoverDiscoveries,
        discovery_count: 1,
        execution_uuid: 'test-execution-uuid',
        status: 'completed',
      });
    });

    it('returns the persist handover discoveries instead of raw generation output', async () => {
      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.output?.attack_discoveries).toEqual(handoverDiscoveries);
    });

    it('returns an empty array when the handover is empty', async () => {
      mockExecuteGenerationWorkflow.mockResolvedValue({
        ...mockSuccessOutcome,
        validationResult: { ...mockSuccessOutcome.validationResult, discoveriesToPersist: [] },
      });

      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.output?.attack_discoveries).toEqual([]);
    });

    it('returns an empty array when the handover is absent', async () => {
      mockExecuteGenerationWorkflow.mockResolvedValue({
        ...mockSuccessOutcome,
        validationResult: {
          ...mockSuccessOutcome.validationResult,
          discoveriesToPersist: undefined,
        },
      });

      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.output?.attack_discoveries).toEqual([]);
    });

    it('returns execution_uuid from the generation result', async () => {
      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.output?.execution_uuid).toBe('test-execution-uuid');
    });

    it('returns alerts_context_count from the retrieval result', async () => {
      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.output?.alerts_context_count).toBe(5);
    });

    it('returns discovery_count from the validation result', async () => {
      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.output?.discovery_count).toBe(1);
    });

    it('returns null attack_discoveries when validation fails', async () => {
      mockExecuteGenerationWorkflow.mockResolvedValue({
        outcome: 'validation_failed',
      });

      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.output).toEqual({
        alerts_context_count: 0,
        attack_discoveries: null,
        discovery_count: 0,
        execution_uuid: 'test-execution-uuid',
        status: 'completed',
      });
    });
  });

  describe('soft deadline (sync mode)', () => {
    it('returns execution_uuid only when the pipeline exceeds the soft deadline', async () => {
      mockExecuteGenerationWorkflow.mockReturnValue(new Promise(() => {}));

      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.output).toEqual({ execution_uuid: 'test-execution-uuid', status: 'pending' });
    });

    it('returns status pending when the pipeline exceeds the soft deadline', async () => {
      mockExecuteGenerationWorkflow.mockReturnValue(new Promise(() => {}));

      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.output?.status).toBe('pending');
    });

    it('omits attack_discoveries when the pipeline exceeds the soft deadline', async () => {
      mockExecuteGenerationWorkflow.mockReturnValue(new Promise(() => {}));

      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.output).not.toHaveProperty('attack_discoveries');
    });

    it('returns the full sync output when the pipeline finishes before the soft deadline', async () => {
      mockExecuteGenerationWorkflow.mockResolvedValue(mockSuccessOutcome);

      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.output?.attack_discoveries).toEqual(handoverDiscoveries);
    });
  });

  describe('soft deadline timer cleanup (sync mode)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('clears the soft-deadline timer when the pipeline rejects', async () => {
      mockExecuteGenerationWorkflow.mockRejectedValue(new Error('Pipeline failed'));

      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(syncMockContext as never);

      expect(jest.getTimerCount()).toBe(0);
    });

    it('clears the soft-deadline timer when the pipeline resolves before the deadline', async () => {
      mockExecuteGenerationWorkflow.mockResolvedValue(mockSuccessOutcome);

      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(syncMockContext as never);

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('async mode', () => {
    it('returns execution_uuid only', async () => {
      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(asyncMockContext as never);

      expect(result.output).toEqual({
        execution_uuid: 'test-execution-uuid',
        status: 'pending',
      });
    });

    it('returns status pending in async mode', async () => {
      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(asyncMockContext as never);

      expect(result.output?.status).toBe('pending');
    });

    it('does not await executeGenerationWorkflow', async () => {
      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(asyncMockContext as never);

      expect(mockExecuteGenerationWorkflow).toHaveBeenCalled();
    });
  });

  describe('replacements map NEVER appears in output', () => {
    it('does not include replacements in sync mode output', async () => {
      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      const outputJson = JSON.stringify(result.output);
      expect(outputJson).not.toContain('real-value-1');
      expect(outputJson).not.toContain('real-value-2');
      expect(outputJson).not.toContain('"replacements"');
    });

    it('does not include replacements in async mode output', async () => {
      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(asyncMockContext as never);

      const outputJson = JSON.stringify(result.output);
      expect(outputJson).not.toContain('real-value-1');
      expect(outputJson).not.toContain('real-value-2');
      expect(outputJson).not.toContain('"replacements"');
    });

    it('does not include replacements in validation-failed output', async () => {
      mockExecuteGenerationWorkflow.mockResolvedValue({
        outcome: 'validation_failed',
      });

      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      const outputJson = JSON.stringify(result.output);
      expect(outputJson).not.toContain('"replacements"');
    });
  });

  describe('additional_context', () => {
    it('passes additional_context to workflowConfig when provided', async () => {
      const contextWithAdditionalContext = {
        ...baseMockContext,
        input: {
          ...syncMockContext.input,
          additional_context: 'Focus on lateral movement',
        },
      };

      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(contextWithAdditionalContext as never);

      expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowConfig: expect.objectContaining({
            additional_context: 'Focus on lateral movement',
          }),
        })
      );
    });

    it('does NOT include additional_context in workflowConfig when not provided', async () => {
      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(syncMockContext as never);

      const callArgs = mockExecuteGenerationWorkflow.mock.calls[0][0];

      expect(callArgs.workflowConfig).not.toHaveProperty('additional_context');
    });
  });

  describe('provided alerts auto-detection', () => {
    it('disables default retrieval and forwards alerts when alerts are non-empty', async () => {
      const contextWithAlerts = {
        ...baseMockContext,
        input: {
          ...syncMockContext.input,
          alert_retrieval_mode: 'custom_query' as const,
          alerts: ['alert-string-1', 'alert-string-2'],
        },
      };

      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(contextWithAlerts as never);

      expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          alerts: ['alert-string-1', 'alert-string-2'],
          workflowConfig: expect.objectContaining({
            default_retrieval_enabled: false,
          }),
        })
      );
    });

    it('passes alerts to executeGenerationWorkflow when provided', async () => {
      const contextWithAlerts = {
        ...baseMockContext,
        input: {
          ...syncMockContext.input,
          alerts: ['alert-string-1'],
        },
      };

      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(contextWithAlerts as never);

      expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          alerts: ['alert-string-1'],
        })
      );
    });

    it('does not override alert_retrieval_mode when alerts is empty', async () => {
      const contextWithEmptyAlerts = {
        ...baseMockContext,
        input: {
          ...syncMockContext.input,
          alert_retrieval_mode: 'custom_query' as const,
          alerts: [],
        },
      };

      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(contextWithEmptyAlerts as never);

      expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowConfig: expect.objectContaining({
            alert_retrieval_mode: 'custom_query',
          }),
        })
      );
    });

    it('does not include alerts in executeParams when alerts is empty', async () => {
      const contextWithEmptyAlerts = {
        ...baseMockContext,
        input: {
          ...syncMockContext.input,
          alerts: [],
        },
      };

      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(contextWithEmptyAlerts as never);

      const callArgs = mockExecuteGenerationWorkflow.mock.calls[0][0];

      expect(callArgs).not.toHaveProperty('alerts');
    });
  });

  describe('input defaults (workflow engine omits zod defaults)', () => {
    // The workflow engine does NOT apply the step schema's zod `.default()`
    // values to `context.input`, so defaulted fields arrive `undefined` when
    // the caller omits them. The handler must apply the defaults itself.
    const minimalInputContext = {
      ...baseMockContext,
      input: {
        connector_id: 'test-connector',
      },
    };

    it('does not return an error when alert_retrieval_workflow_ids is omitted', async () => {
      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(minimalInputContext as never);

      expect(result.error).toBeUndefined();
    });

    it('defaults alert_retrieval_workflow_ids to an empty array', async () => {
      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(minimalInputContext as never);

      expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowConfig: expect.objectContaining({ alert_retrieval_workflow_ids: [] }),
        })
      );
    });

    it('defaults alert_retrieval_mode to custom_query', async () => {
      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(minimalInputContext as never);

      expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowConfig: expect.objectContaining({ alert_retrieval_mode: 'custom_query' }),
        })
      );
    });

    it('defaults validation_workflow_id to an empty string', async () => {
      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(minimalInputContext as never);

      expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowConfig: expect.objectContaining({ validation_workflow_id: '' }),
        })
      );
    });

    it('defaults mode to sync when omitted', async () => {
      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(minimalInputContext as never);

      expect(result.output).toEqual({
        alerts_context_count: 5,
        attack_discoveries: handoverDiscoveries,
        discovery_count: 1,
        execution_uuid: 'test-execution-uuid',
        status: 'completed',
      });
    });
  });

  describe('per-space setting check', () => {
    it('returns an error result when isWorkflowsEnabledForSpace returns false', async () => {
      mockIsWorkflowsEnabledForSpace.mockResolvedValue(false);

      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.error).toBeDefined();
    });

    it('does not call executeGenerationWorkflow when isWorkflowsEnabledForSpace returns false', async () => {
      mockIsWorkflowsEnabledForSpace.mockResolvedValue(false);

      const stepDefinition = getStepDefinition();

      await stepDefinition.handler(syncMockContext as never);

      expect(mockExecuteGenerationWorkflow).not.toHaveBeenCalled();
    });

    it('error message mentions the space setting when isWorkflowsEnabledForSpace returns false', async () => {
      mockIsWorkflowsEnabledForSpace.mockResolvedValue(false);

      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.error?.message).toContain('not enabled for this space');
    });
  });

  describe('error handling', () => {
    it('returns an error when executeGenerationWorkflow throws', async () => {
      mockExecuteGenerationWorkflow.mockRejectedValue(new Error('Pipeline failed'));

      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Pipeline failed');
    });

    it('returns an error when connector resolution fails', async () => {
      mockResolveConnectorDetails.mockRejectedValue(new Error('Connector not found'));

      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Connector not found');
    });

    it('returns an error when the caller is unauthorized to execute workflows (backstop)', async () => {
      mockExecuteGenerationWorkflow.mockRejectedValue(
        new WorkflowExecutionAuthorizationError(['workflowsManagement:execute'])
      );

      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.error?.message).toContain('Unauthorized to execute Attack Discovery workflows');
    });
  });
});
