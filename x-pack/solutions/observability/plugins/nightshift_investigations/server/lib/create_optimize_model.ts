/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart, ScopedModel } from '@kbn/agent-builder-server';

/**
 * Same LLM path Agent Builder converse uses:
 * `runtime.createModelProvider` → `resolveSelectedConnectorId` → bound client.
 *
 * Pass the triggering round's connector as `connectorId` (from
 * `round.model_usage.connector_id`) so optimize inherits that turn.
 */
export const createOptimizeModel = async ({
  request,
  connectorId,
  agentBuilder,
  logger,
}: {
  request: KibanaRequest;
  connectorId?: string;
  agentBuilder: AgentBuilderPluginStart | undefined;
  logger: Logger;
}): Promise<ScopedModel | undefined> => {
  if (!agentBuilder) {
    logger.info('Optimize skipped — Agent Builder unavailable');
    return undefined;
  }

  const defaultConnectorId = connectorId?.trim() || undefined;
  const modelProvider = agentBuilder.runtime.createModelProvider({
    request,
    ...(defaultConnectorId ? { defaultConnectorId } : {}),
  });

  try {
    const model = await modelProvider.getDefaultModel();
    logger.info(`Optimize using Agent Builder connector ${model.connector.connectorId}`);
    return model;
  } catch (err) {
    logger.info(`Optimize skipped — no Agent Builder model: ${(err as Error).message}`);
    return undefined;
  }
};
