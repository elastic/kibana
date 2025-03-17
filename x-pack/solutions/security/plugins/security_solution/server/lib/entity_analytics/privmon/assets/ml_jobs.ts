/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlJob } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  getLoginAnomaliesIndex,
  getPrivmonLoginsIndex,
  getUnusualLoginUserIpsJobName,
} from '../../../../../common/entity_analytics/privmon';

const getJobs = (namespace: string): Array<{ job: MlJob; source: string }> => [
  {
    source: getPrivmonLoginsIndex(namespace),
    job: {
      job_id: getUnusualLoginUserIpsJobName(namespace),
      description:
        'Security: Authentication - Detects unusually high number of login attempts from different IPs for a user.',
      groups: ['security', 'authentication'],
      analysis_config: {
        bucket_span: '2m', // this is artificially low to make the rule fire quickly
        detectors: [
          {
            detector_description: 'Detects high number of authentication attempts for a user.',
            function: 'high_distinct_count',
            field_name: 'source.ip',
            over_field_name: 'user.id',
            detector_index: 0,
          },
          {
            detector_description: 'Detects high number of authentication attempts for a user ID.',
            function: 'high_distinct_count',
            field_name: 'source.ip',
            over_field_name: 'user.name',
            detector_index: 1,
          },
        ],
        influencers: ['user.name', 'user.id', 'source.ip'],
        model_prune_window: '30d',
      },
      allow_lazy_open: true,
      analysis_limits: {
        model_memory_limit: '256mb',
      },
      data_description: {
        time_field: '@timestamp',
      },
      custom_settings: {
        created_by: 'security-entity-analytics',
        security_app_display_name: 'Unusual Login Activity Per User',
        managed: true,
        job_revision: 1,
      },
      model_snapshot_retention_days: 30,
      results_index_name: getLoginAnomaliesIndex(namespace),
    },
  },
];

const mlJobExists = async (esClient: ElasticsearchClient, id: string) => {
  try {
    await esClient.ml.getJobs({ job_id: id });
    return true;
  } catch (e) {
    if (e.statusCode === 404) {
      return false;
    }
    throw e;
  }
};

const createMlJob = async (opts: { esClient: ElasticsearchClient; job: MlJob; logger: Logger }) => {
  const { esClient, job, logger } = opts;
  const jobId = job.job_id;
  const jobExists = await mlJobExists(esClient, jobId);
  if (jobExists) {
    logger.debug(`Job ${jobId} already exists`);
    return;
  }
  await esClient.ml.putJob({ job_id: jobId, body: job });
  logger.debug(`Job ${jobId} created`);
};

const openMlJob = async (opts: { esClient: ElasticsearchClient; job: MlJob; logger: Logger }) => {
  const { esClient, job, logger } = opts;
  const jobId = job.job_id;
  await esClient.ml.openJob({ job_id: jobId });
  logger.debug(`Job ${jobId} started`);
};

const createAndStartDatafeed = async (opts: {
  source: string;
  job: MlJob;
  logger: Logger;
  esClient: ElasticsearchClient;
}) => {
  const { source, job, logger, esClient } = opts;
  const jobId = job.job_id;
  const datafeedId = `${jobId}-datafeed`;
  const datafeedExists = await mlJobExists(esClient, datafeedId);
  if (datafeedExists) {
    logger.debug(`Datafeed ${datafeedId} already exists`);
    return;
  }
  await esClient.ml.putDatafeed({
    datafeed_id: datafeedId,
    job_id: jobId,
    query: { match_all: {} },
    indices: source,
  });

  logger.debug(`Datafeed ${datafeedId} created`);
  await esClient.ml.startDatafeed({ datafeed_id: datafeedId });
  logger.debug(`Datafeed ${datafeedId} started`);
};

export const createAndStartPrivmonMlJobs = async (opts: {
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
}) => {
  const { esClient, logger, namespace } = opts;
  for (const { job, source } of getJobs(namespace)) {
    await createMlJob({ esClient, job, logger });
    await openMlJob({ esClient, job, logger });
    await createAndStartDatafeed({ source, job, logger, esClient });
  }

  // HACK wait for the jobs to start so the rule doesnt error
  await new Promise((resolve) => setTimeout(resolve, 5000));
};
