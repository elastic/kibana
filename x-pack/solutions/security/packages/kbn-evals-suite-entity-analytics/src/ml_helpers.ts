/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
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
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import { isJobStarted } from '@kbn/security-solution-plugin/common/machine_learning/helpers';

// Security Authentication ML module
export const securityAuthModule = 'security_auth';
export const securityAuthJobIds = [
  'auth_rare_source_ip_for_a_user_ea',
  'suspicious_login_activity_ea',
  'auth_rare_user_ea',
  'auth_rare_hour_for_a_user_ea',
];

// Privileged Access Detection (PAD) ML module
export const padModule = 'pad-ml';
export const padJobIds = [
  'pad_linux_rare_process_executed_by_user_ea',
  'pad_linux_high_count_privileged_process_events_by_user_ea',
];

// Lateral Movement Detection (LMD) ML module
export const lmdModule = 'lmd-ml';
export const lmdJobIds = [
  'lmd_high_count_remote_file_transfer_ea',
  'lmd_high_file_size_remote_file_transfer_ea',
];

// Security PacketBeat ML module
export const securityPacketBeatModule = 'security_packetbeat';
export const securityPacketBeatJobIds = ['packetbeat_rare_server_domain_ea'];

// Data Exfiltration Detection (DED) ML module
export const dedModule = 'ded-ml';
export const dedJobIds = [
  'ded_high_bytes_written_to_external_device_ea',
  'ded_high_bytes_written_to_external_device_airdrop_ea',
  'ded_high_sent_bytes_destination_geo_country_iso_code_ea',
  'ded_high_sent_bytes_destination_ip_ea',
];

interface ModuleJob {
  id: string;
  success: boolean;
  error?: {
    status: number;
  };
}

interface ExecuteSetupModuleRequestOpts {
  module: string;
  rspCode: number;
  supertest: SuperTest.Agent;
  indexPatternName?: string;
}
interface ExecuteSetupModuleResult {
  jobs: ModuleJob[];
}
const executeSetupModuleRequest = async ({
  module,
  rspCode,
  supertest,
  indexPatternName = 'auditbeat-*',
}: ExecuteSetupModuleRequestOpts): Promise<ExecuteSetupModuleResult> => {
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

interface SetupMlModulesWithRetryOpts {
  module: string;
  supertest: SuperTest.Agent;
  retries?: number;
  indexPatternName?: string;
}
export const setupMlModulesWithRetry = ({
  module,
  supertest,
  retries = 5,
  indexPatternName,
}: SetupMlModulesWithRetryOpts) =>
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

interface ForceStartDatafeedsOpts {
  jobIds: string[];
  rspCode: number;
  supertest: SuperTest.Agent;
}
export const forceStartDatafeeds = async ({
  jobIds,
  rspCode,
  supertest,
}: ForceStartDatafeedsOpts) => {
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

interface GetJobsSummaryOpts {
  jobIds: string[];
  supertest: SuperTest.Agent;
}
const getJobsSummary = async ({
  jobIds,
  supertest,
}: GetJobsSummaryOpts): Promise<MlSummaryJob[]> => {
  const { body } = await supertest
    .post(`/internal/ml/jobs/jobs_summary`)
    .set(getCommonRequestHeader('1'))
    .send({
      jobIds,
    });

  return body.filter((job: MlSummaryJob) => jobIds.includes(job.id));
};

interface WaitForAllJobsToStartOpts {
  jobIds: string[];
  supertest: SuperTest.Agent;
  log: ToolingLog;
}

export const waitForAllJobsToStart = async ({
  jobIds,
  supertest,
  log,
}: WaitForAllJobsToStartOpts): Promise<MlSummaryJob[]> => {
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

interface InstallIntegrationAndCreatePolicyOpts {
  kbnClient: KbnClient;
  supertest: SuperTest.Agent;
  integrationName: string;
  namespace?: string;
}
interface InstallIntegrationAndCreatePolicyResult {
  agentPolicyId: string;
  packagePolicyId: string;
}

export const installIntegrationAndCreatePolicy = async ({
  kbnClient,
  integrationName,
  supertest,
  namespace = 'default',
}: InstallIntegrationAndCreatePolicyOpts): Promise<InstallIntegrationAndCreatePolicyResult> => {
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
  supertest: SuperTest.Agent;
}) => {
  await supertest
    .post(`/internal/ml/jobs/delete_jobs`)
    .set(getCommonRequestHeader('1'))
    .send({ jobIds, deleteUserAnnotations: true, deleteAlertingRules: false });
};
