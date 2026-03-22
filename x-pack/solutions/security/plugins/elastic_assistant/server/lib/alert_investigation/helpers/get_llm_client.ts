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

import { getLlmType } from '../../../routes/utils';

/**
 * Get LLM client for alert investigation
 *
 * Reuses Elastic Assistant's ActionsClientLlm pattern
 */
export const getLlmClient = async ({
  actionsClient,
  connectorId,
  connectorTimeout = 60000, // 1 minute default
  langSmithApiKey,
  logger,
}: {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  connectorTimeout?: number;
  langSmithApiKey: string | undefined;
  logger: Logger;
}): Promise<ActionsClientLlm> => {
  const connector = await actionsClient.get({
    id: connectorId,
    throwIfSystemAction: false,
  });

  if (!connector) {
    throw new Error(`Connector ${connectorId} not found`);
  }

  const llmType = getLlmType(connector.actionTypeId);

  logger.info(
    `Alert Investigation using ${connector.name} (${llmType}) connector for investigation`
  );

  const traceOptions = {
    projectName: 'alert-investigation',
    tracers: [
      ...getLangSmithTracer({
        apiKey: langSmithApiKey,
        projectName: 'alert-investigation',
        logger,
      }),
    ],
  };

  return new ActionsClientLlm({
    actionsClient,
    connectorId: connector.id,
    llmType,
    logger,
    temperature: 0.2, // Slight temperature for reasoning
    timeout: connectorTimeout,
    traceOptions,
    telemetryMetadata: {
      pluginId: 'security_alert_investigation',
    },
  });
};
