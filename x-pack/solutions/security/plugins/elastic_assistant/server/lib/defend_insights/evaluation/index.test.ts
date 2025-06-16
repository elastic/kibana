/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluateDefendInsights } from '.';
import { runDefendInsightsEvaluations } from './run_evaluations';
import { ActionsClientLlm } from '@kbn/langchain/server';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { getLlmType } from '../../../routes/utils';
import { DefendInsightType } from '@kbn/elastic-assistant-common';
import { Logger } from '@kbn/logging';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '@kbn/actions-plugin/server';

jest.mock('./run_evaluations');
jest.mock('@kbn/langchain/server', () => ({
  ActionsClientLlm: jest.fn(),
}));
jest.mock('@kbn/langchain/server/tracers/langsmith', () => ({
  getLangSmithTracer: jest.fn().mockReturnValue(['mockTracer']),
}));
jest.mock('../../../routes/utils', () => ({
  getLlmType: jest.fn().mockReturnValue('mock-llm-type'),
}));

const mockLogger = { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() };

describe('evaluateDefendInsights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create graphs and call runDefendInsightsEvaluations with expected params', async () => {
    const mockGraph = { mock: 'graph' };
    const mockGetDefaultDefendInsightsGraph = jest.fn().mockReturnValue(mockGraph);

    const mockGraphMetadata = [
      {
        getDefaultDefendInsightsGraph: mockGetDefaultDefendInsightsGraph,
        graphType: 'defend-insights' as const,
      },
    ];

    const mockConnectors = [
      {
        id: '1',
        name: 'Test Connector',
        actionTypeId: '.test',
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: false,
        config: {},
        secrets: {},
        prompts: {
          default: 'default',
          refine: 'refine',
          continue: 'continue',
          group: 'group',
          events: 'events',
          eventsId: 'eventsId',
          eventsEndpointId: 'eventsEndpointId',
          eventsValue: 'eventsValue',
        },
      },
    ];

    const mockActionsClient = {} as unknown as PublicMethodsOf<ActionsClient>;
    const mockEsClient = {} as unknown as ElasticsearchClient;
    const mockEsClientInternalUser = {} as unknown as ElasticsearchClient;

    await evaluateDefendInsights({
      actionsClient: mockActionsClient,
      defendInsightsGraphs: mockGraphMetadata,
      anonymizationFields: [],
      connectors: mockConnectors,
      connectorTimeout: 1000,
      datasetName: 'test-dataset',
      esClient: mockEsClient,
      esClientInternalUser: mockEsClientInternalUser,
      evaluationId: 'eval-1',
      evaluatorConnectorId: 'eval-connector',
      langSmithApiKey: 'api-key',
      langSmithProject: 'project-name',
      logger: mockLogger as unknown as Logger,
      runName: 'test-run',
      size: 10,
    });

    expect(getLlmType).toHaveBeenCalledWith('.test');
    expect(getLangSmithTracer).toHaveBeenCalledWith({
      apiKey: 'api-key',
      projectName: 'project-name',
      logger: mockLogger,
    });
    expect(ActionsClientLlm).toHaveBeenCalledWith({
      actionsClient: mockActionsClient,
      connectorId: '1',
      llmType: 'mock-llm-type',
      logger: mockLogger,
      temperature: 0,
      timeout: 1000,
      traceOptions: {
        projectName: 'project-name',
        tracers: ['mockTracer'],
      },
    });

    expect(mockGetDefaultDefendInsightsGraph).toHaveBeenCalledWith({
      insightType: DefendInsightType.Enum.incompatible_antivirus,
      endpointIds: [],
      esClient: mockEsClient,
      llm: expect.any(Object),
      logger: mockLogger,
      size: 10,
      anonymizationFields: [],
      prompts: {
        default: 'default',
        refine: 'refine',
        continue: 'continue',
        group: 'group',
        events: 'events',
        eventsId: 'eventsId',
        eventsEndpointId: 'eventsEndpointId',
        eventsValue: 'eventsValue',
      },
    });

    expect(runDefendInsightsEvaluations).toHaveBeenCalledWith({
      evaluatorConnectorId: 'eval-connector',
      datasetName: 'test-dataset',
      graphs: [
        expect.objectContaining({
          connector: mockConnectors[0],
          graph: mockGraph,
          llmType: 'mock-llm-type',
          name: 'test-run - Test Connector - eval-1 - Defend Insights',
          traceOptions: {
            projectName: 'project-name',
            tracers: ['mockTracer'],
          },
        }),
      ],
      insightType: 'incompatible_antivirus',
      langSmithApiKey: 'api-key',
      logger: mockLogger,
    });
  });
});
