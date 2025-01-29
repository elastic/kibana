/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Group } from '@kbn/ml-plugin/common/types/groups';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';
import { MULTI_METRIC_JOB_CONFIG, SINGLE_METRIC_JOB_CONFIG, DATAFEED_CONFIG } from './common_jobs';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const singleMetricJob = {
    job: SINGLE_METRIC_JOB_CONFIG,
    datafeed: {
      ...DATAFEED_CONFIG,
      job_id: SINGLE_METRIC_JOB_CONFIG.job_id,
      datafeed_id: `datafeed-${SINGLE_METRIC_JOB_CONFIG.job_id}`,
    },
  };

  const multiMetricJob = {
    job: MULTI_METRIC_JOB_CONFIG,
    datafeed: {
      ...DATAFEED_CONFIG,
      job_id: MULTI_METRIC_JOB_CONFIG.job_id,
      datafeed_id: `datafeed-${MULTI_METRIC_JOB_CONFIG.job_id}`,
    },
  };

  async function runRequest(
    user: USER,
    requestBody: any,
    expectedResponseCode: number
  ): Promise<Group[]> {
    const { body, status } = await supertest
      .post('/internal/ml/jobs/bulk_create')
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'))
      .send(requestBody);
    ml.api.assertResponseStatusCode(expectedResponseCode, status, body);

    return body;
  }

  describe('bulk create jobs', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    afterEach(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('creates single job', async () => {
      const requestBody = singleMetricJob;
      const expectedResponse = {
        [SINGLE_METRIC_JOB_CONFIG.job_id]: {
          job: { success: true },
          datafeed: { success: true },
        },
      };
      const resp = await runRequest(USER.ML_POWERUSER, requestBody, 200);

      expect(resp).to.eql(
        expectedResponse,
        `response should equal ${JSON.stringify(expectedResponse)}, got ${JSON.stringify(resp)}`
      );

      const expectedJobIds = [requestBody.job.job_id];
      const expectedDatafeedIds = [requestBody.datafeed.datafeed_id];

      await ml.api.adJobsExistsInSpace(expectedJobIds);
      await ml.api.datafeedsExistsInSpace(expectedDatafeedIds);
    });

    it('creates multiple jobs', async () => {
      const requestBody = [singleMetricJob, multiMetricJob];
      const expectedResponse = {
        [SINGLE_METRIC_JOB_CONFIG.job_id]: {
          job: { success: true },
          datafeed: { success: true },
        },
        [MULTI_METRIC_JOB_CONFIG.job_id]: {
          job: { success: true },
          datafeed: { success: true },
        },
      };
      const resp = await runRequest(USER.ML_POWERUSER, requestBody, 200);

      expect(resp).to.eql(
        expectedResponse,
        `response should equal ${JSON.stringify(expectedResponse)}, got ${JSON.stringify(resp)}`
      );

      const expectedJobIds = requestBody.map((j) => j.job.job_id).sort();
      const expectedDatafeedIds = requestBody.map((j) => j.datafeed.datafeed_id).sort();

      await ml.api.adJobsExistsInSpace(expectedJobIds);
      await ml.api.datafeedsExistsInSpace(expectedDatafeedIds);
    });

    it('creates multiple jobs, with an expected datafeed error', async () => {
      const requestBody = [
        singleMetricJob,
        {
          job: multiMetricJob.job,
          datafeed: { ...multiMetricJob.datafeed, job_id: 'bad_job_id' },
        },
      ];
      const expectedResponse = {
        [SINGLE_METRIC_JOB_CONFIG.job_id]: {
          job: { success: true },
          datafeed: { success: true },
        },
        [MULTI_METRIC_JOB_CONFIG.job_id]: {
          job: { success: true },
          datafeed: {
            success: false,
            error: {
              error: {
                reason: "No known job with id 'bad_job_id'",
                root_cause: [
                  {
                    reason: "No known job with id 'bad_job_id'",
                    type: 'resource_not_found_exception',
                  },
                ],
                type: 'resource_not_found_exception',
              },
              status: 404,
            },
          },
        },
      };
      const resp = await runRequest(USER.ML_POWERUSER, requestBody, 200);

      expect(resp).to.eql(
        expectedResponse,
        `response should equal ${JSON.stringify(expectedResponse)}, got ${JSON.stringify(resp)}`
      );

      const expectedJobIds = requestBody.map((j) => j.job.job_id).sort();
      // only one datafeed
      const expectedDatafeedIds = [singleMetricJob.datafeed.datafeed_id];

      await ml.api.adJobsExistsInSpace(expectedJobIds);
      await ml.api.datafeedsExistsInSpace(expectedDatafeedIds);
    });

    it('creates multiple jobs, with an expected job and datafeed error', async () => {
      const requestBody = [
        singleMetricJob,
        {
          job: { ...multiMetricJob.job, job_id: 'BAD_JOB_ID' },
          datafeed: multiMetricJob.datafeed,
        },
      ];
      const expectedResponse = {
        [SINGLE_METRIC_JOB_CONFIG.job_id]: {
          job: { success: true },
          datafeed: { success: true },
        },
        BAD_JOB_ID: {
          job: {
            success: false,
            error: {
              error: {
                reason:
                  "Invalid job_id; 'BAD_JOB_ID' can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; must start and end with alphanumeric",
                root_cause: [
                  {
                    reason:
                      "Invalid job_id; 'BAD_JOB_ID' can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; must start and end with alphanumeric",
                    type: 'illegal_argument_exception',
                  },
                ],
                type: 'illegal_argument_exception',
              },
              status: 400,
            },
          },
          datafeed: {
            success: false,
            error: {
              error: {
                reason: `No known job with id '${multiMetricJob.job.job_id}'`,
                root_cause: [
                  {
                    reason: `No known job with id '${multiMetricJob.job.job_id}'`,
                    type: 'resource_not_found_exception',
                  },
                ],
                type: 'resource_not_found_exception',
              },
              status: 404,
            },
          },
        },
      };
      const resp = await runRequest(USER.ML_POWERUSER, requestBody, 200);

      expect(resp).to.eql(
        expectedResponse,
        `response should equal ${JSON.stringify(expectedResponse)}, got ${JSON.stringify(resp)}`
      );

      // only one job
      const expectedJobIds = [singleMetricJob.job.job_id];
      // only one datafeed
      const expectedDatafeedIds = [singleMetricJob.datafeed.datafeed_id];

      await ml.api.adJobsExistsInSpace(expectedJobIds);
      await ml.api.datafeedsExistsInSpace(expectedDatafeedIds);
    });
  });
};
