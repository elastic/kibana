/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Moment } from 'moment';

import type {
  AnalyticsServiceSetup,
  AuthenticatedUser,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  ApiConfig,
  ContentReferencesStore,
  DefendInsight,
  DefendInsightGenerationInterval,
  DefendInsightsPostRequestBody,
  DefendInsightsResponse,
  Replacements,
} from '@kbn/elastic-assistant-common';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import { ActionsClientLlm } from '@kbn/langchain/server';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { PublicMethodsOf } from '@kbn/utility-types';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  DEFEND_INSIGHTS_TOOL_ID,
  DefendInsightStatus,
  DefendInsightType,
  DefendInsightsGetRequestQuery,
} from '@kbn/elastic-assistant-common';

import type { GetRegisteredTools } from '../../services/app_context';
import type { AssistantTool, ElasticAssistantApiRequestHandlerContext } from '../../types';

import { DefendInsightsDataClient } from '../../ai_assistant_data_clients/defend_insights';
import {
  DEFEND_INSIGHT_ERROR_EVENT,
  DEFEND_INSIGHT_SUCCESS_EVENT,
} from '../../lib/telemetry/event_based_telemetry';
import { getLlmType } from '../utils';
import { DEFAULT_PLUGIN_NAME, getPluginNameFromRequest } from '../helpers';

function getDataFromJSON(defendInsightStringified: string): {
  eventsContextCount: number;
  insights: DefendInsight[];
} {
  const { eventsContextCount, insights } = JSON.parse(defendInsightStringified);
  return { eventsContextCount, insights };
}

function addGenerationInterval(
  generationIntervals: DefendInsightGenerationInterval[],
  generationInterval: DefendInsightGenerationInterval
): DefendInsightGenerationInterval[] {
  const newGenerationIntervals = [generationInterval, ...generationIntervals];

  const MAX_GENERATION_INTERVALS = 5;
  if (newGenerationIntervals.length > MAX_GENERATION_INTERVALS) {
    return newGenerationIntervals.slice(0, MAX_GENERATION_INTERVALS); // Return the first MAX_GENERATION_INTERVALS items
  }

  return newGenerationIntervals;
}

export function isDefendInsightsEnabled({
  request,
  logger,
  assistantContext,
}: {
  request: KibanaRequest;
  logger: Logger;
  assistantContext: ElasticAssistantApiRequestHandlerContext;
}): boolean {
  const pluginName = getPluginNameFromRequest({
    request,
    logger,
    defaultPluginName: DEFAULT_PLUGIN_NAME,
  });

  return assistantContext.getRegisteredFeatures(pluginName).defendInsights;
}

export function getAssistantTool(
  getRegisteredTools: GetRegisteredTools,
  pluginName: string
): AssistantTool | undefined {
  const assistantTools = getRegisteredTools(pluginName);
  return assistantTools.find((tool) => tool.id === DEFEND_INSIGHTS_TOOL_ID);
}

export function getAssistantToolParams({
  endpointIds,
  insightType,
  actionsClient,
  anonymizationFields,
  apiConfig,
  esClient,
  connectorTimeout,
  langChainTimeout,
  langSmithProject,
  langSmithApiKey,
  logger,
  contentReferencesStore,
  latestReplacements,
  onNewReplacements,
  request,
}: {
  endpointIds: string[];
  insightType: DefendInsightType;
  actionsClient: PublicMethodsOf<ActionsClient>;
  anonymizationFields?: AnonymizationFieldResponse[];
  apiConfig: ApiConfig;
  esClient: ElasticsearchClient;
  connectorTimeout: number;
  langChainTimeout: number;
  langSmithProject?: string;
  langSmithApiKey?: string;
  logger: Logger;
  contentReferencesStore: ContentReferencesStore | undefined;
  latestReplacements: Replacements;
  onNewReplacements: (newReplacements: Replacements) => void;
  request: KibanaRequest<unknown, unknown, DefendInsightsPostRequestBody>;
}): {
  endpointIds: string[];
  insightType: DefendInsightType;
  anonymizationFields?: AnonymizationFieldResponse[];
  esClient: ElasticsearchClient;
  langChainTimeout: number;
  llm: ActionsClientLlm;
  logger: Logger;
  contentReferencesStore: ContentReferencesStore | undefined;
  replacements: Replacements;
  onNewReplacements: (newReplacements: Replacements) => void;
  request: KibanaRequest<unknown, unknown, DefendInsightsPostRequestBody>;
  modelExists: boolean;
  isEnabledKnowledgeBase: boolean;
} {
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

  return {
    endpointIds,
    insightType,
    anonymizationFields,
    esClient,
    replacements: latestReplacements,
    langChainTimeout,
    llm,
    logger,
    contentReferencesStore,
    onNewReplacements,
    request,
    modelExists: false,
    isEnabledKnowledgeBase: false,
  };
}

