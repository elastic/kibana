/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { loggerMock } from '@kbn/logging-mocks';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';

import { evaluateAttackDiscovery } from '.';
import type { DefaultAttackDiscoveryGraph } from '../graphs/default_attack_discovery_graph';
import type { AttackDiscoveryGraphMetadata } from '../../langchain/graphs';
import { mockExperimentConnector } from './__mocks__/mock_experiment_connector';
import { getLlmType } from '../../../routes/utils';
import type { PhoenixConfig } from '../../../routes/evaluate/utils';

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

jest.mock('../../../routes/evaluate/utils', () => ({
  createOrUpdateEvaluationResults: jest.fn(),
  createPhoenixClient: jest.fn(() => ({
    getDataset: jest.fn(),
    createDataset: jest.fn(),
  })),
  EvaluationStatus: { COMPLETE: 'complete' },
}));

const actionsClient = {
  get: jest.fn(),
} as unknown as ActionsClient;
const alertsIndexPattern = 'test-alerts-index-pattern';
const connectorTimeout = 1000;
const datasetName = 'test-dataset';
const evaluationId = 'test-evaluation-id';
const tracingApiKey = 'test-api-key';
const logger = loggerMock.create();
const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
const mockEsClientInternalUser = elasticsearchServiceMock.createElasticsearchClient();
const runName = 'test-run-name';

const phoenixConfig: PhoenixConfig = {
  baseUrl: 'http://localhost:6006',
  headers: { Authorization: 'Bearer test-phoenix-api-key' },
};

const connectors = [
  {
    ...mockExperimentConnector,
    prompts: {
      default: '',
      refine: '',
      continue: '',
      detailsMarkdown: '',
      entitySummaryMarkdown: '',
      mitreAttackTactics: '',
      summaryMarkdown: '',
      title: '',
      insights: '',
    },
  },
];

const projectName = 'test-lang-smith-project';

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
    name: `${runName} - ${connector.name} - ${evaluationId} - Attack discovery`,
    traceOptions,
  };
});

const attackDiscoveryGraphs: AttackDiscoveryGraphMetadata[] = [
  {
    getDefaultAttackDiscoveryGraph: jest.fn().mockReturnValue(graphs[0].graph),
    graphType: 'attack-discovery',
  },
];

describe('evaluateAttackDiscovery', () => {
  beforeEach(() => jest.clearAllMocks());

  it('evaluates the attack discovery graphs using Phoenix', async () => {
    await evaluateAttackDiscovery({
      actionsClient,
      attackDiscoveryGraphs,
      alertsIndexPattern,
      connectors,
      connectorTimeout,
      datasetName,
      esClient: mockEsClient,
      esClientInternalUser: mockEsClientInternalUser,
      evaluationId,
      logger,
      phoenixConfig,
      runName,
      size: 20,
    });

    // Verify that the Phoenix runExperiment was called
    expect(mockRunExperiment).toHaveBeenCalled();

    // Verify the graph was invoked with expected overrides
    expect(graphs[0].graph.invoke).toHaveBeenCalledWith(
      {
        errors: ['test-error'],
      },
      expect.objectContaining({
        runName: expect.stringContaining(runName),
        tags: expect.arrayContaining(['evaluation']),
      })
    );
  });
});
