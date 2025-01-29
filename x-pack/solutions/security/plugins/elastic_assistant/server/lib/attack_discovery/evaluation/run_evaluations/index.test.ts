/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { loggerMock } from '@kbn/logging-mocks';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';

import { runEvaluations } from '.';
import { type DefaultAttackDiscoveryGraph } from '../../graphs/default_attack_discovery_graph';
import { mockExperimentConnector } from '../__mocks__/mock_experiment_connector';
import { getLlmType } from '../../../../routes/utils';

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

jest.mock('../helpers/get_custom_evaluator', () => ({
  getCustomEvaluator: jest.fn(),
}));

jest.mock('../helpers/get_evaluator_llm', () => {
  const mockLlm = jest.fn() as unknown as ActionsClientLlm;

  return {
    getEvaluatorLlm: jest.fn().mockResolvedValue(mockLlm),
  };
});

const actionsClient = {
  get: jest.fn(),
} as unknown as ActionsClient;
const connectorTimeout = 1000;
const datasetName = 'test-dataset';
const evaluatorConnectorId = 'test-evaluator-connector-id';
const langSmithApiKey = 'test-api-key';
const logger = loggerMock.create();
const connectors = [mockExperimentConnector];

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
    name: `testRunName - ${connector.name} - testEvaluationId - Attack discovery`,
    traceOptions,
  };
});

describe('runEvaluations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('predict() invokes the graph with the expected overrides', async () => {
    await runEvaluations({
      actionsClient,
      connectorTimeout,
      datasetName,
      evaluatorConnectorId,
      graphs,
      langSmithApiKey,
      logger,
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

  it('catches and logs errors that occur during evaluation', async () => {
    const error = new Error('Test error');

    (graphs[0].graph.invoke as jest.Mock).mockRejectedValue(error);

    await runEvaluations({
      actionsClient,
      connectorTimeout,
      datasetName,
      evaluatorConnectorId,
      graphs,
      langSmithApiKey,
      logger,
    });

    expect(logger.error).toHaveBeenCalledWith(
      'Error evaluating connector "Gemini 1.5 Pro 002" (gemini), running experiment "testRunName - Gemini 1.5 Pro 002 - testEvaluationId - Attack discovery": Error: Test error'
    );
  });
});
