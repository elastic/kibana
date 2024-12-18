/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { MlDatafeedStats, MlJob, MlPluginSetup } from '@kbn/ml-plugin/server';
import type { MlJobMetric, MlJobUsageMetric } from './types';

import { isJobStarted } from '../../../../common/machine_learning/helpers';
import { isSecurityJob } from '../../../../common/machine_learning/is_security_job';
import { getInitialMlJobUsage } from './get_initial_usage';
import { updateMlJobUsage } from './update_usage';
import { getJobCorrelations } from './transform_utils/get_job_correlations';

export interface GetMlJobMetricsOptions {
  mlClient: MlPluginSetup | undefined;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

export const getMlJobMetrics = async ({
  mlClient,
  savedObjectsClient,
  logger,
}: GetMlJobMetricsOptions): Promise<MlJobUsageMetric> => {
  let jobsUsage = getInitialMlJobUsage();

  if (mlClient == null) {
    logger.debug(
      'Machine learning client is null/undefined, therefore not collecting telemetry from it'
    );
    // early return if we don't have ml client
    return {
      ml_job_usage: getInitialMlJobUsage(),
      ml_job_metrics: [],
    };
  }

  try {
    const fakeRequest = { headers: {} } as KibanaRequest;

    const modules = await mlClient.modulesProvider(fakeRequest, savedObjectsClient).listModules();
    const moduleJobs = modules.flatMap((module) => module.jobs);
    const jobs = await mlClient.jobServiceProvider(fakeRequest, savedObjectsClient).jobsSummary();

    jobsUsage = jobs.filter(isSecurityJob).reduce((usage, job) => {
      const isElastic = moduleJobs.some((moduleJob) => moduleJob.id === job.id);
      const isEnabled = isJobStarted(job.jobState, job.datafeedState);

      return updateMlJobUsage({ isElastic, isEnabled }, usage);
    }, getInitialMlJobUsage());

    const jobsType = 'security';
    const securityJobStats = await mlClient
      .anomalyDetectorsProvider(fakeRequest, savedObjectsClient)
      .jobStats(jobsType);

    const jobDetails = await mlClient
      .anomalyDetectorsProvider(fakeRequest, savedObjectsClient)
      .jobs(jobsType);

    const jobDetailsCache = new Map<string, MlJob>();
    jobDetails.jobs.forEach((detail) => jobDetailsCache.set(detail.job_id, detail));

    const datafeedStats = await mlClient
      .anomalyDetectorsProvider(fakeRequest, savedObjectsClient)
      .datafeedStats();

    const datafeedStatsCache = new Map<string, MlDatafeedStats>();
    datafeedStats.datafeeds.forEach((datafeedStat) =>
      datafeedStatsCache.set(`${datafeedStat.datafeed_id}`, datafeedStat)
    );

    const jobMetrics = securityJobStats.jobs.map<MlJobMetric>((stat) => {
      const jobId = stat.job_id;
      const jobDetail = jobDetailsCache.get(stat.job_id);
      const datafeed = datafeedStatsCache.get(`datafeed-${jobId}`);
      return getJobCorrelations({ stat, jobDetail, datafeed });
    });

    return {
      ml_job_usage: jobsUsage,
      ml_job_metrics: jobMetrics,
    };
  } catch (e) {
    // ignore failure, usage will be zeroed. We don't log the message below as currently ML jobs when it does
    // not have a "security" job will cause a throw. If this does not normally throw eventually on normal operations
    // we should log a debug message like the following below to not unnecessarily worry users as this will not effect them:
    // logger.debug(
    //  `Encountered unexpected condition in telemetry of message: ${e.message}, object: ${e}. Telemetry for "ml_jobs" will be skipped.`
    // );
    return {
      ml_job_usage: getInitialMlJobUsage(),
      ml_job_metrics: [],
    };
  }
};
