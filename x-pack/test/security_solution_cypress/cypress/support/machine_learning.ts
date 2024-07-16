/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  rootRequest({
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
