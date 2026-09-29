/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { ActionsClient } from '@kbn/actions-plugin/server';
import { ActionsClientLlm } from '@kbn/langchain/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';

import { getEvaluatorLlm } from '.';

vi.mock('@kbn/langchain/server', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/langchain/server')),
      ActionsClientLlm: vi.fn(),
      getLangSmithTracer: vi.fn().mockReturnValue(['mock-tracer']),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../routes/utils', () => {
      const mocked = {
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
    };
      return { ...mocked, default: mocked };
    });

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
    vi.clearAllMocks();
  });

  describe('evaluator connector resolution', () => {
    it('uses the provided evaluatorConnectorId if available', async () => {
      const actionsClient = {} as unknown as ActionsClient;
      const getInferenceConnectorById = vi.fn().mockResolvedValue(evaluatorConnector);

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
      const getInferenceConnectorById = vi.fn().mockResolvedValue(experimentConnector);

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
      const getInferenceConnectorById = vi.fn().mockRejectedValue(new Error('Not found'));

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
    const getInferenceConnectorById = vi.fn().mockResolvedValue(evaluatorConnector);

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
    const getInferenceConnectorById = vi.fn().mockResolvedValue(evaluatorConnector);

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
