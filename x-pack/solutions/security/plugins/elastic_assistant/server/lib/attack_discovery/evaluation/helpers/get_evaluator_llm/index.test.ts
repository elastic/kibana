/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { ActionsClientLlm } from '@kbn/langchain/server';
import { loggerMock } from '@kbn/logging-mocks';

import { getEvaluatorLlm } from '.';

jest.mock('@kbn/langchain/server', () => ({
  ...jest.requireActual('@kbn/langchain/server'),

  ActionsClientLlm: jest.fn(),
}));

const connectorTimeout = 1000;

const evaluatorConnectorId = 'evaluator-connector-id';
const evaluatorConnector = {
  id: 'evaluatorConnectorId',
  actionTypeId: '.gen-ai',
  name: 'GPT-4o',
  isPreconfigured: true,
  isSystemAction: false,
  isDeprecated: false,
} as Connector;

const experimentConnector: Connector = {
  name: 'Gemini 1.5 Pro 002',
  actionTypeId: '.gemini',
  config: {
    apiUrl: 'https://example.com',
    defaultModel: 'gemini-1.5-pro-002',
    gcpRegion: 'test-region',
    gcpProjectID: 'test-project-id',
  },
  secrets: {
    credentialsJson: '{}',
  },
  id: 'gemini-1-5-pro-002',
  isPreconfigured: true,
  isSystemAction: false,
  isDeprecated: false,
} as Connector;

const logger = loggerMock.create();

describe('getEvaluatorLlm', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getting the evaluation connector', () => {
    it("calls actionsClient.get with the evaluator connector ID when it's provided", async () => {
      const actionsClient = {
        get: jest.fn(),
      } as unknown as ActionsClient;

      await getEvaluatorLlm({
        actionsClient,
        connectorTimeout,
        evaluatorConnectorId,
        experimentConnector,
        langSmithApiKey: undefined,
        logger,
      });

      expect(actionsClient.get).toHaveBeenCalledWith({
        id: evaluatorConnectorId,
        throwIfSystemAction: false,
      });
    });

    it("calls actionsClient.get with the experiment connector ID when the evaluator connector ID isn't provided", async () => {
      const actionsClient = {
        get: jest.fn().mockResolvedValue(null),
      } as unknown as ActionsClient;

      await getEvaluatorLlm({
        actionsClient,
        connectorTimeout,
        evaluatorConnectorId: undefined,
        experimentConnector,
        langSmithApiKey: undefined,
        logger,
      });

      expect(actionsClient.get).toHaveBeenCalledWith({
        id: experimentConnector.id,
        throwIfSystemAction: false,
      });
    });

    it('falls back to the experiment connector when the evaluator connector is not found', async () => {
      const actionsClient = {
        get: jest.fn().mockResolvedValue(null),
      } as unknown as ActionsClient;

      await getEvaluatorLlm({
        actionsClient,
        connectorTimeout,
        evaluatorConnectorId,
        experimentConnector,
        langSmithApiKey: undefined,
        logger,
      });

      expect(ActionsClientLlm).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: experimentConnector.id,
        })
      );
    });
  });

  it('logs the expected connector names and types', async () => {
    const actionsClient = {
      get: jest.fn().mockResolvedValue(evaluatorConnector),
    } as unknown as ActionsClient;

    await getEvaluatorLlm({
      actionsClient,
      connectorTimeout,
      evaluatorConnectorId,
      experimentConnector,
      langSmithApiKey: undefined,
      logger,
    });

    expect(logger.info).toHaveBeenCalledWith(
      `The ${evaluatorConnector.name} (openai) connector will judge output from the ${experimentConnector.name} (gemini) connector`
    );
  });

  it('creates a new ActionsClientLlm instance with the expected traceOptions', async () => {
    const actionsClient = {
      get: jest.fn().mockResolvedValue(evaluatorConnector),
    } as unknown as ActionsClient;

    await getEvaluatorLlm({
      actionsClient,
      connectorTimeout,
      evaluatorConnectorId,
      experimentConnector,
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
