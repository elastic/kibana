/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  AggregationsMultiBucketAggregateBase as Aggregation,
  QueryDslQueryContainer,
  SearchRequest,
  AggregationsTopHitsAggregate,
  SearchHit,
  OpenPointInTimeResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { CspFinding } from '@kbn/cloud-security-posture-common';
import type { Cluster } from '../../../common/types_old';
import { getPostureStatsFromAggs, failedFindingsAggQuery } from './get_grouped_findings_evaluation';
import type { FailedFindingsQueryResult } from './get_grouped_findings_evaluation';
import { findingsEvaluationAggsQuery, getStatsFromFindingsEvaluationsAggs } from './get_stats';
import type { KeyDocCount } from './compliance_dashboard';
import { getIdentifierRuntimeMapping } from '../../../common/runtime_mappings/get_identifier_runtime_mapping';

export interface ClusterBucket extends FailedFindingsQueryResult, KeyDocCount {
  failed_findings: {
    doc_count: number;
  };
  passed_findings: {
    doc_count: number;
  };
  latestFindingTopHit: AggregationsTopHitsAggregate;
}

interface ClustersQueryResult {
  aggs_by_asset_identifier: Aggregation<ClusterBucket>;
}

export type ClusterWithoutTrend = Omit<Cluster, 'trend'>;

const MAX_CLUSTERS = 500;

export const getClustersQuery = (
  query: QueryDslQueryContainer,
  pitId: string,
  runtimeMappings: MappingRuntimeFields
): SearchRequest => ({
  size: 0,
  // creates the `asset_identifier` and `safe_posture_type` runtime fields,
  // `safe_posture_type` is used by the `query` to filter by posture type for older findings without this field
  runtime_mappings: { ...runtimeMappings, ...getIdentifierRuntimeMapping() },
  query,
  aggs: {
    aggs_by_asset_identifier: {
      terms: {
        size: MAX_CLUSTERS,
        field: 'asset_identifier',
      },
      aggs: {
        latestFindingTopHit: {
          top_hits: {
            size: 1,
            sort: [{ '@timestamp': { order: 'desc' } }],
          },
        },
        ...failedFindingsAggQuery,
        ...findingsEvaluationAggsQuery,
      },
    },
  },
  pit: {
    id: pitId,
  },
});

export const getClustersFromAggs = (clusters: ClusterBucket[]): ClusterWithoutTrend[] =>
  clusters.map((clusterBucket) => {
    const latestFindingHit: SearchHit<CspFinding> = clusterBucket.latestFindingTopHit.hits.hits[0];
    if (!latestFindingHit._source) throw new Error('Missing findings top hits');

    const meta = {
      clusterId: clusterBucket.key,
      assetIdentifierId: clusterBucket.key,
      lastUpdate: latestFindingHit._source['@timestamp'],
      benchmark: latestFindingHit._source.rule.benchmark,
      cloud: latestFindingHit._source.cloud, // only available on CSPM findings
      cluster: latestFindingHit._source.orchestrator?.cluster, // only available on KSPM findings
    };

    // get cluster's stats
    if (!clusterBucket.failed_findings || !clusterBucket.passed_findings)
      throw new Error('missing findings evaluations per cluster bucket');
    const stats = getStatsFromFindingsEvaluationsAggs(clusterBucket);

    // get cluster's resource types aggs
    const resourcesTypesAggs = clusterBucket.aggs_by_resource_type.buckets;
    if (!Array.isArray(resourcesTypesAggs))
      throw new Error('missing aggs by resource type per cluster');
    const groupedFindingsEvaluation = getPostureStatsFromAggs(resourcesTypesAggs);

    return {
      meta,
      stats,
      groupedFindingsEvaluation,
    };
  });

export const getClusters = async (
  esClient: ElasticsearchClient,
  query: QueryDslQueryContainer,
  pit: OpenPointInTimeResponse,
  runtimeMappings: MappingRuntimeFields,
  logger: Logger
): Promise<ClusterWithoutTrend[]> => {
  try {
    const queryResult = await esClient.search<unknown, ClustersQueryResult>(
      getClustersQuery(query, pit.id, runtimeMappings)
    );

    if (queryResult.pit_id) {
      pit.id = queryResult.pit_id;
    }

    const clusters = queryResult.aggregations?.aggs_by_asset_identifier.buckets;
    if (!Array.isArray(clusters)) throw new Error('missing aggs by cluster id');

    return getClustersFromAggs(clusters);
  } catch (err) {
    logger.error(`Failed to fetch cluster stats ${err.message}`);
    logger.error(err);
    throw err;
  }
};
