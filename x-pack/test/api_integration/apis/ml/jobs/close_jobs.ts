/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';
import { JOB_STATE, DATAFEED_STATE } from '../../../../../plugins/ml/common/constants/states';
import { MULTI_METRIC_JOB_CONFIG, SINGLE_METRIC_JOB_CONFIG, DATAFEED_CONFIG } from './common_jobs';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testSetupJobConfigs = [SINGLE_METRIC_JOB_CONFIG, MULTI_METRIC_JOB_CONFIG];

  const testDataList = [
    {
      testTitle: 'as ML Poweruser',
      user: USER.ML_POWERUSER,
      requestBody: {
        jobIds: [SINGLE_METRIC_JOB_CONFIG.job_id, MULTI_METRIC_JOB_CONFIG.job_id],
      },
      expected: {
        responseCode: 200,
        responseBody: {
          [SINGLE_METRIC_JOB_CONFIG.job_id]: { closed: true },
          [MULTI_METRIC_JOB_CONFIG.job_id]: { closed: true },
        },
      },
    },
  ];

  const testDataListFailed = [
    {
      testTitle: 'as ML Poweruser',
      user: USER.ML_POWERUSER,
      requestBody: {
        jobIds: [SINGLE_METRIC_JOB_CONFIG.job_id, MULTI_METRIC_JOB_CONFIG.job_id],
      },
      expected: {
        responseCode: 200,

        responseBody: {
          [SINGLE_METRIC_JOB_CONFIG.job_id]: { closed: false, error: { statusCode: 409 } },
          [MULTI_METRIC_JOB_CONFIG.job_id]: { closed: false, error: { statusCode: 409 } },
        },
      },
    },
  ];

  const testDataListUnauthorized = [
    {
      testTitle: 'as ML Unauthorized user',
      user: USER.ML_UNAUTHORIZED,
      requestBody: {
        jobIds: [SINGLE_METRIC_JOB_CONFIG.job_id, MULTI_METRIC_JOB_CONFIG.job_id],
      },
      // Note that the jobs and datafeeds are loaded async so the actual error message is not deterministic.
      expected: {
        responseCode: 404,
        error: 'Not Found',
      },
    },
    {
      testTitle: 'as ML Viewer',
      user: USER.ML_VIEWER,
      requestBody: {
        jobIds: [SINGLE_METRIC_JOB_CONFIG.job_id, MULTI_METRIC_JOB_CONFIG.job_id],
      },
      // Note that the jobs and datafeeds are loaded async so the actual error message is not deterministic.
      expected: {
        responseCode: 404,
        error: 'Not Found',
      },
    },
  ];

  async function runCloseJobsRequest(
    user: USER,
    requestBody: object,
    expectedResponsecode: number
  ): Promise<any> {
    const { body } = await supertest
      .post('/api/ml/jobs/close_jobs')
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send(requestBody)
      .expect(expectedResponsecode);

    return body;
  }

  describe('close_jobs', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('sets up jobs', async () => {
      for (const job of testSetupJobConfigs) {
        const datafeedId = `datafeed-${job.job_id}`;
        await ml.api.createAnomalyDetectionJob(job);
        await ml.api.openAnomalyDetectionJob(job.job_id);
        await ml.api.createDatafeed({
          ...DATAFEED_CONFIG,
          datafeed_id: datafeedId,
          job_id: job.job_id,
        });
        await ml.api.startDatafeed(datafeedId, { start: '0' });
        await ml.api.waitForDatafeedState(datafeedId, DATAFEED_STATE.STARTED);
      }
    });

    describe('rejects request', function () {
      for (const testData of testDataListUnauthorized) {
        describe('fails to close job ID supplied', function () {
          it(`${testData.testTitle}`, async () => {
            const body = await runCloseJobsRequest(
              testData.user,
              testData.requestBody,
              testData.expected.responseCode
            );

            expect(body).to.have.property('error').eql(testData.expected.error);

            // ensure jobs are still open
            for (const id of testData.requestBody.jobIds) {
              await ml.api.waitForJobState(id, JOB_STATE.OPENED);
            }
          });
        });
      }
    });

    describe('close jobs fail because they are running', function () {
      for (const testData of testDataListFailed) {
        it(`${testData.testTitle}`, async () => {
          const body = await runCloseJobsRequest(
            testData.user,
            testData.requestBody,
            testData.expected.responseCode
          );
          const expectedResponse = testData.expected.responseBody;
          const expectedRspJobIds = Object.keys(expectedResponse).sort((a, b) =>
            a.localeCompare(b)
          );
          const actualRspJobIds = Object.keys(body).sort((a, b) => a.localeCompare(b));

          expect(actualRspJobIds).to.have.length(expectedRspJobIds.length);
          expect(actualRspJobIds).to.eql(expectedRspJobIds);

          expectedRspJobIds.forEach((id) => {
            expect(body[id].closed).to.eql(testData.expected.responseBody[id].closed);
            expect(body[id].error.statusCode).to.eql(
              testData.expected.responseBody[id].error.statusCode
            );
          });

          // ensure jobs are still open
          for (const id of testData.requestBody.jobIds) {
            await ml.api.waitForJobState(id, JOB_STATE.OPENED);
          }
        });
      }
    });

    describe('stops datafeeds', function () {
      it('stops datafeeds', async () => {
        for (const job of testSetupJobConfigs) {
          const datafeedId = `datafeed-${job.job_id}`;
          await ml.api.stopDatafeed(datafeedId);
          await ml.api.waitForDatafeedState(datafeedId, DATAFEED_STATE.STOPPED);
        }
      });
    });

    describe('close jobs succeed', function () {
      for (const testData of testDataList) {
        it(`${testData.testTitle}`, async () => {
          const body = await runCloseJobsRequest(
            testData.user,
            testData.requestBody,
            testData.expected.responseCode
          );
          const expectedResponse = testData.expected.responseBody;
          const expectedRspJobIds = Object.keys(expectedResponse).sort((a, b) =>
            a.localeCompare(b)
          );
          const actualRspJobIds = Object.keys(body).sort((a, b) => a.localeCompare(b));

          expect(actualRspJobIds).to.have.length(expectedRspJobIds.length);
          expect(actualRspJobIds).to.eql(expectedRspJobIds);

          expectedRspJobIds.forEach((id) => {
            expect(body[id].closed).to.eql(testData.expected.responseBody[id].closed);
          });

          // ensure jobs are now closed
          for (const id of testData.requestBody.jobIds) {
            await ml.api.waitForJobState(id, JOB_STATE.CLOSED);
          }
        });
      }
    });
  });
};
