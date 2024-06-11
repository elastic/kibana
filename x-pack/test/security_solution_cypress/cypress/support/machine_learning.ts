/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
      groups: ['auditbeat'],
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
