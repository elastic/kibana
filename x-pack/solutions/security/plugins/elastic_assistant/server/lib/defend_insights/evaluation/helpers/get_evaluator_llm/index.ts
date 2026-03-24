/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/core/server';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { ActionsClientLlm } from '@kbn/langchain/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { InferenceConnector } from '@kbn/inference-common';
import { getConnectorDefaultModel } from '@kbn/inference-common';

import { getLlmType } from '../../../../../routes/utils';

export const getEvaluatorLlm = async ({
  actionsClient,
  connectorTimeout,
  evaluatorConnectorId,
  experimentConnector,
  getInferenceConnectorById,
  langSmithApiKey,
  logger,
}: {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorTimeout: number;
  evaluatorConnectorId: string | undefined;
  experimentConnector: InferenceConnector;
  getInferenceConnectorById: (id: string) => Promise<InferenceConnector>;
  langSmithApiKey: string | undefined;
  logger: Logger;
}): Promise<ActionsClientLlm> => {
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

  return new ActionsClientLlm({
    actionsClient,
    connectorId: evaluatorConnector.connectorId,
    llmType: evaluatorLlmType,
    logger,
    model: getConnectorDefaultModel(evaluatorConnector),
    temperature: 0, // zero temperature for evaluation
    timeout: connectorTimeout,
    traceOptions,
  });
};
