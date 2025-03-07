/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';
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
  DefendInsightGenerationInterval,
  DefendInsights,
  DefendInsightsPostRequestBody,
  DefendInsightsResponse,
  Replacements,
} from '@kbn/elastic-assistant-common';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import moment, { Moment } from 'moment';
import { ActionsClientLlm } from '@kbn/langchain/server';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { PublicMethodsOf } from '@kbn/utility-types';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  DEFEND_INSIGHTS_ID,
  DefendInsightStatus,
  DefendInsightType,
  DefendInsightsGetRequestQuery,
} from '@kbn/elastic-assistant-common';

import type { GraphState } from '../../lib/defend_insights/graphs/default_defend_insights_graph/types';
import type { GetRegisteredTools } from '../../services/app_context';
import type { AssistantTool, ElasticAssistantApiRequestHandlerContext } from '../../types';
import { DefendInsightsDataClient } from '../../lib/defend_insights/persistence';
import {
  DEFEND_INSIGHT_ERROR_EVENT,
  DEFEND_INSIGHT_SUCCESS_EVENT,
} from '../../lib/telemetry/event_based_telemetry';
import { getDefaultDefendInsightsGraph } from '../../lib/defend_insights/graphs/default_defend_insights_graph';
import { DEFEND_INSIGHTS_GRAPH_RUN_NAME } from '../../lib/defend_insights/graphs/default_defend_insights_graph/constants';
import { DEFAULT_PLUGIN_NAME, getPluginNameFromRequest } from '../helpers';
import { getLlmType } from '../utils';
import { MAX_GENERATION_ATTEMPTS, MAX_HALLUCINATION_FAILURES } from './translations';

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
  return assistantTools.find((tool) => tool.id === DEFEND_INSIGHTS_ID);
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
  anonymizedEvents,
  apiConfig,
  defendInsightId,
  insights,
  authenticatedUser,
  dataClient,
  latestReplacements,
  logger,
  startTime,
  telemetry,
}: {
  anonymizedEvents: Document[];
  apiConfig: ApiConfig;
  defendInsightId: string;
  insights: DefendInsights | null;
  authenticatedUser: AuthenticatedUser;
  dataClient: DefendInsightsDataClient;
  latestReplacements: Replacements;
  logger: Logger;
  startTime: Moment;
  telemetry: AnalyticsServiceSetup;
}) {
  try {
    const currentInsight = await dataClient.getDefendInsight({
      id: defendInsightId,
      authenticatedUser,
    });
    if (currentInsight === null || currentInsight?.status === DefendInsightStatus.Enum.canceled) {
      return;
    }
    const endTime = moment();
    const durationMs = endTime.diff(startTime);
    const eventsContextCount = anonymizedEvents.length;
    const updateProps = {
      eventsContextCount,
      insights: insights ?? undefined,
      status: DefendInsightStatus.Enum.succeeded,
      ...(!eventsContextCount || !insights
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
      insightsGenerated: updateProps.insights?.length ?? 0,
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

export const invokeDefendInsightsGraph = async ({
  insightType,
  endpointIds,
  actionsClient,
  anonymizationFields,
  apiConfig,
  connectorTimeout,
  esClient,
  langSmithProject,
  langSmithApiKey,
  latestReplacements,
  logger,
  onNewReplacements,
  size,
  start,
  end,
}: {
  insightType: DefendInsightType;
  endpointIds: string[];
  actionsClient: PublicMethodsOf<ActionsClient>;
  anonymizationFields: AnonymizationFieldResponse[];
  apiConfig: ApiConfig;
  connectorTimeout: number;
  esClient: ElasticsearchClient;
  langSmithProject?: string;
  langSmithApiKey?: string;
  latestReplacements: Replacements;
  logger: Logger;
  onNewReplacements: (newReplacements: Replacements) => void;
  size?: number;
  start?: string;
  end?: string;
}): Promise<{
  anonymizedEvents: Document[];
  insights: DefendInsights | null;
}> => {
  const llmType = getLlmType(apiConfig.actionTypeId);
  const model = apiConfig.model;
  const tags = [DEFEND_INSIGHTS_ID, llmType, model].flatMap((tag) => tag ?? []);

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
    llmType,
    logger,
    temperature: 0,
    timeout: connectorTimeout,
    traceOptions,
  });

  if (llm == null) {
    throw new Error('LLM is required for Defend insights');
  }

  const graph = getDefaultDefendInsightsGraph({
    insightType,
    endpointIds,
    anonymizationFields,
    esClient,
    llm,
    logger,
    onNewReplacements,
    replacements: latestReplacements,
    size,
    start,
    end,
  });

  logger?.debug(() => 'invokeDefendInsightsGraph: invoking the Defend insights graph');

  const result: GraphState = (await graph.invoke(
    {},
    {
      callbacks: [...(traceOptions?.tracers ?? [])],
      runName: DEFEND_INSIGHTS_GRAPH_RUN_NAME,
      tags,
    }
  )) as GraphState;
  const {
    insights,
    anonymizedEvents,
    errors,
    generationAttempts,
    hallucinationFailures,
    maxGenerationAttempts,
    maxHallucinationFailures,
  } = result;

  throwIfErrorCountsExceeded({
    errors,
    generationAttempts,
    hallucinationFailures,
    logger,
    maxGenerationAttempts,
    maxHallucinationFailures,
  });

  return { anonymizedEvents, insights };
};

export const handleGraphError = async ({
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
}) => {
  try {
    logger.error(err);
    const error = transformError(err);
    const currentInsight = await dataClient.getDefendInsight({
      id: defendInsightId,
      authenticatedUser,
    });

    if (currentInsight === null || currentInsight?.status === 'canceled') {
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
};

export const throwIfErrorCountsExceeded = ({
  errors,
  generationAttempts,
  hallucinationFailures,
  logger,
  maxGenerationAttempts,
  maxHallucinationFailures,
}: {
  errors: string[];
  generationAttempts: number;
  hallucinationFailures: number;
  logger?: Logger;
  maxGenerationAttempts: number;
  maxHallucinationFailures: number;
}): void => {
  if (hallucinationFailures >= maxHallucinationFailures) {
    const hallucinationFailuresError = `${MAX_HALLUCINATION_FAILURES(
      hallucinationFailures
    )}\n${errors.join(',\n')}`;

    logger?.error(hallucinationFailuresError);
    throw new Error(hallucinationFailuresError);
  }

  if (generationAttempts >= maxGenerationAttempts) {
    const generationAttemptsError = `${MAX_GENERATION_ATTEMPTS(generationAttempts)}\n${errors.join(
      ',\n'
    )}`;

    logger?.error(generationAttemptsError);
    throw new Error(generationAttemptsError);
  }
};
