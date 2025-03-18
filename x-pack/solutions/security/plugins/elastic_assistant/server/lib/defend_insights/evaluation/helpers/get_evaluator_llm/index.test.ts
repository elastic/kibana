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

const evaluatorConnector: Connector = {
  id: 'evaluator-connector-id',
  actionTypeId: '.gen-ai',
  name: 'OpenAI Evaluator',
  isPreconfigured: false,
  isSystemAction: false,
  isDeprecated: false,
} as Connector;

const experimentConnector: Connector = {
  id: 'experiment-connector-id',
  actionTypeId: '.gemini',
  name: 'Gemini Experiment',
  config: {},
  secrets: {},
  isPreconfigured: true,
  isSystemAction: false,
  isDeprecated: false,
} as Connector;

const logger = loggerMock.create();

describe('getEvaluatorLlm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluator connector resolution', () => {
    it('uses the provided evaluatorConnectorId if available', async () => {
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

    it('falls back to experimentConnector.id if no evaluatorConnectorId is provided', async () => {
      const actionsClient = {
        get: jest.fn(),
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

    it('uses the experimentConnector if get() returns null', async () => {
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

  it('logs a message with connector names and llm types', async () => {
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

  it('passes expected traceOptions and config to ActionsClientLlm', async () => {
    const actionsClient = {
      get: jest.fn().mockResolvedValue(evaluatorConnector),
    } as unknown as ActionsClient;

    await getEvaluatorLlm({
      actionsClient,
      connectorTimeout,
      evaluatorConnectorId,
      experimentConnector,
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
