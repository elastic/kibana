/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { LLMInvokeFn } from '../services/hybrid_alert_deduplication';

/**
 * Creates an LLM invoke function compatible with HybridClustering
 * using the inference plugin (same backend as ai.prompt workflow step).
 */
export const createInferenceLLMInvokeFn = async ({
  inference,
  connectorId,
  request,
  abortSignal,
}: {
  inference: InferenceServerStart;
  connectorId: string;
  request: KibanaRequest;
  abortSignal?: AbortSignal;
}): Promise<LLMInvokeFn> => {
  const chatModel = await inference.getChatModel({
    connectorId,
    request,
    chatModelOptions: {
      temperature: 0,
      maxRetries: 0,
    },
  });

  return async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const response = await chatModel.invoke(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { signal: abortSignal }
    );

    return typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);
  };
};

/**
 * Resolves a connector ID from a name/ID or falls back to the default connector.
 * Returns null if no connector is available (Stage 2 will be skipped).
 */
export const resolveConnectorId = async (
  nameOrId: string | undefined,
  inference: InferenceServerStart,
  request: KibanaRequest
): Promise<string | null> => {
  try {
    if (!nameOrId) {
      const defaultConnector = await inference.getDefaultConnector(request);
      return defaultConnector?.connectorId ?? null;
    }

    const allConnectors = await inference.getConnectorList(request);
    const connector = allConnectors.find(
      (c) => c.name === nameOrId || c.connectorId === nameOrId
    );

    return connector?.connectorId ?? null;
  } catch {
    return null;
  }
};