export async function handleToolError({
  apiConfig,
  defendInsightId,
  authenticatedUser,
  dataClient,
  err,
  latestReplacements,
  logger,
  telemetry,
}: {
  apiConfig: ApiConfig;
  defendInsightId: string;
  authenticatedUser: AuthenticatedUser;
  dataClient: DefendInsightsDataClient;
  err: Error;
  latestReplacements: Replacements;
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
}) {
  try {
    logger.error(err);
    const error = transformError(err);
    const currentInsight = await dataClient.getDefendInsight({
      id: defendInsightId,
      authenticatedUser,
    });

    if (currentInsight === null || currentInsight?.status === DefendInsightStatus.Enum.canceled) {
      return;
    }
    await dataClient.updateDefendInsight({
      defendInsightUpdateProps: {
        insights: [],
        status: DefendInsightStatus.Enum.failed,
        id: defendInsightId,
        replacements: latestReplacements,
        backingIndex: currentInsight.backingIndex,
        failureReason: error.message,
      },
      authenticatedUser,
    });
    telemetry.reportEvent(DEFEND_INSIGHT_ERROR_EVENT.eventType, {
      actionTypeId: apiConfig.actionTypeId,
      errorMessage: error.message,
      model: apiConfig.model,
      provider: apiConfig.provider,
    });
  } catch (updateErr) {
    const updateError = transformError(updateErr);
    telemetry.reportEvent(DEFEND_INSIGHT_ERROR_EVENT.eventType, {
      actionTypeId: apiConfig.actionTypeId,
      errorMessage: updateError.message,
      model: apiConfig.model,
      provider: apiConfig.provider,
    });
  }
}

export async function createDefendInsight(
  endpointIds: string[],
  insightType: DefendInsightType,
  dataClient: DefendInsightsDataClient,
  authenticatedUser: AuthenticatedUser,
  apiConfig: ApiConfig
): Promise<{
  currentInsight: DefendInsightsResponse;
  defendInsightId: string;
}> {
  const currentInsight = await dataClient?.createDefendInsight({
    defendInsightCreate: {
      endpointIds,
      insightType,
      apiConfig,
      insights: [],
      status: DefendInsightStatus.Enum.running,
    },
    authenticatedUser,
  });

  if (!currentInsight) {
    throw new Error(`failed to create Defend insight for connectorId: ${apiConfig.connectorId}`);
  }

  return {
    defendInsightId: currentInsight.id,
    currentInsight,
  };
}

export async function updateDefendInsights({
  apiConfig,
  defendInsightId,
  authenticatedUser,
  dataClient,
  latestReplacements,
  logger,
  rawDefendInsights,
  startTime,
  telemetry,
}: {
  apiConfig: ApiConfig;
  defendInsightId: string;
  authenticatedUser: AuthenticatedUser;
  dataClient: DefendInsightsDataClient;
  latestReplacements: Replacements;
  logger: Logger;
  rawDefendInsights: string | null;
  startTime: Moment;
  telemetry: AnalyticsServiceSetup;
}) {
  try {
    if (rawDefendInsights == null) {
      throw new Error('tool returned no Defend insights');
    }
    const currentInsight = await dataClient.getDefendInsight({
      id: defendInsightId,
      authenticatedUser,
    });
    if (currentInsight === null || currentInsight?.status === DefendInsightStatus.Enum.canceled) {
      return;
    }
    const endTime = moment();
    const durationMs = endTime.diff(startTime);
    const { eventsContextCount, insights } = getDataFromJSON(rawDefendInsights);
    const updateProps = {
      eventsContextCount,
      insights,
      status: DefendInsightStatus.Enum.succeeded,
      ...(!eventsContextCount || !insights.length
        ? {}
        : {
            generationIntervals: addGenerationInterval(currentInsight.generationIntervals, {
              durationMs,
              date: new Date().toISOString(),
            }),
          }),
      id: defendInsightId,
      replacements: latestReplacements,
      backingIndex: currentInsight.backingIndex,
    };

    await dataClient.updateDefendInsight({
      defendInsightUpdateProps: updateProps,
      authenticatedUser,
    });
    telemetry.reportEvent(DEFEND_INSIGHT_SUCCESS_EVENT.eventType, {
      actionTypeId: apiConfig.actionTypeId,
      eventsContextCount: updateProps.eventsContextCount,
      insightsGenerated: updateProps.insights.length,
      durationMs,
      model: apiConfig.model,
      provider: apiConfig.provider,
    });
  } catch (updateErr) {
    logger.error(updateErr);
    const updateError = transformError(updateErr);
    telemetry.reportEvent(DEFEND_INSIGHT_ERROR_EVENT.eventType, {
      actionTypeId: apiConfig.actionTypeId,
      errorMessage: updateError.message,
      model: apiConfig.model,
      provider: apiConfig.provider,
    });
  }
}

export async function updateDefendInsightsLastViewedAt({
  params,
  authenticatedUser,
  dataClient,
}: {
  params: DefendInsightsGetRequestQuery;
  authenticatedUser: AuthenticatedUser;
  dataClient: DefendInsightsDataClient;
}): Promise<DefendInsightsResponse[]> {
  const defendInsights = await dataClient.findDefendInsightsByParams({
    params,
    authenticatedUser,
  });
  if (!defendInsights.length) {
    return [];
  }

  const defendInsightsUpdateProps = defendInsights.map((insight) => {
    return {
      id: insight.id,
      lastViewedAt: new Date().toISOString(),
      backingIndex: insight.backingIndex,
    };
  });

  return dataClient.updateDefendInsights({
    defendInsightsUpdateProps,
    authenticatedUser,
  });
}

export async function updateDefendInsightLastViewedAt({
  id,
  authenticatedUser,
  dataClient,
}: {
  id: string;
  authenticatedUser: AuthenticatedUser;
  dataClient: DefendInsightsDataClient;
}): Promise<DefendInsightsResponse | undefined> {
  return (
    await updateDefendInsightsLastViewedAt({ params: { ids: [id] }, authenticatedUser, dataClient })
  )[0];
}
