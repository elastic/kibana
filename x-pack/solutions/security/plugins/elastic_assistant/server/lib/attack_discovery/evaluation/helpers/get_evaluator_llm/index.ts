/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/core/server';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { ActionsClientLlm, InferenceClientLlm } from '@kbn/langchain/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { InferenceClient, InferenceConnector } from '@kbn/inference-common';
import { getConnectorDefaultModel } from '@kbn/inference-common';
import type { BaseLLM } from '@langchain/core/language_models/llms';

import { getLlmType } from '../../../../../routes/utils';

export const getEvaluatorLlm = async ({
  actionsClient,
  connectorTimeout,
  evaluatorConnectorId,
  experimentConnector,
  getInferenceConnectorById,
  inferenceClient,
  langSmithApiKey,
  logger,
}: {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorTimeout: number;
  evaluatorConnectorId: string | undefined;
  experimentConnector: InferenceConnector;
  getInferenceConnectorById: (id: string) => Promise<InferenceConnector>;
  inferenceClient?: InferenceClient;
  langSmithApiKey: string | undefined;
  logger: Logger;
}): Promise<BaseLLM> => {
  let evaluatorConnector: InferenceConnector;
  try {
    evaluatorConnector = await getInferenceConnectorById(
      evaluatorConnectorId ?? experimentConnector.connectorId
    );
  } catch {
    evaluatorConnector = experimentConnector;
  }

  const evaluatorLlmType = getLlmType(evaluatorConnector.type);
  const experimentLlmType = getLlmType(experimentConnector.type);

  logger.info(
    `The ${evaluatorConnector.name} (${evaluatorLlmType}) connector will judge output from the ${experimentConnector.name} (${experimentLlmType}) connector`
  );

  const traceOptions = {
    projectName: 'evaluators',
    tracers: [
      ...getLangSmithTracer({
        apiKey: langSmithApiKey,
        projectName: 'evaluators',
        logger,
      }),
    ],
  };

  const isInferenceConnector = evaluatorConnector.type === '.inference';

  if (isInferenceConnector) {
    if (inferenceClient == null) {
      throw new Error(
        `inferenceClient is required for connector "${evaluatorConnector.connectorId}" ` +
          `(actionTypeId: ${evaluatorConnector.type}) but was not provided`
      );
    }

    return new InferenceClientLlm({
      connectorId: evaluatorConnector.connectorId,
      inferenceClient,
      llmType: evaluatorLlmType,
      logger,
      model: getConnectorDefaultModel(evaluatorConnector),
      temperature: 0,
      timeout: connectorTimeout,
      telemetryMetadata: {
        pluginId: 'security_attack_discovery',
      },
    });
  }

  return new ActionsClientLlm({
    actionsClient,
    connectorId: evaluatorConnector.connectorId,
    llmType: evaluatorLlmType,
    logger,
    model: getConnectorDefaultModel(evaluatorConnector),
    temperature: 0, // zero temperature for evaluation
    timeout: connectorTimeout,
    traceOptions,
    telemetryMetadata: {
      pluginId: 'security_attack_discovery',
    },
  });
};
