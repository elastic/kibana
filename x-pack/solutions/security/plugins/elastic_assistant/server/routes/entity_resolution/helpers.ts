/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  ApiConfig,
  EntityResolutionPostRequestBody,
  newContentReferencesStore,
} from '@kbn/elastic-assistant-common';
import { ActionsClientLlm } from '@kbn/langchain/server';

import type { ActionsClient } from '@kbn/actions-plugin/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { getLlmType } from '../utils';
import type { GetRegisteredTools } from '../../services/app_context';
import { AssistantToolParams } from '../../types';
export const getAssistantToolParams = ({
  promptTemplate,
  actionsClient,
  entitiesIndexPattern,
  apiConfig,
  esClient,
  connectorTimeout,
  langChainTimeout,
  langSmithProject,
  langSmithApiKey,
  logger,
  request,
  size,
}: {
  promptTemplate?: string;
  actionsClient: PublicMethodsOf<ActionsClient>;
  entitiesIndexPattern: string;
  apiConfig: ApiConfig;
  esClient: ElasticsearchClient;
  connectorTimeout: number;
  langChainTimeout: number;
  langSmithProject?: string;
  langSmithApiKey?: string;
  logger: Logger;
  request: KibanaRequest<unknown, unknown, EntityResolutionPostRequestBody>;
  size: number;
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
    isEnabledKnowledgeBase: false, // not required
    esClient,
    langChainTimeout,
    llm,
    logger,
    request,
    size,
    contentReferencesStore,
  };
};

export const getAssistantTool = (getRegisteredTools: GetRegisteredTools, pluginName: string) => {
  // get the entity resolution tool:
  const assistantTools = getRegisteredTools(pluginName);
  return assistantTools.find((tool) => tool.id === 'entity-resolution');
};
