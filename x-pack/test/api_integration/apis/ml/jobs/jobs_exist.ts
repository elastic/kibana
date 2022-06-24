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
import { SINGLE_METRIC_JOB_CONFIG, DATAFEED_CONFIG } from './common_jobs';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testSetupJobConfigs = [SINGLE_METRIC_JOB_CONFIG];

  const responseBody = {
    [SINGLE_METRIC_JOB_CONFIG.job_id]: true,
    [`${SINGLE_METRIC_JOB_CONFIG.job_id.slice(0, 10)}*`]: true, // wildcard, use first 10 chars
    [`${SINGLE_METRIC_JOB_CONFIG.job_id}_fail`]: false,
    [`${SINGLE_METRIC_JOB_CONFIG.job_id.slice(0, 10)}_fail*`]: false, // wildcard, use first 10 chars
  };

  const testDataList = [
    {
      testTitle: 'as ML Poweruser',
      user: USER.ML_POWERUSER,
      requestBody: {
        jobIds: Object.keys(responseBody),
      },
      expected: {
        responseCode: 200,
        responseBody,
      },
    },
    {
      testTitle: 'as ML Viewer',
      user: USER.ML_VIEWER,
      requestBody: {
        jobIds: Object.keys(responseBody),
      },
      expected: {
        responseCode: 200,
        responseBody,
      },
    },
  ];

  const testDataListUnauthorized = [
    {
      testTitle: 'as ML Unauthorized user',
      user: USER.ML_UNAUTHORIZED,
      requestBody: {
        jobIds: Object.keys(responseBody),
      },
      expected: {
        responseCode: 403,
        error: 'Forbidden',
      },
    },
  ];

  async function runJobsExistRequest(
    user: USER,
    requestBody: object,
    expectedResponsecode: number
  ): Promise<any> {
    const { body, status } = await supertest
      .post('/api/ml/jobs/jobs_exist')
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send(requestBody);
    ml.api.assertResponseStatusCode(expectedResponsecode, status, body);

    return body;
  }

  describe('jobs_exist', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
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
      }
    });

    describe('jobs exist', function () {
      for (const testData of testDataList) {
        it(`${testData.testTitle}`, async () => {
          const body = await runJobsExistRequest(
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
            expect(body[id]).to.eql(testData.expected.responseBody[id]);
          });
        });
      }
    });

    describe('rejects request', function () {
      for (const testData of testDataListUnauthorized) {
        describe('fails to check jobs exist', function () {
          it(`${testData.testTitle}`, async () => {
            const body = await runJobsExistRequest(
              testData.user,
              testData.requestBody,
              testData.expected.responseCode
            );

            expect(body).to.have.property('error').eql(testData.expected.error);
          });
        });
      }
    });
  });
};
