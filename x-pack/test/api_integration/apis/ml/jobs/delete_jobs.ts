/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';
import { MULTI_METRIC_JOB_CONFIG, SINGLE_METRIC_JOB_CONFIG } from './common_jobs';

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
          [SINGLE_METRIC_JOB_CONFIG.job_id]: { deleted: true },
          [MULTI_METRIC_JOB_CONFIG.job_id]: { deleted: true },
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
        responseCode: 403,
        error: 'Forbidden',
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
        responseCode: 403,
        error: 'Forbidden',
      },
    },
  ];

  async function runJobsDeleteRequest(
    user: USER,
    requestBody: object,
    expectedResponsecode: number
  ): Promise<any> {
    const { body, status } = await supertest
      .post('/api/ml/jobs/delete_jobs')
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send(requestBody);
    ml.api.assertResponseStatusCode(expectedResponsecode, status, body);

    return body;
  }

  describe('delete_jobs', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('sets up jobs', async () => {
      for (const job of testSetupJobConfigs) {
        await ml.api.createAnomalyDetectionJob(job);
      }
    });

    describe('rejects request', function () {
      for (const testData of testDataListUnauthorized) {
        describe('fails to delete job ID supplied', function () {
          it(`${testData.testTitle}`, async () => {
            const body = await runJobsDeleteRequest(
              testData.user,
              testData.requestBody,
              testData.expected.responseCode
            );

            expect(body).to.have.property('error').eql(testData.expected.error);

            // check jobs still exist
            for (const id of testData.requestBody.jobIds) {
              await ml.api.waitForAnomalyDetectionJobToExist(id);
            }
          });
        });
      }
    });

    describe('deletes job with ID supplied', function () {
      for (const testData of testDataList) {
        it(`${testData.testTitle}`, async () => {
          const body = await runJobsDeleteRequest(
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

          // check jobs no longer exist
          for (const id of testData.requestBody.jobIds) {
            await ml.api.waitForAnomalyDetectionJobNotToExist(id);
          }
        });
      }
    });
  });
};
