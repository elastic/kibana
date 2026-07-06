/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type Ml from '@elastic/elasticsearch/lib/api/api/ml';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { kqlToInfluencerQuery } from './kql_to_influencer_query';

type MlSystem = ReturnType<MlPluginSetup['mlSystemProvider']>;

export async function getToolHandler({
  core,
  plugins,
  mlClient,
  request,
  logger,
  group,
  jobIds = [],
  jobsLimit,
  anomalyRecordsLimit,
  minAnomalyScore,
  includeExplanation,
  influencerFilter,
  rangeStart,
  rangeEnd,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  mlClient: Ml;
  request: KibanaRequest;
  logger: Logger;
  group?: string;
  jobIds?: string[];
  jobsLimit: number;
  anomalyRecordsLimit: number;
  minAnomalyScore: number;
  includeExplanation: boolean;
  influencerFilter?: string;
  rangeStart: string;
  rangeEnd: string;
}) {
  const [coreStart] = await core.getStartServices();
  const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
  const mlSystem = plugins.ml?.mlSystemProvider(request, savedObjectsClient);

  if (!mlSystem) {
    throw new Error('Machine Learning plugin is unavailable.');
  }

  // The ML getJobs API job_id parameter accepts: job identifiers, group names,
  // comma-separated lists, or wildcard expressions. When a group name is passed,
  // it automatically expands to all jobs belonging to that group.
  // See: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-jobs
  const jobIdParam = [group, ...jobIds].filter(Boolean).join(',');

  const { jobs = [] } = await mlClient.getJobs({ job_id: jobIdParam }).catch((error) => {
    if (error.statusCode === 404) {
      return { jobs: [] };
    }
    logger.error(`Error retrieving ML jobs: ${error.message}`);
    throw error;
  });

  // Get job stats for state information
  const { jobs: jobsStats = [] } = await mlClient
    .getJobStats({ job_id: jobIdParam })
    .catch((error) => {
      if (error.statusCode === 404) {
        return { jobs: [] };
      }
      logger.error(`Error retrieving ML job stats: ${error.message}`);
      return { jobs: [] };
    });

  const jobsStatsMap = new Map(jobsStats.map((stat) => [stat.job_id, stat]));

  return Promise.all(
    jobs.slice(0, jobsLimit).map(async (job) => {
      const topAnomalies =
        anomalyRecordsLimit > 0
          ? await getTopAnomalyRecords({
              mlSystem,
              jobId: job.job_id,
              anomalyRecordsLimit,
              minAnomalyScore,
              includeExplanation,
              influencerFilter,
              start: rangeStart,
              end: rangeEnd,
            })
          : [];

      const jobStats = jobsStatsMap.get(job.job_id);

      return {
        jobId: job.job_id,
        description: job.description,
        bucketSpan: job.analysis_config?.bucket_span,
        datafeedIndices: job.datafeed_config?.indices,
        detectors: job.analysis_config?.detectors?.map((detector) => ({
          description: detector.detector_description,
          function: detector.function,
          fieldName: detector.field_name,
        })),
        topAnomalies,
        jobStats: {
          state: jobStats?.state,
          lastRecordTimestamp: jobStats?.data_counts?.latest_record_timestamp,
          processedRecordCount: jobStats?.data_counts?.processed_record_count,
        },
      };
    })
  );
}

async function getTopAnomalyRecords({
  mlSystem,
  jobId,
  anomalyRecordsLimit,
  minAnomalyScore,
  includeExplanation,
  influencerFilter,
  start,
  end,
}: {
  mlSystem: MlSystem;
  jobId: string;
  anomalyRecordsLimit: number;
  minAnomalyScore: number;
  includeExplanation: boolean;
  influencerFilter?: string;
  start: string;
  end: string;
}) {
  const sourceFields = [
    'timestamp',
    'record_score',
    'by_field_name',
    'by_field_value',
    'partition_field_name',
    'partition_field_value',
    'field_name',
    'typical',
    'actual',
    'influencers',
    ...(includeExplanation ? ['anomaly_score_explanation'] : []),
  ];

  const filters: QueryDslQueryContainer[] = [
    { term: { job_id: jobId } },
    { term: { result_type: 'record' } },
    { term: { is_interim: false } },
    { range: { timestamp: { gte: start, lte: end } } },
    { range: { record_score: { gte: minAnomalyScore } } },
  ];

  const influencerQuery = kqlToInfluencerQuery(influencerFilter);
  if (influencerQuery) {
    filters.push(influencerQuery);
  }

  const response = await mlSystem.mlAnomalySearch<MlAnomalyRecordDoc>(
    {
      track_total_hits: false,
      size: anomalyRecordsLimit,
      sort: [{ record_score: { order: 'desc' as const } }],
      query: {
        bool: {
          filter: filters,
        },
      },
      _source: sourceFields,
    },
    [jobId]
  );

  const records = response.hits.hits
    .map((hit) => hit._source)
    .filter((record): record is MlAnomalyRecordDoc => record !== undefined);

  return records.map((record) => ({
    timestamp: record.timestamp,
    anomalyScore: record.record_score,
    byFieldName: record.by_field_name,
    byFieldValue: record.by_field_value,
    partitionFieldName: record.partition_field_name,
    partitionFieldValue: record.partition_field_value,
    fieldName: record.field_name,
    typicalValue: record.typical,
    actualValue: record.actual,
    influencers: record.influencers?.map((inf) => ({
      fieldName: inf.influencer_field_name,
      fieldValues: inf.influencer_field_values,
    })),
    ...(includeExplanation && { anomalyScoreExplanation: record.anomaly_score_explanation }),
  }));
}
