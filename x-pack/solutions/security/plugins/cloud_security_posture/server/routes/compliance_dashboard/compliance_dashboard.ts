/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS } from '@kbn/cloud-security-posture-common';
import {
  getComplianceDashboardSchema,
  getComplianceDashboardQuerySchema,
} from '../../../common/schemas/stats';
import { getSafePostureTypeRuntimeMapping } from '../../../common/runtime_mappings/get_safe_posture_type_runtime_mapping';
import type {
  PosturePolicyTemplate,
  ComplianceDashboardData,
  GetComplianceDashboardRequest,
  ComplianceDashboardDataV2,
} from '../../../common/types_old';
import { STATS_ROUTE_PATH } from '../../../common/constants';
import { getGroupedFindingsEvaluation } from './get_grouped_findings_evaluation';
import type { ClusterWithoutTrend } from './get_clusters';
import { getClusters } from './get_clusters';
import { getStats } from './get_stats';
import type { CspRouter } from '../../types';
import type { TrendsDetails } from './get_trends';
import { getTrends } from './get_trends';
import type { BenchmarkWithoutTrend } from './get_benchmarks';
import { getBenchmarks } from './get_benchmarks';
import { toBenchmarkDocFieldKey } from '../../lib/mapping_field_util';
import { getMutedRulesFilterQuery } from '../benchmark_rules/get_states/v1';

export interface KeyDocCount<TKey = string> {
  key: TKey;
  doc_count: number;
}

const getClustersTrends = (clustersWithoutTrends: ClusterWithoutTrend[], trends: TrendsDetails) =>
  clustersWithoutTrends.map((cluster) => ({
    ...cluster,
    trend: trends.map(({ timestamp, clusters: clustersTrendData }) => ({
      timestamp,
      ...clustersTrendData[cluster.meta.assetIdentifierId],
    })),
  }));

const getBenchmarksTrends = (
  benchmarksWithoutTrends: BenchmarkWithoutTrend[],
  trends: TrendsDetails
) => {
  return benchmarksWithoutTrends.map((benchmark) => ({
    ...benchmark,
    trend: trends.map(({ timestamp, benchmarks: benchmarksTrendData }) => {
      const benchmarkIdVersion = toBenchmarkDocFieldKey(
        benchmark.meta.benchmarkId,
        benchmark.meta.benchmarkVersion
      );

      return {
        timestamp,
        ...benchmarksTrendData[benchmarkIdVersion],
      };
    }),
  }));
};

const getSummaryTrend = (trends: TrendsDetails) =>
  trends.map(({ timestamp, summary }) => ({ timestamp, ...summary }));

