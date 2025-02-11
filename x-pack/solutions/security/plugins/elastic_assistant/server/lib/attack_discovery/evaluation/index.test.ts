/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { loggerMock } from '@kbn/logging-mocks';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';

import { evaluateAttackDiscovery } from '.';
import { DefaultAttackDiscoveryGraph } from '../graphs/default_attack_discovery_graph';
import { AttackDiscoveryGraphMetadata } from '../../langchain/graphs';
import { mockExperimentConnector } from './__mocks__/mock_experiment_connector';
import { getLlmType } from '../../../routes/utils';

jest.mock('@kbn/langchain/server', () => ({
  ...jest.requireActual('@kbn/langchain/server'),

  ActionsClientLlm: jest.fn(),
}));

jest.mock('langsmith/evaluation', () => ({
  evaluate: jest.fn(async (predict: Function) =>
    predict({
      overrides: {
        errors: ['test-error'],
      },
    })
  ),
}));

jest.mock('./helpers/get_custom_evaluator', () => ({
  getCustomEvaluator: jest.fn(),
}));

jest.mock('./helpers/get_evaluator_llm', () => {
  const mockLlm = jest.fn() as unknown as ActionsClientLlm;

  return {
    getEvaluatorLlm: jest.fn().mockResolvedValue(mockLlm),
  };
});
const actionsClient = {
  get: jest.fn(),
} as unknown as ActionsClient;
const alertsIndexPattern = 'test-alerts-index-pattern';
const connectorTimeout = 1000;
const datasetName = 'test-dataset';
const evaluationId = 'test-evaluation-id';
const evaluatorConnectorId = 'test-evaluator-connector-id';
const langSmithApiKey = 'test-api-key';
const langSmithProject = 'test-lang-smith-project';
const logger = loggerMock.create();
const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
const runName = 'test-run-name';

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
        apiKey: langSmithApiKey,
        projectName,
        logger,
      }),
    ],
  };

  const graph = {
    invoke: jest.fn().mockResolvedValue({}),
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

  it('evaluates the attack discovery graphs', async () => {
    await evaluateAttackDiscovery({
      actionsClient,
      attackDiscoveryGraphs,
      alertsIndexPattern,
      connectors,
      connectorTimeout,
      datasetName,
      esClient: mockEsClient,
      evaluationId,
      evaluatorConnectorId,
      langSmithApiKey,
      langSmithProject,
      logger,
      runName,
      size: 20,
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
});
