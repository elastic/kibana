/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import { ML_GROUP_ID } from '@kbn/security-solution-plugin/common/constants';
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
 * Gets the stats for all datafeeds, including their state.
 * @returns the response from the get datafeed stats request
 */
const getDatafeedStats = () =>
  rootRequest<{ datafeeds: Array<{ datafeed_id: string; state: string }> }>({
    headers: {
      'elastic-api-version': 1,
    },
    method: 'GET',
    url: '/internal/ml/datafeeds/_stats',
    failOnStatusCode: true,
  });

/**
 * Verifies that all specified datafeeds are in the "started" state.
 * Uses recurse to retry until all datafeeds are started or timeout is reached.
 * @param jobIds the job IDs for which to verify datafeeds are started
 * @returns the response from the get datafeed stats request
 */
export const waitForAllDatafeedsToStart = ({ jobIds }: { jobIds: string[] }) => {
  const expectedDatafeedIds = jobIds.map((jobId) => `datafeed-${jobId}`);
  return recurse(
    () => getDatafeedStats(),
    (response) => {
      const datafeedStates = new Map(
        response.body.datafeeds.map((df) => [df.datafeed_id, df.state])
      );
      const allStarted = expectedDatafeedIds.every(
        (datafeedId) => datafeedStates.get(datafeedId) === 'started'
      );
      if (!allStarted) {
        const notStarted = expectedDatafeedIds.filter(
          (datafeedId) => datafeedStates.get(datafeedId) !== 'started'
        );
        cy.log(`Waiting for datafeeds to start. Not started yet: ${notStarted.join(', ')}`);
      }
      return allStarted;
    },
    { delay: 2000, timeout: 60000 }
  );
};
