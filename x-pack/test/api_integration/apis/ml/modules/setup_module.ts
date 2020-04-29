/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

import { JOB_STATE, DATAFEED_STATE } from '../../../../../plugins/ml/common/constants/states';
import { USER } from '../../../../functional/services/machine_learning/security_common';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testDataListPositive = [
    {
      testTitleSuffix: 'for sample logs dataset with prefix and startDatafeed false',
      sourceDataArchive: 'ml/sample_logs',
      indexPattern: { name: 'kibana_sample_data_logs', timeField: '@timestamp' },
      module: 'sample_data_weblogs',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf1_',
        indexPatternName: 'kibana_sample_data_logs',
        startDatafeed: false,
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf1_low_request_rate',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf1_response_code_rates',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf1_url_scanning',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
      },
    },
  ];

  const testDataListNegative = [
    {
      testTitleSuffix: 'for non existent index pattern',
      module: 'sample_data_weblogs',
      user: USER.ML_POWERUSER,
      requestBody: {
        indexPatternName: 'non-existent-index-pattern',
        startDatafeed: false,
      },
      expected: {
        responseCode: 400,
        error: 'Bad Request',
        message:
          "Module's jobs contain custom URLs which require a kibana index pattern (non-existent-index-pattern) which cannot be found.",
      },
    },
    {
      testTitleSuffix: 'for unauthorized user',
      sourceDataArchive: 'ml/sample_logs',
      indexPattern: { name: 'kibana_sample_data_logs', timeField: '@timestamp' },
      module: 'sample_data_weblogs',
      user: USER.ML_UNAUTHORIZED,
      requestBody: {
        prefix: 'pf1_',
        indexPatternName: 'kibana_sample_data_logs',
        startDatafeed: false,
      },
      expected: {
        responseCode: 404,
        error: 'Not Found',
        message: 'Not Found',
      },
    },
  ];

  async function executeSetupModuleRequest(
    module: string,
    user: USER,
    rqBody: object,
    rspCode: number
  ) {
    const { body } = await supertest
      .post(`/api/ml/modules/setup/${module}`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_HEADERS)
      .send(rqBody)
      .expect(rspCode);

    return body;
  }

  function compareById(a: { id: string }, b: { id: string }) {
    if (a.id < b.id) {
      return -1;
    }
    if (a.id > b.id) {
      return 1;
    }
    return 0;
  }

  describe('module setup', function() {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    for (const testData of testDataListPositive) {
      describe('sets up module data', function() {
        before(async () => {
          await esArchiver.loadIfNeeded(testData.sourceDataArchive);
          await ml.testResources.createIndexPatternIfNeeded(
            testData.indexPattern.name,
            testData.indexPattern.timeField
          );
        });

        after(async () => {
          await ml.api.cleanMlIndices();
        });

        it(testData.testTitleSuffix, async () => {
          const rspBody = await executeSetupModuleRequest(
            testData.module,
            testData.user,
            testData.requestBody,
            testData.expected.responseCode
          );

          // verify response
          if (testData.expected.jobs.length > 0) {
            // jobs
            expect(rspBody).to.have.property('jobs');

            const expectedRspJobs = testData.expected.jobs
              .map(job => {
                return { id: job.jobId, success: true };
              })
              .sort(compareById);

            const actualRspJobs = rspBody.jobs.sort(compareById);

            expect(actualRspJobs).to.eql(
              expectedRspJobs,
              `Expected setup module response jobs to be '${JSON.stringify(
                expectedRspJobs
              )}' (got '${JSON.stringify(actualRspJobs)}')`
            );

            // datafeeds
            expect(rspBody).to.have.property('datafeeds');

            const expectedRspDatafeeds = testData.expected.jobs
              .map(job => {
                return {
                  id: `datafeed-${job.jobId}`,
                  success: true,
                  started: testData.requestBody.startDatafeed,
                };
              })
              .sort(compareById);

            const actualRspDatafeeds = rspBody.datafeeds.sort(compareById);

            expect(actualRspDatafeeds).to.eql(
              expectedRspDatafeeds,
              `Expected setup module response datafeeds to be '${JSON.stringify(
                expectedRspDatafeeds
              )}' (got '${JSON.stringify(actualRspDatafeeds)}')`
            );

            // TODO in future updates: add response validations for created saved objects
          }

          // verify job and datafeed creation + states
          for (const job of testData.expected.jobs) {
            const datafeedId = `datafeed-${job.jobId}`;
            await ml.api.waitForAnomalyDetectionJobToExist(job.jobId);
            await ml.api.waitForDatafeedToExist(datafeedId);
            await ml.api.waitForJobState(job.jobId, job.jobState);
            await ml.api.waitForDatafeedState(datafeedId, job.datafeedState);
          }
        });

        // TODO in future updates: add creation validations for created saved objects
      });
    }

    for (const testData of testDataListNegative) {
      describe('rejects request', function() {
        before(async () => {
          if (testData.hasOwnProperty('sourceDataArchive')) {
            await esArchiver.loadIfNeeded(testData.sourceDataArchive!);
          }
          if (testData.hasOwnProperty('indexPattern')) {
            await ml.testResources.createIndexPatternIfNeeded(
              testData.indexPattern!.name as string,
              testData.indexPattern!.timeField as string
            );
          }
        });

        after(async () => {
          await ml.api.cleanMlIndices();
        });

        it(testData.testTitleSuffix, async () => {
          const rspBody = await executeSetupModuleRequest(
            testData.module,
            testData.user,
            testData.requestBody,
            testData.expected.responseCode
          );

          expect(rspBody)
            .to.have.property('error')
            .eql(testData.expected.error);

          expect(rspBody)
            .to.have.property('message')
            .eql(testData.expected.message);
        });
      });
    }
  });
};
