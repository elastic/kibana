/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import { ActionsClientLlm } from '@kbn/langchain/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';

import { getEvaluatorLlm } from '.';

jest.mock('@kbn/langchain/server', () => ({
  ...jest.requireActual('@kbn/langchain/server'),
  ActionsClientLlm: jest.fn(),
  getLangSmithTracer: jest.fn().mockReturnValue(['mock-tracer']),
}));

jest.mock('../../../../../routes/utils', () => ({
  getLlmType: (actionTypeId: string) => {
    switch (actionTypeId) {
      case '.gen-ai':
        return 'openai';
      case '.gemini':
        return 'gemini';
      default:
        return 'unknown';
    }
  },
}));

const connectorTimeout = 1500;
const evaluatorConnectorId = 'evaluator-connector-id';

const evaluatorConnector: InferenceConnector = {
  connectorId: 'evaluator-connector-id',
  type: InferenceConnectorType.OpenAI,
  name: 'OpenAI Evaluator',
  config: {},
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
};

const experimentConnector: InferenceConnector = {
  connectorId: 'experiment-connector-id',
  type: InferenceConnectorType.Gemini,
  name: 'Gemini Experiment',
  config: {},
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: true,
};

const logger = loggerMock.create();

describe('getEvaluatorLlm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluator connector resolution', () => {
    it('uses the provided evaluatorConnectorId if available', async () => {
      const actionsClient = {} as unknown as ActionsClient;
      const getInferenceConnectorById = jest.fn().mockResolvedValue(evaluatorConnector);

      await getEvaluatorLlm({
        actionsClient,
        connectorTimeout,
        evaluatorConnectorId,
        experimentConnector,
        getInferenceConnectorById,
        langSmithApiKey: undefined,
        logger,
      });

      expect(getInferenceConnectorById).toHaveBeenCalledWith(evaluatorConnectorId);
    });

    it('falls back to experimentConnector.connectorId if no evaluatorConnectorId is provided', async () => {
      const actionsClient = {} as unknown as ActionsClient;
      const getInferenceConnectorById = jest.fn().mockResolvedValue(experimentConnector);

      await getEvaluatorLlm({
        actionsClient,
        connectorTimeout,
        evaluatorConnectorId: undefined,
        experimentConnector,
        getInferenceConnectorById,
        langSmithApiKey: undefined,
        logger,
      });

      expect(getInferenceConnectorById).toHaveBeenCalledWith(experimentConnector.connectorId);
    });

    it('uses the experimentConnector if getInferenceConnectorById throws', async () => {
      const actionsClient = {} as unknown as ActionsClient;
      const getInferenceConnectorById = jest.fn().mockRejectedValue(new Error('Not found'));

      await getEvaluatorLlm({
        actionsClient,
        connectorTimeout,
        evaluatorConnectorId,
        experimentConnector,
        getInferenceConnectorById,
        langSmithApiKey: undefined,
        logger,
      });

      expect(ActionsClientLlm).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: experimentConnector.connectorId,
        })
      );
    });
  });

  it('logs a message with connector names and llm types', async () => {
    const actionsClient = {} as unknown as ActionsClient;
    const getInferenceConnectorById = jest.fn().mockResolvedValue(evaluatorConnector);

    await getEvaluatorLlm({
      actionsClient,
      connectorTimeout,
      evaluatorConnectorId,
      experimentConnector,
      getInferenceConnectorById,
      langSmithApiKey: undefined,
      logger,
    });

    expect(logger.info).toHaveBeenCalledWith(
      `The ${evaluatorConnector.name} (openai) connector will judge output from the ${experimentConnector.name} (gemini) connector`
    );
  });

  it('passes expected traceOptions and config to ActionsClientLlm', async () => {
    const actionsClient = {} as unknown as ActionsClient;
    const getInferenceConnectorById = jest.fn().mockResolvedValue(evaluatorConnector);

    await getEvaluatorLlm({
      actionsClient,
      connectorTimeout,
      evaluatorConnectorId,
      experimentConnector,
      getInferenceConnectorById,
      langSmithApiKey: 'some-key',
      logger,
    });

    expect(ActionsClientLlm).toHaveBeenCalledWith(
      expect.objectContaining({
        traceOptions: expect.objectContaining({
          projectName: 'evaluators',
          tracers: expect.arrayContaining([expect.anything()]),
        }),
      })
    );
  });
});
