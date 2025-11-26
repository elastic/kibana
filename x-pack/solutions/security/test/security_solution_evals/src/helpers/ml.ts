/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import type supertest from 'supertest';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import { v4 as uuidv4 } from 'uuid';
import type SuperTest from 'supertest';
import {
  fetchPackageInfo,
  installIntegration,
} from '@kbn/security-solution-plugin/scripts/endpoint/common/fleet_services';
import { getCommonRequestHeader } from '@kbn/test-suites-xpack-platform/functional/services/ml/common_api';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { ML_GROUP_ID } from '@kbn/security-solution-plugin/common/constants';
import type { MlSummaryJob } from '@kbn/ml-plugin/public';
import { isJobStarted } from '@kbn/security-solution-plugin/common/machine_learning/helpers';

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
  indexPatternName = 'auditbeat-*',
}: {
  module: string;
  rspCode: number;
  supertest: SuperTest.Agent;
  indexPatternName?: string;
}): Promise<{ jobs: ModuleJob[] }> => {
  const { body } = await supertest
    .post(`/internal/ml/modules/setup/${module}`)
    .set(getCommonRequestHeader('1'))
    .send({
      prefix: '',
      groups: [ML_GROUP_ID],
      indexPatternName,
      startDatafeed: false,
      useDedicatedIndex: true,
      applyToAllSpaces: true,
    })
    .expect(rspCode);

  return body;
};

export const setupMlModulesWithRetry = ({
  module,
  supertest,
  retries = 5,
  indexPatternName,
}: {
  module: string;
  supertest: supertest.Agent;
  retries?: number;
  indexPatternName?: string;
}) =>
  pRetry(
    async () => {
      const response = await executeSetupModuleRequest({
        module,
        rspCode: 200,
        supertest,
        indexPatternName,
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
      start: Date.now(),
    })
    .expect(rspCode);

  return body;
};

export const getJobsSummary = async ({
  jobIds,
  supertest,
}: {
  jobIds: string[];
  supertest: supertest.Agent;
}): Promise<MlSummaryJob[]> => {
  const { body } = await supertest
    .post(`/internal/ml/jobs/jobs_summary`)
    .set(getCommonRequestHeader('1'))
    .send({
      jobIds,
    });

  return body.filter((job: MlSummaryJob) => jobIds.includes(job.id));
};

export const waitForAllJobsToStart = async ({
  jobIds,
  supertest,
  log,
}: {
  jobIds: string[];
  supertest: supertest.Agent;
  log: ToolingLog;
}): Promise<MlSummaryJob[]> => {
  const timeoutMs = 5 * 60 * 1000; // 5 minutes in milliseconds
  const startTime = Date.now();

  log.info(`Waiting for ${jobIds.length} job(s) to start: ${jobIds.join(', ')}`);

  return pRetry(
    async () => {
      // Check if we've exceeded the timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > timeoutMs) {
        throw new Error(`waitForAllJobsToStart exceeded timeout of ${timeoutMs}ms`);
      }

      const jobs = await getJobsSummary({ jobIds, supertest });

      // Check if all jobs are found
      if (jobs.length !== jobIds.length) {
        const foundJobIds = jobs.map((job) => job.id);
        const missingJobIds = jobIds.filter((id) => !foundJobIds.includes(id));
        const errorMsg = `Not all jobs found. Missing: ${missingJobIds.join(', ')}. Expected ${
          jobIds.length
        }, found ${jobs.length}`;
        log.warning(errorMsg);
        throw new Error(errorMsg);
      }

      // Check if all jobs are started
      const notStartedJobs = jobs.filter((job) => !isJobStarted(job.jobState, job.datafeedState));
      const startedCount = jobs.length - notStartedJobs.length;

      if (notStartedJobs.length > 0) {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        log.info(
          `[${elapsedSeconds}s] Status: ${startedCount}/${
            jobs.length
          } jobs started. Waiting for: ${notStartedJobs.map((job) => job.id).join(', ')}`
        );
        const jobStates = notStartedJobs.map(
          (job) => `${job.id} (jobState: ${job.jobState}, datafeedState: ${job.datafeedState})`
        );
        throw new Error(`Not all jobs are started. Jobs not started: ${jobStates.join(', ')}`);
      }

      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      log.info(`[${elapsedSeconds}s] All ${jobs.length} job(s) are now started!`);
      return jobs;
    },
    {
      retries: 100, // High number of retries to allow for the 5 minute timeout
      minTimeout: 2000, // 2 seconds minimum between retries
      maxTimeout: 10000, // 10 seconds maximum between retries
      factor: 1.5, // Exponential backoff factor
      onFailedAttempt: (error) => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        log.debug(
          `[${elapsedSeconds}s] Retry attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left. Error: ${error.message}`
        );
      },
    }
  );
};

export const installIntegrationAndCreatePolicy = async ({
  kbnClient,
  integrationName,
  supertest,
  namespace = 'default',
}: {
  kbnClient: KbnClient;
  supertest: supertest.Agent;
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
