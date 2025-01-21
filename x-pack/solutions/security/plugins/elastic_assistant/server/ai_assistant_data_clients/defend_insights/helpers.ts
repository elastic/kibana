/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get as _get, isArray } from 'lodash';

import type { estypes } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { AuthenticatedUser } from '@kbn/core/server';
import type {
  DefendInsightCreateProps,
  DefendInsightUpdateProps,
  DefendInsightsResponse,
  DefendInsightsGetRequestQuery,
} from '@kbn/elastic-assistant-common';

import type {
  CreateDefendInsightSchema,
  EsDefendInsightSchema,
  UpdateDefendInsightSchema,
} from './types';

export const transformESSearchToDefendInsights = (
  response: estypes.SearchResponse<EsDefendInsightSchema>
): DefendInsightsResponse[] => {
  return response.hits.hits
    .filter((hit) => hit._source !== undefined)
    .map((hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const insightSchema = hit._source!;
      const defendInsight: DefendInsightsResponse = {
        timestamp: insightSchema['@timestamp'],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: hit._id!,
        backingIndex: hit._index,
        createdAt: insightSchema.created_at,
        updatedAt: insightSchema.updated_at,
        lastViewedAt: insightSchema.last_viewed_at,
        users:
          insightSchema.users?.map((user) => ({
            id: user.id,
            name: user.name,
          })) ?? [],
        namespace: insightSchema.namespace,
        status: insightSchema.status,
        eventsContextCount: insightSchema.events_context_count,
        apiConfig: {
          connectorId: insightSchema.api_config.connector_id,
          actionTypeId: insightSchema.api_config.action_type_id,
          defaultSystemPromptId: insightSchema.api_config.default_system_prompt_id,
          model: insightSchema.api_config.model,
          provider: insightSchema.api_config.provider,
        },
        endpointIds: insightSchema.endpoint_ids,
        insightType: insightSchema.insight_type,
        insights: insightSchema.insights.map((insight) => ({
          group: insight.group,
          events: insight.events?.map((event) => ({
            id: event.id,
            endpointId: event.endpoint_id,
            value: event.value,
          })),
        })),
        replacements: insightSchema.replacements?.reduce((acc: Record<string, string>, r) => {
          acc[r.uuid] = r.value;
          return acc;
        }, {}),
        generationIntervals:
          insightSchema.generation_intervals?.map((interval) => ({
            date: interval.date,
            durationMs: interval.duration_ms,
          })) ?? [],
        averageIntervalMs: insightSchema.average_interval_ms ?? 0,
        failureReason: insightSchema.failure_reason,
      };

      return defendInsight;
    });
};

export const transformToCreateScheme = (
  createdAt: string,
  spaceId: string,
  user: AuthenticatedUser,
  {
    endpointIds,
    insightType,
    insights,
    apiConfig,
    eventsContextCount,
    replacements,
    status,
  }: DefendInsightCreateProps
): CreateDefendInsightSchema => {
  return {
    '@timestamp': createdAt,
    created_at: createdAt,
    users: [
      {
        id: user.profile_uid,
        name: user.username,
      },
    ],
    status,
    api_config: {
      action_type_id: apiConfig.actionTypeId,
      connector_id: apiConfig.connectorId,
      default_system_prompt_id: apiConfig.defaultSystemPromptId,
      model: apiConfig.model,
      provider: apiConfig.provider,
    },
    events_context_count: eventsContextCount,
    endpoint_ids: endpointIds,
    insight_type: insightType,
    insights: insights?.map((insight) => ({
      group: insight.group,
      events: insight.events?.map((event) => ({
        id: event.id,
        endpoint_id: event.endpointId,
        value: event.value,
      })),
    })),
    updated_at: createdAt,
    last_viewed_at: createdAt,
    replacements: replacements
      ? Object.keys(replacements).map((key) => ({
          uuid: key,
          value: replacements[key],
        }))
      : undefined,
    namespace: spaceId,
  };
};

export const transformToUpdateScheme = (
  updatedAt: string,
  {
    eventsContextCount,
    apiConfig,
    insights,
    failureReason,
    generationIntervals,
    id,
    replacements,
    lastViewedAt,
    status,
  }: DefendInsightUpdateProps
): UpdateDefendInsightSchema => {
  const averageIntervalMsObj =
    generationIntervals && generationIntervals.length > 0
      ? {
          average_interval_ms: Math.trunc(
            generationIntervals.reduce((acc, interval) => acc + interval.durationMs, 0) /
              generationIntervals.length
          ),
          generation_intervals: generationIntervals.map((interval) => ({
            date: interval.date,
            duration_ms: interval.durationMs,
          })),
        }
      : {};
  return {
    events_context_count: eventsContextCount,
    ...(apiConfig
      ? {
          api_config: {
            action_type_id: apiConfig.actionTypeId,
            connector_id: apiConfig.connectorId,
            default_system_prompt_id: apiConfig.defaultSystemPromptId,
            model: apiConfig.model,
            provider: apiConfig.provider,
          },
        }
      : {}),
    ...(insights
      ? {
          insights: insights.map((insight) => ({
            group: insight.group,
            events: insight.events?.map((event) => ({
              id: event.id,
              endpoint_id: event.endpointId,
              value: event.value,
            })),
          })),
        }
      : {}),
    failure_reason: failureReason,
    id,
    replacements: replacements
      ? Object.keys(replacements).map((key) => ({
          uuid: key,
          value: replacements[key],
        }))
      : undefined,
    ...(status ? { status } : {}),
    // only update updated_at time if this is not an update to last_viewed_at
    ...(lastViewedAt ? { last_viewed_at: lastViewedAt } : { updated_at: updatedAt }),
    ...averageIntervalMsObj,
  };
};

const validParams = new Set(['ids', 'endpoint_ids', 'connector_id', 'type', 'status']);
const paramKeyMap = { ids: '_id', connector_id: 'api_config.connector_id', type: 'insight_type' };
export function queryParamsToEsQuery(
  queryParams: DefendInsightsGetRequestQuery
): QueryDslQueryContainer[] {
  return Object.entries(queryParams).reduce((acc: object[], [k, v]) => {
    if (!validParams.has(k)) {
      return acc;
    }

    const filterKey = isArray(v) ? 'terms' : 'term';
    const paramKey = _get(paramKeyMap, k, k);
    const next = { [filterKey]: { [paramKey]: v } };

    return [...acc, next];
  }, []);
}
