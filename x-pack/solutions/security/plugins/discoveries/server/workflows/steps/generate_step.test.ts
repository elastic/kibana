/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { getGenerateStepDefinition } from './generate_step';
import { GenerateStepTypeId } from '../../../common/step_types/generate_step';
import { invokeAttackDiscoveryGraphWithAlerts } from '@kbn/discoveries/impl/attack_discovery/graphs/invoke_graph_with_alerts';
import { getAttackDiscoveryPrompts } from '../../lib/attack_discovery/prompts';

jest.mock('@kbn/discoveries/impl/attack_discovery/graphs/invoke_graph_with_alerts');
jest.mock('../../lib/attack_discovery/prompts');

const mockInvokeAttackDiscoveryGraphWithAlerts = invokeAttackDiscoveryGraphWithAlerts as jest.Mock;
const mockGetAttackDiscoveryPrompts = getAttackDiscoveryPrompts as jest.Mock;

describe('GenerateStepDefinition', () => {
  const mockLogger: Logger = loggerMock.create();
  const mockCoreStart = coreMock.createStart();
  const mockActionsClient = actionsClientMock.create();
  const mockEsClient = mockCoreStart.elasticsearch.client.asScoped({} as any).asCurrentUser;
  const mockEventLogger = {
    logEvent: jest.fn(),
  };

  const mockGetStartServices = jest.fn().mockResolvedValue({
    coreStart: mockCoreStart,
    pluginsStart: {
      actions: {
        getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
      },
    },
  });

  const mockGetEventLogger = jest.fn().mockResolvedValue(mockEventLogger);
  const mockGetEventLogIndex = jest.fn().mockResolvedValue('.kibana-event-log-*');

  const defaultInput = {
    alerts: [
      'timestamp,2025-01-01T00:00:00Z,host.name,server1,user.name,admin',
      'timestamp,2025-01-01T00:01:00Z,host.name,server1,user.name,admin',
    ],
    api_config: {
      action_type_id: '.gemini',
      connector_id: 'test-connector',
      model: 'test-model',
    },
    replacements: { server1: 'SERVER_001' },
    size: 10,
  };

  const mockContext = {
    abortSignal: undefined,
    contextManager: {
      getContext: jest.fn().mockReturnValue({
        execution: {
          id: 'test-execution-id',
        },
        workflow: {
          id: 'test-workflow-id',
          spaceId: 'default',
        },
      }),
      getFakeRequest: jest.fn().mockReturnValue({}),
    },
    input: defaultInput,
    logger: mockLogger,
  };

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

  const mockDiscoveriesCamelCase: AttackDiscovery[] = [
    {
      alertIds: ['alert-1', 'alert-2'],
      detailsMarkdown: 'Attack details',
      entitySummaryMarkdown: 'Entity summary',
      id: 'discovery-1',
      mitreAttackTactics: ['Initial Access', 'Execution'],
      summaryMarkdown: 'Summary',
      timestamp: '2025-01-01T00:00:00Z',
      title: 'Attack Title',
    },
  ];

  let stepDefinition: ReturnType<typeof getGenerateStepDefinition>;

  const getOutputOrThrow = <T>(result: { output?: T }): T => {
    if (!result.output) {
      throw new Error('Expected result.output to be defined');
    }

    return result.output;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAttackDiscoveryPrompts.mockResolvedValue(mockPrompts);
    mockActionsClient.get.mockResolvedValue({
      actionTypeId: '.gemini',
      id: 'test-connector-id',
      isConnectorTypeDeprecated: false,
      isDeprecated: false,
      isPreconfigured: false,
      isSystemAction: false,
      name: 'Test Connector',
    });

    stepDefinition = getGenerateStepDefinition({
      connectorTimeout: 60000,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      langSmithApiKey: undefined,
      langSmithProject: undefined,
      logger: mockLogger,
    });
  });

  describe('when zero alerts are provided', () => {
    it('returns null attack_discoveries in output', async () => {
      const context = {
        ...mockContext,
        input: {
          ...defaultInput,
          alerts: [],
        },
      };

      const result = await stepDefinition.handler(context as any);
      const output = getOutputOrThrow(result);

      expect(output.attack_discoveries).toBeNull();
    });

    it('does not invoke the graph', async () => {
      const context = {
        ...mockContext,
        input: {
          ...defaultInput,
          alerts: [],
        },
      };

      await stepDefinition.handler(context as any);

      expect(mockInvokeAttackDiscoveryGraphWithAlerts).not.toHaveBeenCalled();
    });
  });

  describe('successful generation', () => {
    beforeEach(() => {
      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: mockDiscoveriesCamelCase,
        replacements: { server1: 'SERVER_001' },
      });
    });

    it('returns attack_discoveries in output', async () => {
      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      expect(output.attack_discoveries).toBeDefined();
    });

    it('returns attack_discoveries with alert_ids in snake_case', async () => {
      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      if (!output.attack_discoveries) throw new Error('Expected attack_discoveries to be defined');

      expect(output.attack_discoveries[0].alert_ids).toEqual(['alert-1', 'alert-2']);
    });

    it('returns attack_discoveries with details_markdown in snake_case', async () => {
      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      if (!output.attack_discoveries) throw new Error('Expected attack_discoveries to be defined');

      expect(output.attack_discoveries[0].details_markdown).toBe('Attack details');
    });

    it('returns attack_discoveries with entity_summary_markdown in snake_case', async () => {
      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      if (!output.attack_discoveries) throw new Error('Expected attack_discoveries to be defined');

      expect(output.attack_discoveries[0].entity_summary_markdown).toBe('Entity summary');
    });

    it('returns attack_discoveries with mitre_attack_tactics in snake_case', async () => {
      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      if (!output.attack_discoveries) throw new Error('Expected attack_discoveries to be defined');

      expect(output.attack_discoveries[0].mitre_attack_tactics).toEqual([
        'Initial Access',
        'Execution',
      ]);
    });

    it('returns attack_discoveries with summary_markdown in snake_case', async () => {
      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      if (!output.attack_discoveries) throw new Error('Expected attack_discoveries to be defined');

      expect(output.attack_discoveries[0].summary_markdown).toBe('Summary');
    });

    it('returns execution_uuid from context', async () => {
      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      expect(output.execution_uuid).toBe('test-execution-id');
    });

    it('returns replacements from graph', async () => {
      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      expect(output.replacements).toEqual({ server1: 'SERVER_001' });
    });
  });

  describe('updated replacements', () => {
    it('returns updated replacements when graph provides new ones', async () => {
      const updatedReplacements = { server1: 'SERVER_001', server2: 'SERVER_002' };
      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: mockDiscoveriesCamelCase,
        replacements: updatedReplacements,
      });

      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      expect(output.replacements).toEqual(updatedReplacements);
    });
  });

  describe('null and empty discoveries', () => {
    it('returns null when graph returns null discoveries', async () => {
      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: null,
        replacements: {},
      });

      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      expect(output.attack_discoveries).toBeNull();
    });

    it('returns empty array when graph returns empty array', async () => {
      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: [],
        replacements: {},
      });

      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      expect(output.attack_discoveries).toEqual([]);
    });
  });

  describe('graph invocation', () => {
    beforeEach(() => {
      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: [],
        replacements: {},
      });
    });

    it('invokes graph with actionsClient', async () => {
      await stepDefinition.handler(mockContext as any);

      expect(mockInvokeAttackDiscoveryGraphWithAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          actionsClient: mockActionsClient,
        })
      );
    });

    it('invokes graph with alerts as Documents', async () => {
      await stepDefinition.handler(mockContext as any);

      expect(mockInvokeAttackDiscoveryGraphWithAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          alerts: expect.arrayContaining([
            expect.objectContaining({
              metadata: {},
              pageContent: 'timestamp,2025-01-01T00:00:00Z,host.name,server1,user.name,admin',
            }),
          ]),
        })
      );
    });

    it('invokes graph with apiConfig', async () => {
      await stepDefinition.handler(mockContext as any);

      expect(mockInvokeAttackDiscoveryGraphWithAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          apiConfig: {
            action_type_id: '.gemini',
            connector_id: 'test-connector',
            model: 'test-model',
          },
        })
      );
    });

    it('invokes graph with connectorTimeout', async () => {
      await stepDefinition.handler(mockContext as any);

      expect(mockInvokeAttackDiscoveryGraphWithAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorTimeout: 60000,
        })
      );
    });

    it('invokes graph with esClient', async () => {
      await stepDefinition.handler(mockContext as any);

      expect(mockInvokeAttackDiscoveryGraphWithAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          esClient: mockEsClient,
        })
      );
    });

    it('invokes graph with logger', async () => {
      await stepDefinition.handler(mockContext as any);

      expect(mockInvokeAttackDiscoveryGraphWithAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          logger: mockLogger,
        })
      );
    });

    it('invokes graph with prompts', async () => {
      await stepDefinition.handler(mockContext as any);

      expect(mockInvokeAttackDiscoveryGraphWithAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          prompts: mockPrompts,
        })
      );
    });

    it('invokes graph with replacements', async () => {
      await stepDefinition.handler(mockContext as any);

      expect(mockInvokeAttackDiscoveryGraphWithAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          replacements: { server1: 'SERVER_001' },
        })
      );
    });

    it('invokes graph with size', async () => {
      await stepDefinition.handler(mockContext as any);

      expect(mockInvokeAttackDiscoveryGraphWithAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 10,
        })
      );
    });
  });

  describe('langsmith configuration', () => {
    it('passes langSmithApiKey when provided', async () => {
      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: [],
        replacements: {},
      });

      const stepDefWithLangsmith = getGenerateStepDefinition({
        connectorTimeout: 60000,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
        langSmithApiKey: 'test-api-key',
        langSmithProject: 'test-project',
        logger: mockLogger,
      });

      await stepDefWithLangsmith.handler(mockContext as any);

      expect(mockInvokeAttackDiscoveryGraphWithAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          langSmithApiKey: 'test-api-key',
        })
      );
    });

    it('passes langSmithProject when provided', async () => {
      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: [],
        replacements: {},
      });

      const stepDefWithLangsmith = getGenerateStepDefinition({
        connectorTimeout: 60000,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
        langSmithApiKey: 'test-api-key',
        langSmithProject: 'test-project',
        logger: mockLogger,
      });

      await stepDefWithLangsmith.handler(mockContext as any);

      expect(mockInvokeAttackDiscoveryGraphWithAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          langSmithProject: 'test-project',
        })
      );
    });
  });

  describe('abortSignal handling', () => {
    it('passes abortSignal to graph invocation', async () => {
      const mockAbortSignal = new AbortController().signal;
      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: [],
        replacements: {},
      });

      const contextWithAbort = {
        ...mockContext,
        abortSignal: mockAbortSignal,
      };

      await stepDefinition.handler(contextWithAbort as any);

      expect(mockInvokeAttackDiscoveryGraphWithAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal: mockAbortSignal,
        })
      );
    });

    it('passes undefined abortSignal when not provided', async () => {
      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: [],
        replacements: {},
      });

      await stepDefinition.handler(mockContext as any);

      expect(mockInvokeAttackDiscoveryGraphWithAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal: undefined,
        })
      );
    });
  });

  describe('error handling', () => {
    it('returns error when graph invocation fails', async () => {
      const graphError = new Error('Graph invocation failed');
      mockInvokeAttackDiscoveryGraphWithAlerts.mockRejectedValue(graphError);

      const result = await stepDefinition.handler(mockContext as any);

      expect(result.error).toBeDefined();
    });

    it('returns error message when graph invocation fails', async () => {
      const graphError = new Error('Graph invocation failed');
      mockInvokeAttackDiscoveryGraphWithAlerts.mockRejectedValue(graphError);

      const result = await stepDefinition.handler(mockContext as any);

      expect(result.error?.message).toBe('Graph invocation failed');
    });

    it('logs error when graph invocation fails', async () => {
      const graphError = new Error('Graph invocation failed');
      mockInvokeAttackDiscoveryGraphWithAlerts.mockRejectedValue(graphError);

      await stepDefinition.handler(mockContext as any);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Generation failed: Graph invocation failed',
        graphError
      );
    });
  });

  describe('field conversion', () => {
    it('converts all fields from camelCase to snake_case', async () => {
      const discoveryWithAllFields: AttackDiscovery = {
        alertIds: ['alert-1', 'alert-2', 'alert-3'],
        detailsMarkdown: 'Detailed markdown content',
        entitySummaryMarkdown: 'Entity summary content',
        id: 'discovery-123',
        mitreAttackTactics: ['Initial Access', 'Persistence', 'Privilege Escalation'],
        summaryMarkdown: 'Summary content',
        timestamp: '2025-01-09T12:00:00.000Z',
        title: 'Complex Attack Pattern',
      };

      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: [discoveryWithAllFields],
        replacements: {},
      });

      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      if (!output.attack_discoveries) throw new Error('Expected attack_discoveries to be defined');

      expect(output.attack_discoveries[0]).toEqual({
        alert_ids: ['alert-1', 'alert-2', 'alert-3'],
        details_markdown: 'Detailed markdown content',
        entity_summary_markdown: 'Entity summary content',
        id: 'discovery-123',
        mitre_attack_tactics: ['Initial Access', 'Persistence', 'Privilege Escalation'],
        summary_markdown: 'Summary content',
        timestamp: '2025-01-09T12:00:00.000Z',
        title: 'Complex Attack Pattern',
      });
    });
  });

  describe('multiple discoveries', () => {
    it('returns correct number of discoveries', async () => {
      const multipleDiscoveries: AttackDiscovery[] = [
        {
          alertIds: ['alert-1'],
          detailsMarkdown: 'Details 1',
          summaryMarkdown: 'Summary 1',
          title: 'Attack 1',
        },
        {
          alertIds: ['alert-2'],
          detailsMarkdown: 'Details 2',
          summaryMarkdown: 'Summary 2',
          title: 'Attack 2',
        },
        {
          alertIds: ['alert-3'],
          detailsMarkdown: 'Details 3',
          summaryMarkdown: 'Summary 3',
          title: 'Attack 3',
        },
      ];

      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: multipleDiscoveries,
        replacements: {},
      });

      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      if (!output.attack_discoveries) throw new Error('Expected attack_discoveries to be defined');

      expect(output.attack_discoveries).toHaveLength(3);
    });

    it('converts first discovery alert_ids correctly', async () => {
      const multipleDiscoveries: AttackDiscovery[] = [
        {
          alertIds: ['alert-1'],
          detailsMarkdown: 'Details 1',
          summaryMarkdown: 'Summary 1',
          title: 'Attack 1',
        },
        {
          alertIds: ['alert-2'],
          detailsMarkdown: 'Details 2',
          summaryMarkdown: 'Summary 2',
          title: 'Attack 2',
        },
        {
          alertIds: ['alert-3'],
          detailsMarkdown: 'Details 3',
          summaryMarkdown: 'Summary 3',
          title: 'Attack 3',
        },
      ];

      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: multipleDiscoveries,
        replacements: {},
      });

      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      if (!output.attack_discoveries) throw new Error('Expected attack_discoveries to be defined');

      expect(output.attack_discoveries[0].alert_ids).toEqual(['alert-1']);
    });

    it('converts second discovery alert_ids correctly', async () => {
      const multipleDiscoveries: AttackDiscovery[] = [
        {
          alertIds: ['alert-1'],
          detailsMarkdown: 'Details 1',
          summaryMarkdown: 'Summary 1',
          title: 'Attack 1',
        },
        {
          alertIds: ['alert-2'],
          detailsMarkdown: 'Details 2',
          summaryMarkdown: 'Summary 2',
          title: 'Attack 2',
        },
        {
          alertIds: ['alert-3'],
          detailsMarkdown: 'Details 3',
          summaryMarkdown: 'Summary 3',
          title: 'Attack 3',
        },
      ];

      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: multipleDiscoveries,
        replacements: {},
      });

      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      if (!output.attack_discoveries) throw new Error('Expected attack_discoveries to be defined');

      expect(output.attack_discoveries[1].alert_ids).toEqual(['alert-2']);
    });

    it('converts third discovery alert_ids correctly', async () => {
      const multipleDiscoveries: AttackDiscovery[] = [
        {
          alertIds: ['alert-1'],
          detailsMarkdown: 'Details 1',
          summaryMarkdown: 'Summary 1',
          title: 'Attack 1',
        },
        {
          alertIds: ['alert-2'],
          detailsMarkdown: 'Details 2',
          summaryMarkdown: 'Summary 2',
          title: 'Attack 2',
        },
        {
          alertIds: ['alert-3'],
          detailsMarkdown: 'Details 3',
          summaryMarkdown: 'Summary 3',
          title: 'Attack 3',
        },
      ];

      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: multipleDiscoveries,
        replacements: {},
      });

      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      if (!output.attack_discoveries) throw new Error('Expected attack_discoveries to be defined');

      expect(output.attack_discoveries[2].alert_ids).toEqual(['alert-3']);
    });
  });

  describe('step metadata', () => {
    it('has correct step type ID', () => {
      expect(stepDefinition.id).toBe(GenerateStepTypeId);
    });

    it('has attack-discovery.generate as step type ID', () => {
      expect(GenerateStepTypeId).toBe('security.attack-discovery.generate');
    });
  });

  describe('connector resolution when action_type_id is missing', () => {
    const inputWithoutActionTypeId = {
      ...defaultInput,
      api_config: {
        connector_id: '.anthropic-claude-4.6-opus-chat_completion',
        model: 'test-model',
        // action_type_id intentionally omitted to simulate EIS connector
      },
    };

    it('uses inference.getConnectorById when action_type_id is not provided and inference is available', async () => {
      const mockGetConnectorById = jest.fn().mockResolvedValue({
        type: '.inference',
        connectorId: '.anthropic-claude-4.6-opus-chat_completion',
        isInferenceEndpoint: true,
        name: 'Anthropic Claude',
        config: {},
        capabilities: {},
        isPreconfigured: true,
      });

      const getStartServicesWithInference = jest.fn().mockResolvedValue({
        coreStart: mockCoreStart,
        pluginsStart: {
          actions: {
            getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
          },
          inference: {
            getClient: jest.fn().mockReturnValue({ chatComplete: jest.fn() }),
            getConnectorById: mockGetConnectorById,
          },
        },
      });

      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: [],
        replacements: {},
      });

      const stepDefWithInference = getGenerateStepDefinition({
        connectorTimeout: 60000,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: getStartServicesWithInference,
        langSmithApiKey: undefined,
        langSmithProject: undefined,
        logger: mockLogger,
      });

      const context = { ...mockContext, input: inputWithoutActionTypeId };
      await stepDefWithInference.handler(context as any);

      expect(mockGetConnectorById).toHaveBeenCalledWith(
        '.anthropic-claude-4.6-opus-chat_completion',
        expect.any(Object)
      );
    });

    it('passes resolved actionTypeId from inference connector to the graph', async () => {
      const mockGetConnectorById = jest.fn().mockResolvedValue({
        type: '.inference',
        connectorId: '.anthropic-claude-4.6-opus-chat_completion',
        isInferenceEndpoint: true,
        name: 'Anthropic Claude',
        config: {},
        capabilities: {},
        isPreconfigured: true,
      });

      const getStartServicesWithInference = jest.fn().mockResolvedValue({
        coreStart: mockCoreStart,
        pluginsStart: {
          actions: {
            getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
          },
          inference: {
            getClient: jest.fn().mockReturnValue({ chatComplete: jest.fn() }),
            getConnectorById: mockGetConnectorById,
          },
        },
      });

      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: [],
        replacements: {},
      });

      const stepDefWithInference = getGenerateStepDefinition({
        connectorTimeout: 60000,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: getStartServicesWithInference,
        langSmithApiKey: undefined,
        langSmithProject: undefined,
        logger: mockLogger,
      });

      const context = { ...mockContext, input: inputWithoutActionTypeId };
      await stepDefWithInference.handler(context as any);

      expect(mockInvokeAttackDiscoveryGraphWithAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          apiConfig: expect.objectContaining({
            action_type_id: '.inference',
          }),
        })
      );
    });

    it('falls back to resolveConnectorDetails when inference plugin is not available', async () => {
      const mockActionsClientWithGet = {
        ...mockActionsClient,
        get: jest.fn().mockResolvedValue({
          actionTypeId: '.gen-ai',
          name: 'OpenAI Connector',
        }),
      };

      const getStartServicesWithoutInference = jest.fn().mockResolvedValue({
        coreStart: mockCoreStart,
        pluginsStart: {
          actions: {
            getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClientWithGet),
          },
          // inference intentionally omitted
        },
      });

      mockInvokeAttackDiscoveryGraphWithAlerts.mockResolvedValue({
        discoveries: [],
        replacements: {},
      });

      const stepDefWithoutInference = getGenerateStepDefinition({
        connectorTimeout: 60000,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: getStartServicesWithoutInference,
        langSmithApiKey: undefined,
        langSmithProject: undefined,
        logger: mockLogger,
      });

      const context = { ...mockContext, input: inputWithoutActionTypeId };
      await stepDefWithoutInference.handler(context as any);

      expect(mockActionsClientWithGet.get).toHaveBeenCalledWith({
        id: '.anthropic-claude-4.6-opus-chat_completion',
      });
    });
  });
});
