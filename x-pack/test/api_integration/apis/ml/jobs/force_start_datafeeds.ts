/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { JOB_STATE, DATAFEED_STATE } from '@kbn/ml-plugin/common/constants/states';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { MULTI_METRIC_JOB_CONFIG, SINGLE_METRIC_JOB_CONFIG, DATAFEED_CONFIG } from './common_jobs';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testSetupJobConfigs = [SINGLE_METRIC_JOB_CONFIG, MULTI_METRIC_JOB_CONFIG];

  async function runStartDatafeedsRequest(
    user: USER,
    requestBody: object,
    expectedResponsecode: number
  ): Promise<Record<string, { started: boolean; error?: string }>> {
    const { body, status } = await supertest
      .post('/api/ml/jobs/force_start_datafeeds')
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send(requestBody);
    ml.api.assertResponseStatusCode(expectedResponsecode, status, body);

    return body;
  }

  const testDataList = [
    {
      testTitle: 'as ML Poweruser',
      jobIds: [SINGLE_METRIC_JOB_CONFIG.job_id, MULTI_METRIC_JOB_CONFIG.job_id],
      user: USER.ML_POWERUSER,
      requestBody: {
        datafeedIds: [
          `datafeed-${SINGLE_METRIC_JOB_CONFIG.job_id}`,
          `datafeed-${MULTI_METRIC_JOB_CONFIG.job_id}`,
        ],
        start: 1454803200000, // Starts in real-time from Feb 7 2016 00:00
      },
      expected: {
        responseCode: 200,
        responseBody: {
          [`datafeed-${SINGLE_METRIC_JOB_CONFIG.job_id}`]: { started: true },
          [`datafeed-${MULTI_METRIC_JOB_CONFIG.job_id}`]: { started: true },
        },
      },
    },
  ];

  const invalidTestDataList = [
    {
      testTitle: 'as ML Poweruser with datafeed ID that does not exist',
      jobIds: [SINGLE_METRIC_JOB_CONFIG.job_id],
      user: USER.ML_POWERUSER,
      requestBody: {
        datafeedIds: [`invalid-datafeed-${SINGLE_METRIC_JOB_CONFIG.job_id}`],
        start: 1454803200000, // Feb 7 2016 00:00
      },
      expected: {
        responseCode: 200,
        responseBody: {
          [`invalid-datafeed-${SINGLE_METRIC_JOB_CONFIG.job_id}`]: { started: false },
        },
      },
    },
  ];

  const testDataListUnauthorized = [
    {
      testTitle: 'as ML Unauthorized user',
      user: USER.ML_UNAUTHORIZED,
      jobIds: [SINGLE_METRIC_JOB_CONFIG.job_id, MULTI_METRIC_JOB_CONFIG.job_id],
      requestBody: {
        datafeedIds: [
          `datafeed-${SINGLE_METRIC_JOB_CONFIG.job_id}`,
          `datafeed-${MULTI_METRIC_JOB_CONFIG.job_id}`,
        ],
        start: 1454803200000, // Feb 7 2016 00:00
        end: 1455235200000, // Feb 12 2016 00:00
      },
      expected: {
        responseCode: 403,
        error: 'Forbidden',
      },
    },
    {
      testTitle: 'as ML Viewer',
      user: USER.ML_VIEWER,
      jobIds: [SINGLE_METRIC_JOB_CONFIG.job_id, MULTI_METRIC_JOB_CONFIG.job_id],
      requestBody: {
        datafeedIds: [
          `datafeed-${SINGLE_METRIC_JOB_CONFIG.job_id}`,
          `datafeed-${MULTI_METRIC_JOB_CONFIG.job_id}`,
        ],
        start: 1454803200000, // Feb 7 2016 00:00
        end: 1455235200000, // Feb 12 2016 00:00
      },
      expected: {
        responseCode: 403,
        error: 'Forbidden',
      },
    },
  ];

  describe('force_start_datafeeds', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();

      for (const job of testSetupJobConfigs) {
        const datafeedId = `datafeed-${job.job_id}`;
        await ml.api.createAnomalyDetectionJob(job);
        await ml.api.createDatafeed({
          ...DATAFEED_CONFIG,
          datafeed_id: datafeedId,
          job_id: job.job_id,
        });
      }
    });

    after(async () => {
      for (const job of testSetupJobConfigs) {
        await ml.api.deleteAnomalyDetectionJobES(job.job_id);
      }
      await ml.api.cleanMlIndices();
    });

    describe('rejects requests for unauthorized users', function () {
      for (const testData of testDataListUnauthorized) {
        describe('fails to force start supplied datafeed IDs', function () {
          it(`${testData.testTitle}`, async () => {
            const body = await runStartDatafeedsRequest(
              testData.user,
              testData.requestBody,
              testData.expected.responseCode
            );

            expect(body).to.have.property('error').eql(testData.expected.error);

            // check jobs are still closed
            for (const id of testData.jobIds) {
              await ml.api.waitForJobState(id, JOB_STATE.CLOSED);
            }

            // check datafeeds are still stopped
            for (const id of testData.requestBody.datafeedIds) {
              await ml.api.waitForDatafeedState(id, DATAFEED_STATE.STOPPED);
            }
          });
        });
      }
    });

    describe('starts datafeeds with supplied IDs', function () {
      for (const testData of testDataList) {
        it(`${testData.testTitle}`, async () => {
          const body = await runStartDatafeedsRequest(
            testData.user,
            testData.requestBody,
            testData.expected.responseCode
          );

          const expectedResponse = testData.expected.responseBody;
          const expectedRspDatafeedIds = Object.keys(expectedResponse).sort((a, b) =>
            a.localeCompare(b)
          );
          const actualRspDatafeedIds = Object.keys(body).sort((a, b) => a.localeCompare(b));

          expect(actualRspDatafeedIds).to.have.length(expectedRspDatafeedIds.length);
          expect(actualRspDatafeedIds).to.eql(expectedRspDatafeedIds);

          // check jobs are open
          for (const id of testData.jobIds) {
            await ml.api.waitForJobState(id, JOB_STATE.OPENED);
          }

          // check datafeeds have started
          for (const id of testData.requestBody.datafeedIds) {
            await ml.api.waitForDatafeedState(id, DATAFEED_STATE.STARTED);
          }
        });
      }
    });

    describe('succeeds with datafeed already started', function () {
      for (const testData of testDataList) {
        it(`${testData.testTitle}`, async () => {
          const body = await runStartDatafeedsRequest(
            testData.user,
            testData.requestBody,
            testData.expected.responseCode
          );

          const expectedResponse = testData.expected.responseBody;
          const expectedRspDatafeedIds = Object.keys(expectedResponse).sort((a, b) =>
            a.localeCompare(b)
          );
          const actualRspDatafeedIds = Object.keys(body).sort((a, b) => a.localeCompare(b));

          expect(actualRspDatafeedIds).to.have.length(expectedRspDatafeedIds.length);
          expect(actualRspDatafeedIds).to.eql(expectedRspDatafeedIds);

          // check jobs are still open
          for (const id of testData.jobIds) {
            await ml.api.waitForJobState(id, JOB_STATE.OPENED);
          }

          // check datafeeds are still started
          for (const id of testData.requestBody.datafeedIds) {
            await ml.api.waitForDatafeedState(id, DATAFEED_STATE.STARTED);
          }
        });
      }
    });

    describe('returns expected response for invalid request', function () {
      for (const testData of invalidTestDataList) {
        it(`${testData.testTitle}`, async () => {
          const body = await runStartDatafeedsRequest(
            testData.user,
            testData.requestBody,
            testData.expected.responseCode
          );
          const expectedResponse = testData.expected.responseBody;
          const expectedRspDatafeedIds = Object.keys(expectedResponse).sort((a, b) =>
            a.localeCompare(b)
          );
          const actualRspDatafeedIds = Object.keys(body).sort((a, b) => a.localeCompare(b));

          expect(actualRspDatafeedIds).to.have.length(expectedRspDatafeedIds.length);
          expect(actualRspDatafeedIds).to.eql(expectedRspDatafeedIds);

          expectedRspDatafeedIds.forEach((id) => {
            expect(body[id].started).to.eql(expectedResponse[id].started);
          });
        });
      }
    });
  });
};