export const defineGetComplianceDashboardRoute = (router: CspRouter) =>
  router.versioned
    .get({
      access: 'internal',
      path: STATS_ROUTE_PATH,
      security: {
        authz: {
          requiredPrivileges: ['cloud-security-posture-read'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: getComplianceDashboardSchema,
          },
        },
      },
      async (context, request, response) => {
        const cspContext = await context.csp;
        const logger = cspContext.logger;

        try {
          const esClient = cspContext.esClient.asCurrentUser;

          const pit = await esClient.openPointInTime({
            index: CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS,
            keep_alive: '30s',
          });

          const params: GetComplianceDashboardRequest = request.params;
          const policyTemplate = params.policy_template as PosturePolicyTemplate;
          // runtime mappings create the `safe_posture_type` field, which equals to `kspm` or `cspm` based on the value and existence of the `posture_type` field which was introduced at 8.7
          // the `query` is then being passed to our getter functions to filter per posture type even for older findings before 8.7
          const runtimeMappings: MappingRuntimeFields = getSafePostureTypeRuntimeMapping();
          const query: QueryDslQueryContainer = {
            bool: {
              filter: [{ term: { safe_posture_type: policyTemplate } }],
            },
          };

          const stats = await getStats(esClient, query, pit, runtimeMappings, logger);
          const groupedFindingsEvaluation = await getGroupedFindingsEvaluation(
            esClient,
            query,
            pit,
            runtimeMappings,
            logger
          );
          const clustersWithoutTrends = await getClusters(
            esClient,
            query,
            pit,
            runtimeMappings,
            logger
          );
          const trends = await getTrends(esClient, policyTemplate, logger);

          // Try closing the PIT, if it fails we can safely ignore the error since it closes itself after the keep alive
          //   ends. Not waiting on the promise returned from the `closePointInTime` call to avoid delaying the request
          esClient.closePointInTime(pit).catch((err) => {
            logger.warn(`Could not close PIT for stats endpoint: ${err}`);
          });

          const clusters = getClustersTrends(clustersWithoutTrends, trends.trends);
          const trend = getSummaryTrend(trends.trends);

          const body: ComplianceDashboardData = {
            stats,
            groupedFindingsEvaluation,
            clusters,
            trend,
          };

          return response.ok({
            body,
          });
        } catch (err) {
          const error = transformError(err);
          logger.error(`Error while fetching CSP stats: ${err}`);
          logger.error(err.stack);

          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    )
    .addVersion(
      {
        version: '2',
        validate: {
          request: {
            params: getComplianceDashboardSchema,
            query: getComplianceDashboardQuerySchema,
          },
        },
      },
      async (context, request, response) => {
        const cspContext = await context.csp;
        const logger = cspContext.logger;

        try {
          const esClient = cspContext.esClient.asCurrentUser;
          const encryptedSoClient = cspContext.encryptedSavedObjects;
          const filteredRules = await getMutedRulesFilterQuery(encryptedSoClient);

          const pit = await esClient.openPointInTime({
            index: CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS,
            keep_alive: '30s',
          });

          const params: GetComplianceDashboardRequest = request.params;
          const policyTemplate = params.policy_template as PosturePolicyTemplate;
          const namespace = request.query.namespace;

          // runtime mappings create the `safe_posture_type` field, which equals to `kspm` or `cspm` based on the value and existence of the `posture_type` field which was introduced at 8.7
          // the `query` is then being passed to our getter functions to filter per posture type even for older findings before 8.7
          const runtimeMappings: MappingRuntimeFields = getSafePostureTypeRuntimeMapping();
          const filter = namespace
            ? [
                { term: { safe_posture_type: policyTemplate } },
                { term: { 'data_stream.namespace': namespace } },
              ]
            : [{ term: { safe_posture_type: policyTemplate } }];

          const query: QueryDslQueryContainer = {
            bool: {
              filter,
              must_not: filteredRules,
            },
          };

          const stats = await getStats(esClient, query, pit, runtimeMappings, logger);
          const groupedFindingsEvaluation = await getGroupedFindingsEvaluation(
            esClient,
            query,
            pit,
            runtimeMappings,
            logger
          );
          const benchmarksWithoutTrends = await getBenchmarks(
            esClient,
            query,
            pit,
            runtimeMappings,
            logger
          );
          const trendDetails = await getTrends(esClient, policyTemplate, logger, namespace);

          // Try closing the PIT, if it fails we can safely ignore the error since it closes itself after the keep alive
          //   ends. Not waiting on the promise returned from the `closePointInTime` call to avoid delaying the request
          esClient.closePointInTime(pit).catch((err) => {
            logger.warn(`Could not close PIT for stats endpoint: ${err}`);
          });

          const benchmarks = getBenchmarksTrends(benchmarksWithoutTrends, trendDetails.trends);
          const trend = getSummaryTrend(trendDetails.trends);

          const body: ComplianceDashboardDataV2 = {
            stats,
            groupedFindingsEvaluation,
            benchmarks,
            trend,
            namespaces: trendDetails.namespaces,
          };

          return response.ok({
            body,
          });
        } catch (err) {
          const error = transformError(err);
          logger.error(`Error while fetching v2 CSP stats: ${err}`);
          logger.error(err.stack);

          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
