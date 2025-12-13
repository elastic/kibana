/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import { ML_GROUP_ID } from '@kbn/security-solution-plugin/common/constants';
import { isJobStarted } from '@kbn/security-solution-plugin/common/machine_learning/helpers';
import { rootRequest } from '../tasks/api_calls/common';

/**
 *
 * Calls the internal ML Module API to set up a module, which installs the jobs
 * contained in that module.
 * @param moduleName the name of the ML module to set up
 * @returns the response from the setup module request
 */
export const executeSetupModuleRequest = ({ moduleName }: { moduleName: string }) =>
  rootRequest<{ jobs: Array<{ success: boolean; error?: { status: number } }> }>({
    headers: {
      'elastic-api-version': 1,
    },
    method: 'POST',
    url: `/internal/ml/modules/setup/${moduleName}`,
    failOnStatusCode: true,
    body: {
      prefix: '',
      groups: [ML_GROUP_ID],
      indexPatternName: 'auditbeat-*',
      startDatafeed: false,
      useDedicatedIndex: true,
      applyToAllSpaces: true,
    },
  });

/**
 *
 * Calls {@link executeSetupModuleRequest} until all jobs in the module are
 * successfully set up.
 * @param moduleName the name of the ML module to set up
 * @returns the response from the setup module request
 */
export const setupMlModulesWithRetry = ({ moduleName }: { moduleName: string }) =>
  recurse(
    () => executeSetupModuleRequest({ moduleName }),
    (response) =>
      response.body.jobs.every(
        (job) => job.success || (job.error?.status && job.error.status < 500)
      ),
    { delay: 1000 }
  );

/**
 *
 * Calls the internal ML Jobs API to force start the datafeeds for the given job IDs. Necessary to get them in the "started" state for the purposes of the detection engine
 * @param jobIds the job IDs for which to force start datafeeds
 * @returns the response from the force start datafeeds request
 */
export const forceStartDatafeeds = ({ jobIds }: { jobIds: string[] }) =>
  rootRequest({
    headers: {
      'elastic-api-version': 1,
    },
    method: 'POST',
    url: '/internal/ml/jobs/force_start_datafeeds',
    failOnStatusCode: true,
    body: {
      datafeedIds: jobIds.map((jobId) => `datafeed-${jobId}`),
      start: new Date().getUTCMilliseconds(),
    },
  });

/**
 * Calls the internal ML Jobs API to stop the datafeeds for the given job IDs.
 * @param jobIds the job IDs for which to stop datafeeds
 * @returns the response from the stop datafeeds request
 */
export const stopDatafeeds = ({ jobIds }: { jobIds: string[] }) =>
  rootRequest({
    headers: {
      'elastic-api-version': 1,
    },
    method: 'POST',
    url: '/internal/ml/jobs/stop_datafeeds',
    failOnStatusCode: true,
    body: {
      datafeedIds: jobIds.map((jobId) => `datafeed-${jobId}`),
    },
  });

/**
 * Calls the internal ML Jobs API to force stop the datafeed of, and force close
 * the job with the given ID.
 *
 * @param jobId the ID of the ML job to stop and close
 * @returns the response from the force stop and close job request
 */
export const forceStopAndCloseJob = ({ jobId }: { jobId: string }) =>
  rootRequest({
    headers: {
      'elastic-api-version': 1,
    },
    method: 'POST',
    url: '/internal/ml/jobs/force_stop_and_close_job',
    failOnStatusCode: false,
    body: {
      jobId,
    },
  });

/**
 * Fetches the job summary for the given job IDs
 * @param jobIds the job IDs to fetch summaries for
 * @returns the job summaries
 */
const getJobsSummary = ({ jobIds }: { jobIds: string[] }) =>
  rootRequest<Array<{ id: string; jobState: string; datafeedState: string }>>({
    headers: {
      'elastic-api-version': 1,
    },
    method: 'POST',
    url: '/internal/ml/jobs/jobs_summary',
    failOnStatusCode: true,
    body: JSON.stringify({ jobIds }),
  });

/**
 * Waits for the specified ML jobs to be started (job opened and datafeed started).
 * This is necessary because forceStartDatafeeds returns immediately but jobs may take
 * time to actually start. The UI caches job status for 5 minutes, so we need to ensure
 * jobs are started before the UI loads to avoid stale cache issues.
 *
 * @param jobIds the job IDs to wait for
 * @param timeout maximum time to wait in milliseconds (default: 120000 = 2 minutes)
 * @returns a promise that resolves when all jobs are started
 */
export const waitForJobsToBeStarted = ({
  jobIds,
  timeout = 360000,
}: {
  jobIds: string[];
  timeout?: number;
}) => {
  const startTime = Date.now();
  const checkInterval = 2000; // Check every 2 seconds

  return recurse(
    () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeout) {
        throw new Error(
          `Timeout waiting for jobs to start: ${jobIds.join(', ')}. Elapsed: ${elapsed}ms`
        );
      }
      return getJobsSummary({ jobIds });
    },
    (response) => {
      const jobs = response.body;
      const allJobsStarted = jobIds.every((jobId) => {
        const job = jobs.find((j) => j.id === jobId);
        if (!job) {
          return false;
        }
        return isJobStarted(job.jobState, job.datafeedState);
      });
      return allJobsStarted;
    },
    {
      delay: checkInterval,
      limit: Math.ceil(timeout / checkInterval),
    }
  );
};
