/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlSummaryJob } from '@kbn/ml-plugin/public';
import { KibanaServices } from '../../../lib/kibana';

export interface GetJobsSummaryArgs {
  jobIds?: string[];
  signal?: AbortSignal;
}

/**
 * Fetches a summary of all ML jobs currently installed
 *
 * @param jobIds Array of job IDs to filter against
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const getJobsSummary = async ({
  jobIds,
  signal,
}: GetJobsSummaryArgs): Promise<MlSummaryJob[]> =>
  KibanaServices.get().http.fetch<MlSummaryJob[]>('/internal/ml/jobs/jobs_summary', {
    method: 'POST',
    version: '1',
    body: JSON.stringify({ jobIds: jobIds ?? [] }),
    asSystemRequest: true,
    signal,
  });
