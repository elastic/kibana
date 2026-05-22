/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { resolveConnectorDetails } from '../../helpers/resolve_connector_details';

jest.mock('./constants', () => ({
  ATTACK_DISCOVERY_RUN_SOFT_DEADLINE_MS: 25,
}));

import { getRunStepDefinition } from './get_run_step_definition';

const mockExecuteGenerationWorkflow = jest.fn();

jest.mock('@kbn/discoveries/impl/attack_discovery/generation/execute_generation_workflow', () => ({
  executeGenerationWorkflow: (...args: unknown[]) => mockExecuteGenerationWorkflow(...args),
}));

jest.mock('../../helpers/resolve_connector_details', () => ({
  resolveConnectorDetails: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: () => 'test-execution-uuid',
}));

const mockResolveConnectorDetails = resolveConnectorDetails as jest.MockedFunction<
  typeof resolveConnectorDetails
>;

describe('getRunStepDefinition', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const mockActionsClient = { get: jest.fn() };

  const mockGetStartServices = jest.fn().mockResolvedValue({
    coreStart: {
      elasticsearch: {
        client: {
          asScoped: jest.fn().mockReturnValue({
            asCurrentUser: {},
          }),
        },
      },
    },
    pluginsStart: {
      actions: {
        getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
      },
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
      duplicatesDroppedCount: 0,
      generatedCount: 1,
      success: true,
      workflowId: 'val-workflow-1',
      workflowRunId: 'val-run-1',
    },
  };

  const getStepDefinition = () =>
    getRunStepDefinition({
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      logger: mockLogger,
    });

  beforeEach(() => {
    jest.clearAllMocks();

    mockResolveConnectorDetails.mockResolvedValue({
      actionTypeId: '.gen-ai',
      connectorName: 'Test Connector',
    });

    mockExecuteGenerationWorkflow.mockResolvedValue(mockSuccessOutcome);
  });

  describe('step definition metadata', () => {
    it('has the correct id', () => {
      const stepDefinition = getStepDefinition();

      expect(stepDefinition.id).toBe('security.attack-discovery.run');
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
  });

  describe('sync mode', () => {
    it('returns discoveries without replacements', async () => {
      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.output).toEqual({
        alerts_context_count: 5,
        attack_discoveries: [
          {
            alert_ids: ['alert-1'],
            details_markdown: 'Details about the attack',
            entity_summary_markdown: 'Entity summary',
            mitre_attack_tactics: ['Initial Access'],
            summary_markdown: 'A summary',
            title: 'Test Discovery',
          },
        ],
        discovery_count: 1,
        execution_uuid: 'test-execution-uuid',
      });
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
      });
    });
  });

  describe('soft deadline (sync mode)', () => {
    it('returns execution_uuid only when the pipeline exceeds the soft deadline', async () => {
      mockExecuteGenerationWorkflow.mockReturnValue(new Promise(() => {}));

      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(syncMockContext as never);

      expect(result.output).toEqual({ execution_uuid: 'test-execution-uuid' });
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

      expect(result.output?.attack_discoveries).toEqual([
        {
          alert_ids: ['alert-1'],
          details_markdown: 'Details about the attack',
          entity_summary_markdown: 'Entity summary',
          mitre_attack_tactics: ['Initial Access'],
          summary_markdown: 'A summary',
          title: 'Test Discovery',
        },
      ]);
    });
  });

  describe('async mode', () => {
    it('returns execution_uuid only', async () => {
      const stepDefinition = getStepDefinition();

      const result = await stepDefinition.handler(asyncMockContext as never);

      expect(result.output).toEqual({
        execution_uuid: 'test-execution-uuid',
      });
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

  describe('provided mode auto-detection', () => {
    it('auto-detects provided mode when alerts are non-empty', async () => {
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
            alert_retrieval_mode: 'provided',
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
  });
});
