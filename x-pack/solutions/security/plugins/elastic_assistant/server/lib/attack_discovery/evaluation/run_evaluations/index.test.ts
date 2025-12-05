/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { loggerMock } from '@kbn/logging-mocks';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';

import { runEvaluations } from '.';
import { type DefaultAttackDiscoveryGraph } from '../../graphs/default_attack_discovery_graph';
import { mockExperimentConnector } from '../__mocks__/mock_experiment_connector';
import { getLlmType } from '../../../../routes/utils';
import type { PhoenixConfig } from '../../../../routes/evaluate/utils';

// Mock Phoenix experiment
const mockRunExperiment = jest.fn(
  async ({ task }: { task: (params: unknown) => Promise<unknown> }) => {
    // Simulate calling the task with example input
    await task({
      input: {
        overrides: {
          errors: ['test-error'],
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

jest.mock('@kbn/langchain/server', () => ({
  ...jest.requireActual('@kbn/langchain/server'),
  ActionsClientLlm: jest.fn(),
}));

jest.mock('../../../../routes/evaluate/utils', () => ({
  createPhoenixClient: jest.fn(() => ({
    getDataset: jest.fn(),
    createDataset: jest.fn(),
  })),
}));

const datasetName = 'test-dataset';
const evaluationId = 'test-evaluation-id';
const tracingApiKey = 'test-api-key';
const logger = loggerMock.create();
const connectors = [mockExperimentConnector];

const projectName = 'test-lang-smith-project';

const phoenixConfig: PhoenixConfig = {
  baseUrl: 'http://localhost:6006',
  headers: { Authorization: 'Bearer test-phoenix-api-key' },
};

const graphs: Array<{
  connector: Connector;
  graph: DefaultAttackDiscoveryGraph;
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
    invoke: jest.fn().mockResolvedValue({ insights: [] }),
  } as unknown as DefaultAttackDiscoveryGraph;

  return {
    connector,
    graph,
    llmType,
    name: `testRunName - ${connector.name} - ${evaluationId} - Attack discovery`,
    traceOptions,
  };
});

describe('runEvaluations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('invokes the graph with the expected overrides from Phoenix task', async () => {
    await runEvaluations({
      datasetName,
      graphs,
      logger,
      phoenixConfig,
      evaluationId,
    });

    expect(graphs[0].graph.invoke).toHaveBeenCalledWith(
      {
        errors: ['test-error'],
      },
      {
        callbacks: [...graphs[0].traceOptions.tracers],
        runName: graphs[0].name,
        tags: ['evaluation', graphs[0].llmType ?? ''],
      }
    );
  });

  it('creates Phoenix experiment with correct parameters', async () => {
    await runEvaluations({
      datasetName,
      graphs,
      logger,
      phoenixConfig,
      evaluationId,
    });

    expect(mockRunExperiment).toHaveBeenCalledWith(
      expect.objectContaining({
        dataset: { datasetId: datasetName },
        experimentName: expect.stringContaining(evaluationId),
        experimentMetadata: expect.objectContaining({
          evaluationId,
          connectorId: graphs[0].connector.id,
          connectorName: graphs[0].connector.name,
          llmType: graphs[0].llmType,
          graphType: 'attack-discovery',
        }),
        evaluators: expect.arrayContaining([
          expect.objectContaining({
            name: 'attack_discovery_correctness',
            kind: 'CODE',
          }),
          expect.objectContaining({
            name: 'attack_discovery_structure',
            kind: 'CODE',
          }),
        ]),
      })
    );
  });

  it('catches and logs errors that occur during evaluation', async () => {
    const error = new Error('Test error');

    (graphs[0].graph.invoke as jest.Mock).mockRejectedValue(error);

    await runEvaluations({
      datasetName,
      graphs,
      logger,
      phoenixConfig,
      evaluationId,
    });

    expect(logger.error).toHaveBeenCalledWith(
      'Error evaluating connector "Gemini 1.5 Pro 002" (gemini), running experiment "testRunName - Gemini 1.5 Pro 002 - test-evaluation-id - Attack discovery": Error: Test error'
    );
  });
});
