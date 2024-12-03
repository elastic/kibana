/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { RetryService } from '@kbn/ftr-common-functional-services';
import { ML_GROUP_ID } from '@kbn/security-solution-plugin/common/constants';
import { getCommonRequestHeader } from '../../../../../functional/services/ml/common_api';

interface ModuleJob {
  id: string;
  success: boolean;
  error?: {
    status: number;
  };
}

export const executeSetupModuleRequest = async ({
  module,
  rspCode,
  supertest,
}: {
  module: string;
  rspCode: number;
  supertest: SuperTest.Agent;
}): Promise<{ jobs: ModuleJob[] }> => {
  const { body } = await supertest
    .post(`/internal/ml/modules/setup/${module}`)
    .set(getCommonRequestHeader('1'))
    .send({
      prefix: '',
      groups: [ML_GROUP_ID],
      indexPatternName: 'auditbeat-*',
      startDatafeed: false,
      useDedicatedIndex: true,
      applyToAllSpaces: true,
    })
    .expect(rspCode);

  return body;
};

export const setupMlModulesWithRetry = async ({
  module,
  retry,
  supertest,
}: {
  module: string;
  retry: RetryService;
  supertest: SuperTest.Agent;
}) =>
  retry.try(async () => {
    const response = await executeSetupModuleRequest({
      module,
      rspCode: 200,
      supertest,
    });

    const allJobsSucceeded = response?.jobs.every((job) => {
      return job.success || (job.error?.status && job.error.status < 500);
    });

    if (!allJobsSucceeded) {
      throw new Error(
        `Expected all jobs to set up successfully, but got ${JSON.stringify(response)}`
      );
    }

    return response;
  });

export const forceStartDatafeeds = async ({
  jobId,
  rspCode,
  supertest,
}: {
  jobId: string;
  rspCode: number;
  supertest: SuperTest.Agent;
}) => {
  const { body } = await supertest
    .post(`/internal/ml/jobs/force_start_datafeeds`)
    .set(getCommonRequestHeader('1'))
    .send({
      datafeedIds: [`datafeed-${jobId}`],
      start: new Date().getUTCMilliseconds(),
    })
    .expect(rspCode);

  return body;
};
