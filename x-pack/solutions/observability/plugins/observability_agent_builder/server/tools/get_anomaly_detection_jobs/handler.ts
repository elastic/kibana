/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type Ml from '@elastic/elasticsearch/lib/api/api/ml';
import type { MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';

type MlSystem = ReturnType<MlPluginSetup['mlSystemProvider']>;

export async function getToolHandler({
  core,
  plugins,
  mlClient,
  request,
  logger,
  jobIds = [],
  jobsLimit,
  rangeStart,
  rangeEnd,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  mlClient: Ml;
  request: KibanaRequest;
  logger: Logger;
  jobIds?: string[];
  jobsLimit: number;
  rangeStart: string;
  rangeEnd: string;
}) {
  const [coreStart] = await core.getStartServices();
  const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
  const mlSystem = plugins.ml?.mlSystemProvider(request, savedObjectsClient);

  if (!mlSystem) {
    throw new Error('Machine Learning plugin is unavailable.');
  }

  const { jobs = [] } = await mlClient.getJobs({ job_id: jobIds.join(',') }).catch((error) => {
    if (error.statusCode === 404) {
      return { jobs: [] };
    }
    logger.error(`Error retrieving ML jobs: ${error.message}`);
    throw error;
  });

  // Get job stats for state information
  const { jobs: jobsStats = [] } = await mlClient
    .getJobStats({ job_id: jobIds.join(',') })
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
      const topAnomalies = await getTopAnomalyRecords({
        mlSystem,
        jobId: job.job_id,
        start: rangeStart,
        end: rangeEnd,
      });

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
  start,
  end,
}: {
  mlSystem: MlSystem;
  jobId: string;
  start: string;
  end: string;
}) {
  const response = await mlSystem.mlAnomalySearch<MlAnomalyRecordDoc>(
    {
      track_total_hits: false,
      size: 100,
      sort: [{ record_score: { order: 'desc' as const } }],
      query: {
        bool: {
          filter: [
            { term: { job_id: jobId } },
            { term: { result_type: 'record' } },
            { term: { is_interim: false } },
            {
              range: {
                timestamp: { gte: start, lte: end },
              },
            },
          ],
        },
      },
      _source: [
        'timestamp',
        'record_score',
        'by_field_name',
        'by_field_value',
        'partition_field_name',
        'partition_field_value',
        'field_name',
        'anomaly_score_explanation',
        'typical',
        'actual',
      ],
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
    anomalyScoreExplanation: record.anomaly_score_explanation,
    typicalValue: record.typical,
    actualValue: record.actual,
  }));
}
