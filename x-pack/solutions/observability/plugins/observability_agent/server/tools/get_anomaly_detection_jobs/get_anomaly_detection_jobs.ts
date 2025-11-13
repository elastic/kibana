/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type Ml from '@elastic/elasticsearch/lib/api/api/ml';
import type {
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../../types';

export const OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID =
  'observability.get_anomaly_detection_jobs';

const DEFAULT_JOBS_LIMIT = 10;
const DEFAULT_TIME_RANGE = {
  start: 'now-24h',
  end: 'now',
};

const getAnomalyDetectionJobsSchema = z.object({
  jobIds: z
    .array(z.string().min(1))
    .min(1)
    .max(20)
    .describe(
      'Optional list of ML job IDs to query. Leave empty to include all anomaly detection jobs in this space.'
    )
    .optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(25)
    .describe(`Maximum number of jobs to return. Defaults to ${DEFAULT_JOBS_LIMIT}.`)
    .optional(),
  start: z
    .string()
    .min(2)
    .max(200)
    .describe(
      `Start of the time range for anomaly records, expressed with Elastic date math (e.g. now-1h). Defaults to ${DEFAULT_TIME_RANGE.start}.`
    )
    .optional(),
  end: z
    .string()
    .min(2)
    .max(200)
    .describe(
      `End of the time range for anomaly records, expressed with Elasticsearch date math. Defaults to ${DEFAULT_TIME_RANGE.end}.`
    )
    .optional(),
});

export function createGetAnomalyDetectionJobsTool({
  core,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  logger: Logger;
}): StaticToolRegistration<typeof getAnomalyDetectionJobsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getAnomalyDetectionJobsSchema> = {
    id: OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Return anomaly detection jobs and associated anomaly records. Useful for identifying unusual patterns in observability data.',
    schema: getAnomalyDetectionJobsSchema,
    tags: ['observability', 'machine_learning', 'anomaly_detection'],
    handler: async (
      {
        jobIds,
        limit: jobsLimit = DEFAULT_JOBS_LIMIT,
        start: rangeStart = DEFAULT_TIME_RANGE.start,
        end: rangeEnd = DEFAULT_TIME_RANGE.end,
      },
      { esClient }
    ) => {
      const mlClient = esClient.asCurrentUser.ml;

      try {
        const mlJobs = await getMlJobs({ mlClient, jobIds, jobsLimit, rangeStart, rangeEnd });
        if (!mlJobs.length) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  jobs: [],
                  totalReturned: 0,
                  message: 'No anomaly detection jobs found for the provided filters.',
                },
              },
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                jobs: mlJobs,
                totalReturned: mlJobs.length,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error retrieving anomaly detection jobs: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to retrieve anomaly detection jobs: ${error.message}`,
                stack: error.stack,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}

async function getMlJobs({
  mlClient,
  jobIds = [],
  jobsLimit,
  rangeStart,
  rangeEnd,
}: {
  mlClient: Ml;
  jobIds?: string[];
  jobsLimit: number;
  rangeStart: string;
  rangeEnd: string;
}) {
  const { jobs = [] } = await mlClient.getJobs({ job_id: jobIds.join(',') });

  return Promise.all(
    jobs.slice(0, jobsLimit).map(async (job) => {
      const topAnomalies = await getTopAnomalyRecords({
        mlClient,
        jobId: job.job_id,
        start: rangeStart,
        end: rangeEnd,
      });

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
      };
    })
  );
}

async function getTopAnomalyRecords({
  mlClient,
  jobId,
  start,
  end,
}: {
  mlClient: Ml;
  jobId: string;
  start: string;
  end: string;
}) {
  const { records = [] } = await mlClient.getRecords({
    job_id: jobId,
    desc: true,
    sort: 'record_score',
    exclude_interim: true,
    page: { size: 100 },
    start,
    end,
  });

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
