/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rootRequest } from '../tasks/api_calls/common';

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
