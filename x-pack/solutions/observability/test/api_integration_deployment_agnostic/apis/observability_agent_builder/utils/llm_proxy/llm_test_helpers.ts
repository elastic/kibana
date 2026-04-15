/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/llm_proxy';
import { createLlmProxy } from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/llm_proxy';
import { OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID } from '@kbn/observability-agent-builder-plugin/common/constants';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
  configureInferenceSettings,
  clearInferenceSettings,
} from './action_connectors';

export interface LlmTestContext {
  llmProxy: LlmProxy;
  connectorId: string;
}

/**
 * Sets up an LLM proxy, action connector, and configures inference settings
 * so that the connector is resolved via getForFeature for AI insights.
 */
export async function setupLlmProxy(
  getService: DeploymentAgnosticFtrProviderContext['getService']
): Promise<LlmTestContext> {
  const log = getService('log');
  const llmProxy = await createLlmProxy(log);
  const connectorId = await createLlmProxyActionConnector(getService, {
    port: llmProxy.getPort(),
  });
  await configureInferenceSettings(getService, {
    featureId: OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID,
    connectorId,
  });
  return { llmProxy, connectorId };
}

/**
 * Tears down the LLM proxy, action connector, and clears inference settings.
 */
export async function teardownLlmProxy(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  context: Partial<LlmTestContext>
): Promise<void> {
  await clearInferenceSettings(getService);
  if (context.connectorId) {
    await deleteActionConnector(getService, { actionId: context.connectorId });
  }
  if (context.llmProxy) {
    context.llmProxy.close();
  }
}

export interface LlmMessage {
  role: string;
  content: string;
}

/**
 * Extracts system and user messages from intercepted LLM requests.
 */
export function getLlmMessages(
  llmProxy: LlmProxy,
  interceptorName: string
): { system: LlmMessage; user: LlmMessage } {
  const llmRequest = llmProxy.interceptedRequests.find(
    (r) => r.matchingInterceptorName === interceptorName
  );
  if (!llmRequest) {
    throw new Error(`No LLM request found for interceptor: ${interceptorName}`);
  }

  const messages = llmRequest.requestBody?.messages as LlmMessage[] | undefined;
  if (!messages) {
    throw new Error(`No messages found in LLM request for interceptor: ${interceptorName}`);
  }

  const system = messages.find((m) => m.role === 'system');
  const user = messages.find((m) => m.role === 'user');

  if (!system) {
    throw new Error(`No system message found for interceptor: ${interceptorName}`);
  }
  if (!user) {
    throw new Error(`No user message found for interceptor: ${interceptorName}`);
  }

  return { system, user };
}
