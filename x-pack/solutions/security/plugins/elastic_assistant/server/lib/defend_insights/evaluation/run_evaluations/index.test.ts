/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { loggerMock } from '@kbn/logging-mocks';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';

import { runDefendInsightsEvaluations } from '.';
import type { DefaultDefendInsightsGraph } from '../../graphs/default_defend_insights_graph';
import { getLlmType } from '../../../../routes/utils';
import { type PhoenixConfig } from '../../../../routes/evaluate/utils';
import { DefendInsightType } from '@kbn/elastic-assistant-common';
import { createMockConnector } from '@kbn/actions-plugin/server/application/connector/mocks';

// Mock Phoenix experiment
const mockRunExperiment = jest.fn(
  async ({ task }: { task: (params: unknown) => Promise<unknown> }) => {
    // Simulate calling the task with example input
    await task({
      input: {
        overrides: {
          data: 'test',
        },
      },
      output: {},
      metadata: {},
    });
    return { experimentId: 'test-experiment-id' };
  }
);

jest.mock('@arizeai/phoenix-client/experiments', () => ({
  runExperiment: (params: { task: (params: unknown) => Promise<unknown> }) =>
    mockRunExperiment(params),
}));

jest.mock('../helpers/get_custom_evaluator/customPolicyResponseFailureEvaluator', () => ({
  createPolicyResponseFailureEvaluator: jest.fn().mockReturnValue({
    name: 'policy_response_failure',
    kind: 'CODE',
    evaluate: jest.fn(),
  }),
}));

jest.mock('../helpers/get_graph_input_overrides', () => ({
  getDefendInsightsGraphInputOverrides: jest.fn((input) => input.overrides ?? {}),
}));

jest.mock('../../../../routes/evaluate/utils', () => ({
  createPhoenixClient: jest.fn(() => ({
    getDataset: jest.fn(),
    createDataset: jest.fn(),
  })),
  getLlmType: jest.requireActual('../../../../routes/utils').getLlmType,
}));

const mockExperimentConnector = createMockConnector({
  name: 'Gemini 1.5 Pro 002',
  actionTypeId: '.gemini',
  config: {
    apiUrl: 'https://example.com',
    defaultModel: 'gemini-1.5-pro-002',
    gcpRegion: 'test-region',
    gcpProjectID: 'test-project-id',
  },
  id: 'gemini-1-5-pro-002',
  isPreconfigured: true,
});

const datasetName = 'test-dataset';
const evaluationId = 'test-evaluation-id';
const tracingApiKey = 'test-api-key';
const logger = loggerMock.create();
const connectors = [mockExperimentConnector];
const projectName = 'test-lang-smith-project';

const phoenixConfig: PhoenixConfig = {
  baseUrl: 'http://localhost:6006',
  headers: { Authorization: `Bearer ${tracingApiKey}` },
};

const graphs: Array<{
  connector: Connector;
  graph: DefaultDefendInsightsGraph;
  llmType: string | undefined;
  name: string;
  traceOptions: {
    projectName: string | undefined;
    tracers: LangChainTracer[];
  };
}> = connectors.map((connector) => {
  const llmType = getLlmType(connector.actionTypeId);

  const traceOptions = {
    projectName,
    tracers: [
      ...getLangSmithTracer({
        apiKey: tracingApiKey,
        projectName,
        logger,
      }),
    ],
  };

  const graph = {
    invoke: jest.fn().mockResolvedValue({}),
  } as unknown as DefaultDefendInsightsGraph;

  return {
    connector,
    graph,
    llmType,
    name: `testRunName - ${connector.name} - testEvaluationId - Defend Insights`,
    traceOptions,
  };
});

describe('runDefendInsightsEvaluations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('invokes the graph with the expected overrides from Phoenix task', async () => {
    await runDefendInsightsEvaluations({
      datasetName,
      evaluationId,
      graphs,
      logger,
      phoenixConfig,
      insightType: DefendInsightType.Enum.incompatible_antivirus,
    });

    expect(graphs[0].graph.invoke).toHaveBeenCalledWith(
      {
        data: 'test',
      },
      {
        callbacks: [...graphs[0].traceOptions.tracers],
        runName: graphs[0].name,
        tags: ['evaluation', graphs[0].llmType ?? ''],
      }
    );
  });

  it('catches and logs errors that occur during evaluation', async () => {
    const error = new Error('Test error');

    (graphs[0].graph.invoke as jest.Mock).mockRejectedValue(error);

    await runDefendInsightsEvaluations({
      datasetName,
      evaluationId,
      graphs,
      logger,
      phoenixConfig,
      insightType: DefendInsightType.Enum.incompatible_antivirus,
    });

    expect(logger.error).toHaveBeenCalledWith(
      'Error evaluating connector "Gemini 1.5 Pro 002" (gemini), running experiment "testRunName - Gemini 1.5 Pro 002 - testEvaluationId - Defend Insights": Error: Test error'
    );
  });
});
