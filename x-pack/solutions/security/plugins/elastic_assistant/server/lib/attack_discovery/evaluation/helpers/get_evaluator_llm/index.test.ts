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
}));

const connectorTimeout = 1000;

const evaluatorConnectorId = 'evaluator-connector-id';
const evaluatorConnector: InferenceConnector = {
  connectorId: 'evaluatorConnectorId',
  type: InferenceConnectorType.OpenAI,
  name: 'GPT-4o',
  config: {},
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: true,
};

const experimentConnector: InferenceConnector = {
  connectorId: 'gemini-1-5-pro-002',
  type: InferenceConnectorType.Gemini,
  name: 'Gemini 1.5 Pro 002',
  config: {
    apiUrl: 'https://example.com',
    defaultModel: 'gemini-1.5-pro-002',
    gcpRegion: 'test-region',
    gcpProjectID: 'test-project-id',
  },
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: true,
};

const logger = loggerMock.create();

describe('getEvaluatorLlm', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getting the evaluation connector', () => {
    it("calls getInferenceConnectorById with the evaluator connector ID when it's provided", async () => {
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

    it("calls getInferenceConnectorById with the experiment connector ID when the evaluator connector ID isn't provided", async () => {
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

    it('falls back to the experiment connector when getInferenceConnectorById throws', async () => {
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

  it('logs the expected connector names and types', async () => {
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

  it('creates a new ActionsClientLlm instance with the expected traceOptions', async () => {
    const actionsClient = {} as unknown as ActionsClient;
    const getInferenceConnectorById = jest.fn().mockResolvedValue(evaluatorConnector);

    await getEvaluatorLlm({
      actionsClient,
      connectorTimeout,
      evaluatorConnectorId,
      experimentConnector,
      getInferenceConnectorById,
      langSmithApiKey: 'test-api-key',
      logger,
    });

    expect(ActionsClientLlm).toHaveBeenCalledWith(
      expect.objectContaining({
        traceOptions: {
          projectName: 'evaluators',
          tracers: expect.any(Array),
        },
      })
    );
  });
});
