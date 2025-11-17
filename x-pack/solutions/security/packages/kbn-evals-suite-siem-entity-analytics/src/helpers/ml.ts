/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeSetupModuleRequest } from '@kbn/test-suites-xpack-security/security_solution_api_integration/test_suites/detections_response/utils/machine_learning/machine_learning_setup';
import pRetry from 'p-retry';
import type supertest from 'supertest';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import { v4 as uuidv4 } from 'uuid';
import {
  fetchPackageInfo,
  installIntegration,
} from '@kbn/security-solution-plugin/scripts/endpoint/common/fleet_services';
import { getCommonRequestHeader } from '@kbn/test-suites-xpack-platform/functional/services/ml/common_api';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

export const setupMlModulesWithRetry = ({
  module,
  supertest,
  retries = 5,
}: {
  module: string;
  supertest: supertest.Agent;
  retries?: number;
}) =>
  pRetry(
    async () => {
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
    },
    { retries }
  );

export const forceStartDatafeeds = async ({
  jobIds,
  rspCode,
  supertest,
}: {
  jobIds: string[];
  rspCode: number;
  supertest: supertest.Agent;
}) => {
  const { body } = await supertest
    .post(`/internal/ml/jobs/force_start_datafeeds`)
    .set(getCommonRequestHeader('1'))
    .send({
      datafeedIds: jobIds.map((jobId) => `datafeed-${jobId}`),
      start: new Date().getUTCMilliseconds(),
    })
    .expect(rspCode);

  return body;
};

export const installIntegrationAndCreatePolicy = async ({
  kbnClient,
  log,
  integrationName,
  supertest,
  namespace = 'default',
}: {
  kbnClient: KbnClient;
  supertest: supertest.Agent;
  log: ToolingLog;
  integrationName: string;
  namespace?: string;
}): Promise<{
  agentPolicyId: string;
  packagePolicyId: string;
}> => {
  await installIntegration(kbnClient, integrationName);
  const packageInfo = await fetchPackageInfo(kbnClient, integrationName);

  const { version: packageVersion, name: packageName } = packageInfo;

  const { body: agentPolicyResponse } = await supertest
    .post(`/api/fleet/agent_policies`)
    .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
    .set('kbn-xsrf', 'xxxx')
    .send({
      name: `Test agent policy ${uuidv4()}`,
      namespace,
    });

  const agentPolicyId = agentPolicyResponse.item.id;

  const { body: packagePolicyResponse } = await supertest
    .post(`/api/fleet/package_policies`)
    .set('kbn-xsrf', 'xxxx')
    .send({
      name: `Test package policy ${uuidv4()}`,
      description: '',
      namespace,
      policy_id: agentPolicyId,
      enabled: true,
      inputs: [],
      package: {
        name: packageName,
        version: packageVersion,
      },
    });

  const packagePolicyId = packagePolicyResponse.item.id;

  return {
    agentPolicyId,
    packagePolicyId,
  };
};

export const deleteMLJobs = async ({
  jobIds,
  supertest,
}: {
  jobIds: string[];
  supertest: supertest.Agent;
}) => {
  await supertest
    .post(`/internal/ml/jobs/delete_jobs`)
    .set(getCommonRequestHeader('1'))
    .send({ jobIds, deleteUserAnnotations: true, deleteAlertingRules: false });
};
