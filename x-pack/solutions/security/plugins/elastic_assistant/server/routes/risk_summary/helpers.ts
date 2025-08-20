/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ApiConfig, RiskScoreSummaryPostRequestBody } from '@kbn/elastic-assistant-common';
import { newContentReferencesStore } from '@kbn/elastic-assistant-common';
import { ActionsClientLlm } from '@kbn/langchain/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { getLlmType } from '../utils';
import type { GetRegisteredTools } from '../../services/app_context';
import type { AssistantToolParams } from '../../types';
export const getAssistantToolParams = ({
  mostRecentAlerts,
  identifier,
  identifierKey,
  actionsClient,
  apiConfig,
  esClient,
  connectorTimeout,
  langChainTimeout,
  langSmithProject,
  langSmithApiKey,
  logger,
  request,
}: {
  mostRecentAlerts: Alert[];
  identifier: string;
  identifierKey: string;
  actionsClient: PublicMethodsOf<ActionsClient>;
  apiConfig: ApiConfig;
  esClient: ElasticsearchClient;
  connectorTimeout: number;
  langChainTimeout: number;
  langSmithProject?: string;
  langSmithApiKey?: string;
  logger: Logger;
  request: KibanaRequest<unknown, unknown, RiskScoreSummaryPostRequestBody>;
}): AssistantToolParams => {
  const traceOptions = {
    projectName: langSmithProject,
    tracers: [
      ...getLangSmithTracer({
        apiKey: langSmithApiKey,
        projectName: langSmithProject,
        logger,
      }),
    ],
  };

  const llm = new ActionsClientLlm({
    actionsClient,
    connectorId: apiConfig.connectorId,
    llmType: getLlmType(apiConfig.actionTypeId),
    logger,
    temperature: 0, // zero temperature because we want structured JSON output
    timeout: connectorTimeout,
    traceOptions,
  });

  const contentReferencesStore = newContentReferencesStore();

  return {
    mostRecentAlerts,
    identifier,
    identifierKey,
    isEnabledKnowledgeBase: false, // not required
    esClient,
    langChainTimeout,
    llm,
    logger,
    request,
    contentReferencesStore,
  };
};

export const getAssistantTool = (getRegisteredTools: GetRegisteredTools, pluginName: string) => {
  const assistantTools = getRegisteredTools(pluginName);
  return assistantTools.find((tool) => tool.id === 'risk-summary');
};
