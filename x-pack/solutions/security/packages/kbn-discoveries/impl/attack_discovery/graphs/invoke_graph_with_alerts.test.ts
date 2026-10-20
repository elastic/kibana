/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { invokeAttackDiscoveryGraphWithAlerts } from './invoke_graph_with_alerts';
import { ActionsClientLlm } from '@kbn/langchain/server';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { getDefaultAttackDiscoveryGraph } from '.';
import { throwIfErrorCountsExceeded } from './throw_if_error_counts_exceeded';

jest.mock('@kbn/langchain/server');
jest.mock('@kbn/langchain/server/tracers/langsmith');
jest.mock('.', () => ({
  ...jest.requireActual('.'),
  getDefaultAttackDiscoveryGraph: jest.fn(),
}));
jest.mock('./throw_if_error_counts_exceeded');

describe('invokeAttackDiscoveryGraphWithAlerts', () => {
  const mockActionsClient = {} as PublicMethodsOf<ActionsClient>;
  const mockEsClient = {} as ElasticsearchClient;
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const mockPrompts = {
    continue: 'continue prompt',
    default: 'default prompt',
    detailsMarkdown: 'details markdown',
    entitySummaryMarkdown: 'entity summary',
    insights: 'insights prompt',
    mitreAttackTactics: 'mitre tactics',
    refine: 'refine prompt',
    summaryMarkdown: 'summary markdown',
    title: 'title prompt',
  };

  const mockAlerts = [
    { metadata: {}, pageContent: 'alert 1' },
    { metadata: {}, pageContent: 'alert 2' },
  ];

  const mockGraphInvoke = jest.fn();
  const mockGraph = {
    invoke: mockGraphInvoke,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getDefaultAttackDiscoveryGraph as jest.Mock).mockReturnValue(mockGraph);
    (getLangSmithTracer as jest.Mock).mockReturnValue([]);
  });

  it('creates LLM with correct configuration', async () => {
    mockGraphInvoke.mockResolvedValue({
      anonymizedDocuments: mockAlerts,
      insights: [],
      replacements: {},
    });

    await invokeAttackDiscoveryGraphWithAlerts({
      actionsClient: mockActionsClient,
      alerts: mockAlerts,
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector',
        model: 'gpt-4',
      },
      connectorTimeout: 60000,
      esClient: mockEsClient,
      logger: mockLogger,
      prompts: mockPrompts,
    });

    expect(ActionsClientLlm).toHaveBeenCalledWith({
      actionsClient: mockActionsClient,
      connectorId: 'test-connector',
      inferenceClient: undefined,
      isInferenceEndpoint: false,
      llmType: 'gen-ai',
      logger: mockLogger,
      model: 'gpt-4',
      temperature: 0,
      timeout: 60000,
      traceOptions: {
        projectName: undefined,
        tracers: [],
      },
    });
  });

  it('strips leading dot from action_type_id for llmType', async () => {
    mockGraphInvoke.mockResolvedValue({
      anonymizedDocuments: mockAlerts,
      insights: [],
      replacements: {},
    });

    await invokeAttackDiscoveryGraphWithAlerts({
      actionsClient: mockActionsClient,
      alerts: mockAlerts,
      apiConfig: {
        action_type_id: '.bedrock',
        connector_id: 'test-connector',
      },
      connectorTimeout: 60000,
      esClient: mockEsClient,
      logger: mockLogger,
      prompts: mockPrompts,
    });

    expect(ActionsClientLlm).toHaveBeenCalledWith(
      expect.objectContaining({
        llmType: 'bedrock',
      })
    );
  });

  it('uses action_type_id as-is when no leading dot', async () => {
    mockGraphInvoke.mockResolvedValue({
      anonymizedDocuments: mockAlerts,
      insights: [],
      replacements: {},
    });

    await invokeAttackDiscoveryGraphWithAlerts({
      actionsClient: mockActionsClient,
      alerts: mockAlerts,
      apiConfig: {
        action_type_id: 'custom',
        connector_id: 'test-connector',
      },
      connectorTimeout: 60000,
      esClient: mockEsClient,
      logger: mockLogger,
      prompts: mockPrompts,
    });

    expect(ActionsClientLlm).toHaveBeenCalledWith(
      expect.objectContaining({
        llmType: 'custom',
      })
    );
  });

  it('creates graph with correct parameters', async () => {
    mockGraphInvoke.mockResolvedValue({
      anonymizedDocuments: mockAlerts,
      insights: [],
      replacements: {},
    });

    const replacements = { key1: 'value1' };

    await invokeAttackDiscoveryGraphWithAlerts({
      actionsClient: mockActionsClient,
      alerts: mockAlerts,
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector',
      },
      connectorTimeout: 60000,
      esClient: mockEsClient,
      logger: mockLogger,
      prompts: mockPrompts,
      replacements,
      size: 20,
    });

    expect(getDefaultAttackDiscoveryGraph).toHaveBeenCalledWith({
      alertsIndexPattern: undefined,
      anonymizationFields: [],
      end: undefined,
      esClient: mockEsClient,
      filter: undefined,
      llm: expect.any(Object),
      logger: mockLogger,
      onNewReplacements: expect.any(Function),
      prompts: mockPrompts,
      replacements,
      size: 20,
      start: undefined,
    });
  });

  it('invokes graph with pre-retrieved alerts', async () => {
    mockGraphInvoke.mockResolvedValue({
      anonymizedDocuments: mockAlerts,
      insights: [{ title: 'Test Discovery' }],
      replacements: { key1: 'value1' },
    });

    await invokeAttackDiscoveryGraphWithAlerts({
      actionsClient: mockActionsClient,
      alerts: mockAlerts,
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector',
        model: 'gpt-4',
      },
      connectorTimeout: 60000,
      esClient: mockEsClient,
      logger: mockLogger,
      prompts: mockPrompts,
    });

    expect(mockGraphInvoke).toHaveBeenCalledWith(
      {
        anonymizedDocuments: mockAlerts,
        replacements: {},
      },
      {
        callbacks: [],
        runName: 'Attack discovery',
        tags: ['attack-discovery', 'gen-ai', 'gpt-4'],
      }
    );
  });

  it('returns discoveries and replacements', async () => {
    const mockDiscoveries = [{ title: 'Discovery 1' }, { title: 'Discovery 2' }];
    const mockReplacements = { key1: 'value1', key2: 'value2' };

    mockGraphInvoke.mockResolvedValue({
      anonymizedDocuments: mockAlerts,
      insights: mockDiscoveries,
      replacements: mockReplacements,
    });

    const result = await invokeAttackDiscoveryGraphWithAlerts({
      actionsClient: mockActionsClient,
      alerts: mockAlerts,
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector',
      },
      connectorTimeout: 60000,
      esClient: mockEsClient,
      logger: mockLogger,
      prompts: mockPrompts,
    });

    expect(result).toEqual({
      alertsContextCount: 2,
      discoveries: mockDiscoveries,
      replacements: mockReplacements,
    });
  });

  it('uses default size of 10 when not provided', async () => {
    mockGraphInvoke.mockResolvedValue({
      anonymizedDocuments: mockAlerts,
      insights: [],
      replacements: {},
    });

    await invokeAttackDiscoveryGraphWithAlerts({
      actionsClient: mockActionsClient,
      alerts: mockAlerts,
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector',
      },
      connectorTimeout: 60000,
      esClient: mockEsClient,
      logger: mockLogger,
      prompts: mockPrompts,
    });

    expect(getDefaultAttackDiscoveryGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 10,
      })
    );
  });

  it('configures LangSmith tracer when project is provided', async () => {
    const mockTracer = [{ name: 'langsmith' }];
    (getLangSmithTracer as jest.Mock).mockReturnValue(mockTracer);

    mockGraphInvoke.mockResolvedValue({
      anonymizedDocuments: mockAlerts,
      insights: [],
      replacements: {},
    });

    await invokeAttackDiscoveryGraphWithAlerts({
      actionsClient: mockActionsClient,
      alerts: mockAlerts,
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector',
      },
      connectorTimeout: 60000,
      esClient: mockEsClient,
      langSmithApiKey: 'test-api-key',
      langSmithProject: 'test-project',
      logger: mockLogger,
      prompts: mockPrompts,
    });

    expect(getLangSmithTracer).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
      logger: mockLogger,
      projectName: 'test-project',
    });

    expect(mockGraphInvoke).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        callbacks: mockTracer,
      })
    );
  });

  it('logs debug messages', async () => {
    mockGraphInvoke.mockResolvedValue({
      anonymizedDocuments: mockAlerts,
      insights: [{ title: 'Test' }],
      replacements: {},
    });

    await invokeAttackDiscoveryGraphWithAlerts({
      actionsClient: mockActionsClient,
      alerts: mockAlerts,
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector',
      },
      connectorTimeout: 60000,
      esClient: mockEsClient,
      logger: mockLogger,
      prompts: mockPrompts,
    });

    expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
  });

  describe('throwIfErrorCountsExceeded', () => {
    it('calls throwIfErrorCountsExceeded with graph result error counts after invoke', async () => {
      const graphResult = {
        anonymizedDocuments: mockAlerts,
        errors: ['parse error'],
        generationAttempts: 3,
        hallucinationFailures: 1,
        insights: [],
        maxGenerationAttempts: 10,
        maxHallucinationFailures: 5,
        replacements: {},
      };
      mockGraphInvoke.mockResolvedValue(graphResult);

      await invokeAttackDiscoveryGraphWithAlerts({
        actionsClient: mockActionsClient,
        alerts: mockAlerts,
        apiConfig: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector',
        },
        connectorTimeout: 60000,
        esClient: mockEsClient,
        logger: mockLogger,
        prompts: mockPrompts,
      });

      expect(throwIfErrorCountsExceeded).toHaveBeenCalledWith({
        errors: graphResult.errors,
        generationAttempts: graphResult.generationAttempts,
        hallucinationFailures: graphResult.hallucinationFailures,
        logger: mockLogger,
        maxGenerationAttempts: graphResult.maxGenerationAttempts,
        maxHallucinationFailures: graphResult.maxHallucinationFailures,
      });
    });

    it('propagates errors thrown by throwIfErrorCountsExceeded', async () => {
      mockGraphInvoke.mockResolvedValue({
        anonymizedDocuments: mockAlerts,
        errors: [],
        generationAttempts: 10,
        hallucinationFailures: 0,
        insights: [],
        maxGenerationAttempts: 10,
        maxHallucinationFailures: 5,
        replacements: {},
      });
      (throwIfErrorCountsExceeded as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Maximum generation attempts (10) reached.');
      });

      await expect(
        invokeAttackDiscoveryGraphWithAlerts({
          actionsClient: mockActionsClient,
          alerts: mockAlerts,
          apiConfig: {
            action_type_id: '.gen-ai',
            connector_id: 'test-connector',
          },
          connectorTimeout: 60000,
          esClient: mockEsClient,
          logger: mockLogger,
          prompts: mockPrompts,
        })
      ).rejects.toThrow('Maximum generation attempts (10) reached.');
    });
  });

  describe('additionalContext', () => {
    it('overrides the prompt with additional context appended when additionalContext is provided', async () => {
      mockGraphInvoke.mockResolvedValue({
        anonymizedDocuments: mockAlerts,
        insights: [],
        replacements: {},
      });

      await invokeAttackDiscoveryGraphWithAlerts({
        actionsClient: mockActionsClient,
        additionalContext: 'Focus on lateral movement techniques',
        alerts: mockAlerts,
        apiConfig: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector',
        },
        connectorTimeout: 60000,
        esClient: mockEsClient,
        logger: mockLogger,
        prompts: mockPrompts,
      });

      expect(mockGraphInvoke).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: `${mockPrompts.default}\n\nAdditional context:\nFocus on lateral movement techniques`,
        }),
        expect.any(Object)
      );
    });

    it('does NOT override the prompt when additionalContext is undefined', async () => {
      mockGraphInvoke.mockResolvedValue({
        anonymizedDocuments: mockAlerts,
        insights: [],
        replacements: {},
      });

      await invokeAttackDiscoveryGraphWithAlerts({
        actionsClient: mockActionsClient,
        alerts: mockAlerts,
        apiConfig: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector',
        },
        connectorTimeout: 60000,
        esClient: mockEsClient,
        logger: mockLogger,
        prompts: mockPrompts,
      });

      const invokeArgs = mockGraphInvoke.mock.calls[0][0];

      expect(invokeArgs).not.toHaveProperty('prompt');
    });

    it('does NOT override the prompt when additionalContext is an empty string', async () => {
      mockGraphInvoke.mockResolvedValue({
        anonymizedDocuments: mockAlerts,
        insights: [],
        replacements: {},
      });

      await invokeAttackDiscoveryGraphWithAlerts({
        actionsClient: mockActionsClient,
        additionalContext: '',
        alerts: mockAlerts,
        apiConfig: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector',
        },
        connectorTimeout: 60000,
        esClient: mockEsClient,
        logger: mockLogger,
        prompts: mockPrompts,
      });

      const invokeArgs = mockGraphInvoke.mock.calls[0][0];

      expect(invokeArgs).not.toHaveProperty('prompt');
    });
  });

  it('updates replacements via onNewReplacements callback', async () => {
    mockGraphInvoke.mockResolvedValue({
      anonymizedDocuments: mockAlerts,
      insights: [],
      replacements: {},
    });

    const initialReplacements = { key1: 'value1' };

    await invokeAttackDiscoveryGraphWithAlerts({
      actionsClient: mockActionsClient,
      alerts: mockAlerts,
      apiConfig: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector',
      },
      connectorTimeout: 60000,
      esClient: mockEsClient,
      logger: mockLogger,
      prompts: mockPrompts,
      replacements: initialReplacements,
    });

    const graphCall = (getDefaultAttackDiscoveryGraph as jest.Mock).mock.calls[0][0];
    const onNewReplacements = graphCall.onNewReplacements;

    onNewReplacements({ key2: 'value2' });

    expect(initialReplacements).toEqual({ key1: 'value1', key2: 'value2' });
  });
});
