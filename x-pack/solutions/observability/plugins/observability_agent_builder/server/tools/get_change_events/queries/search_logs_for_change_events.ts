/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { getTypedSearch } from '../../../utils/get_typed_search';
import {
  timeRangeFilter,
  kqlFilter as buildKqlFilter,
  termFilter,
} from '../../../utils/dsl_filters';
import type { ChangeType } from '../constants';
import { environmentFilter } from '../query_builders';

const MAX_LOG_EVENTS = 15;

/**
 * Search logs indices for change events using ECS, K8s events, and unstructured patterns.
 */
export async function searchLogsForChangeEvents({
  esClient,
  logsIndices,
  parsedTimeRange,
  serviceName,
  environment,
  changeTypes,
  kqlFilter,
  changeEventFields,
}: {
  esClient: IScopedClusterClient;
  logsIndices: string[];
  parsedTimeRange: { start: number; end: number };
  serviceName?: string;
  environment?: string;
  changeTypes: ChangeType[];
  kqlFilter?: string;
  changeEventFields: string[];
}): Promise<Array<Record<string, unknown>>> {
  const search = getTypedSearch(esClient.asCurrentUser);

  const mustFilter: QueryDslQueryContainer[] = [
    ...timeRangeFilter('@timestamp', parsedTimeRange),
    ...buildKqlFilter(kqlFilter),
    ...termFilter('service.name', serviceName),
    ...environmentFilter(environment),
  ];

  const shouldFilter = buildChangeTypeFilters(changeTypes);

  if (shouldFilter.length > 0) {
    mustFilter.push({ bool: { minimum_should_match: 1, should: shouldFilter } });
  }

  const response = await search({
    track_total_hits: false,
    index: logsIndices,
    size: MAX_LOG_EVENTS,
    _source: changeEventFields,
    sort: [{ '@timestamp': 'desc' }],
    query: {
      bool: { filter: mustFilter },
    },
  });

  return response.hits.hits.map((hit) => hit._source as Record<string, unknown>);
}

/**
 * Builds Elasticsearch query filters for each change type.
 * Supports ECS, OTel Semantic Conventions, K8s events, and unstructured log patterns.
 */
function buildChangeTypeFilters(changeTypes: ChangeType[]): QueryDslQueryContainer[] {
  const filters: QueryDslQueryContainer[] = [];

  if (changeTypes.includes('deployment')) {
    filters.push(
      // ECS standard
      { term: { 'event.category': 'deployment' } },
      // K8s controller-level events (avoids pod churn noise)
      // Focus on Deployment controller events, not individual Pod lifecycle
      {
        bool: {
          filter: [
            { term: { 'k8s.object.kind': 'Deployment' } },
            {
              terms: {
                'k8s.event.reason': [
                  'ScalingReplicaSet', // Deployment rollout step (scaling up/down)
                  'ReplicaSetUpdated', // Config applied - captures exact moment new version is set
                  'NewReplicaSetAvailable', // Rollout complete
                  'RolloutCompleted', // Argo Rollouts
                  'DeploymentRollback',
                ],
              },
            },
          ],
        },
      },
      // ReplicaSet events for rollout tracking
      {
        bool: {
          filter: [
            { term: { 'k8s.object.kind': 'ReplicaSet' } },
            { terms: { 'k8s.event.reason': ['SuccessfulCreate', 'SuccessfulDelete'] } },
          ],
        },
      },
      // Generic fallback for unstructured logs
      { match_phrase: { message: 'deployment successful' } },
      { match_phrase: { message: 'deployed version' } },
      { match_phrase: { message: 'rollout complete' } },
      // OTel event name
      { match: { 'event.name': 'deployment' } }
    );
  }

  if (changeTypes.includes('configuration')) {
    filters.push(
      // ECS standard
      { term: { 'event.category': 'configuration' } },
      // Common OTel / K8s ConfigMap updates
      { term: { 'k8s.event.reason': 'Sync' } },
      // Fallback for unstructured logs
      { match_phrase: { message: 'config change' } },
      { match_phrase: { message: 'configuration update' } }
    );
  }

  if (changeTypes.includes('feature_flag')) {
    filters.push(
      // OTel Semantic Convention: Event Name
      { term: { 'event.name': 'feature_flag.evaluation' } },
      // OTel Semantic Convention: Attribute existence
      { exists: { field: 'feature_flag.key' } },
      // ECS fallback patterns for users who haven't fully adopted OTel
      { exists: { field: 'labels.feature_flag_key' } },
      { term: { 'event.action': 'flag_evaluation' } },
      // Fallback for unstructured logs
      { match_phrase: { message: 'feature flag' } }
    );
  }

  if (changeTypes.includes('scaling')) {
    filters.push(
      { term: { 'k8s.event.reason': 'ScalingReplicaSet' } },
      { term: { 'k8s.event.reason': 'HorizontalPodAutoscaler' } },
      // ECS
      { match: { 'event.action': 'scaling' } },
      // Possible OTel Event Name (non-standard but common pattern)
      { match: { 'event.name': 'scaling' } }
    );
  }

  return filters;
}
