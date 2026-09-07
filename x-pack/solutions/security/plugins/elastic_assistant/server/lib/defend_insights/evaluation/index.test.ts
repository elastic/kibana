/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { ActionsClientLlm } from '@kbn/langchain/server';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { DefendInsightType } from '@kbn/elastic-assistant-common';
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';

import { getLlmType } from '../../../routes/utils';
import { runDefendInsightsEvaluations } from './run_evaluations';
import { evaluateDefendInsights } from '.';

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
jest.mock('../prompts', () => ({
  getDefendInsightsPrompt: jest.fn().mockReturnValue({
    default: 'default',
    refine: 'refine',
    continue: 'continue',
    group: 'group',
    events: 'events',
    eventsId: 'eventsId',
    eventsEndpointId: 'eventsEndpointId',
    eventsValue: 'eventsValue',
  }),
}));

const mockLogger = { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() };

describe('evaluateDefendInsights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('graph creation and evaluation', () => {
    const mockGraph = { mock: 'graph' };
    const mockGetDefaultDefendInsightsGraph = jest.fn().mockReturnValue(mockGraph);

    const mockGraphMetadata = [
      {
        getDefaultDefendInsightsGraph: mockGetDefaultDefendInsightsGraph,
        graphType: 'defend-insights' as const,
        insightType: DefendInsightType.enum.incompatible_antivirus,
      },
    ];

    const mockConnectors: InferenceConnector[] = [
      {
        connectorId: '1',
        type: InferenceConnectorType.OpenAI,
        name: 'Test Connector',
        config: {},
        capabilities: {},
        isInferenceEndpoint: false,
        isPreconfigured: false,
      },
    ];

    const mockActionsClient = {} as unknown as PublicMethodsOf<ActionsClient>;
    const mockEsClient = {} as unknown as ElasticsearchClient;
    const mockSoClient = savedObjectsClientMock.create();
    const mockEsClientInternalUser = {} as unknown as ElasticsearchClient;
    const mockGetInferenceConnectorById = jest.fn();

    beforeEach(async () => {
      await evaluateDefendInsights({
        actionsClient: mockActionsClient,
        getInferenceConnectorById: mockGetInferenceConnectorById,
        defendInsightsGraphs: mockGraphMetadata,
        anonymizationFields: [],
        connectors: mockConnectors,
        connectorTimeout: 1000,
        datasetName: 'test-dataset',
        esClient: mockEsClient,
        soClient: mockSoClient,
        esClientInternalUser: mockEsClientInternalUser,
        evaluationId: 'eval-1',
        evaluatorConnectorId: 'eval-connector',
        langSmithApiKey: 'api-key',
        langSmithProject: 'project-name',
        logger: mockLogger as unknown as Logger,
        runName: 'test-run',
        size: 10,
      });
    });

    it('calls getLlmType with connector action type', () => {
      expect(getLlmType).toHaveBeenCalledWith('.gen-ai');
    });

    it('calls getLangSmithTracer with correct params', () => {
      expect(getLangSmithTracer).toHaveBeenCalledWith({
        apiKey: 'api-key',
        projectName: 'project-name',
        logger: mockLogger,
      });
    });

    it('creates ActionsClientLlm with correct params', () => {
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
    });

    it('calls getDefaultDefendInsightsGraph with correct params', () => {
      expect(mockGetDefaultDefendInsightsGraph).toHaveBeenCalledWith({
        insightType: DefendInsightType.enum.incompatible_antivirus,
        endpointIds: [],
        esClient: mockEsClient,
        llm: expect.any(Object),
        kbDataClient: null,
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
    });

    it('calls runDefendInsightsEvaluations with correct params', () => {
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
});
