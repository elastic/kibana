/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/machine_learning/security_common';
import { Job } from '../../../../../plugins/ml/common/types/anomaly_detection_jobs';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

const SINGLE_METRIC_JOB_CONFIG: Job = {
  job_id: `jobs_summary_fq_single_${Date.now()}`,
  description: 'mean(responsetime) on farequote dataset with 15m bucket span',
  groups: ['farequote', 'automated', 'single-metric'],
  analysis_config: {
    bucket_span: '15m',
    influencers: [],
    detectors: [
      {
        function: 'mean',
        field_name: 'responsetime',
      },
    ],
  },
  data_description: { time_field: '@timestamp' },
  analysis_limits: { model_memory_limit: '10mb' },
  model_plot_config: { enabled: true },
};

const MULTI_METRIC_JOB_CONFIG: Job = {
  job_id: `jobs_summary_fq_multi_${Date.now()}`,
  description: 'mean(responsetime) partition=airline on farequote dataset with 1h bucket span',
  groups: ['farequote', 'automated', 'multi-metric'],
  analysis_config: {
    bucket_span: '1h',
    influencers: ['airline'],
    detectors: [{ function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' }],
  },
  data_description: { time_field: '@timestamp' },
  analysis_limits: { model_memory_limit: '20mb' },
  model_plot_config: { enabled: true },
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testSetupJobConfigs = [SINGLE_METRIC_JOB_CONFIG, MULTI_METRIC_JOB_CONFIG];

  const testDataListNoJobId = [
    {
      testTitle: 'as ML Poweruser',
      user: USER.ML_POWERUSER,
      requestBody: {},
      expected: {
        responseCode: 200,
        responseBody: [
          {
            id: SINGLE_METRIC_JOB_CONFIG.job_id,
            description: SINGLE_METRIC_JOB_CONFIG.description,
            groups: SINGLE_METRIC_JOB_CONFIG.groups,
            processed_record_count: 0,
            memory_status: 'ok',
            jobState: 'closed',
            hasDatafeed: false,
            datafeedId: '',
            datafeedIndices: [],
            datafeedState: '',
            isSingleMetricViewerJob: true,
          },
          {
            id: MULTI_METRIC_JOB_CONFIG.job_id,
            description: MULTI_METRIC_JOB_CONFIG.description,
            groups: MULTI_METRIC_JOB_CONFIG.groups,
            processed_record_count: 0,
            memory_status: 'ok',
            jobState: 'closed',
            hasDatafeed: false,
            datafeedId: '',
            datafeedIndices: [],
            datafeedState: '',
            isSingleMetricViewerJob: true,
          },
        ],
      },
    },
    {
      testTitle: 'as ML Viewer',
      user: USER.ML_VIEWER,
      requestBody: {},
      expected: {
        responseCode: 200,
        responseBody: [
          {
            id: SINGLE_METRIC_JOB_CONFIG.job_id,
            description: SINGLE_METRIC_JOB_CONFIG.description,
            groups: SINGLE_METRIC_JOB_CONFIG.groups,
            processed_record_count: 0,
            memory_status: 'ok',
            jobState: 'closed',
            hasDatafeed: false,
            datafeedId: '',
            datafeedIndices: [],
            datafeedState: '',
            isSingleMetricViewerJob: true,
          },
          {
            id: MULTI_METRIC_JOB_CONFIG.job_id,
            description: MULTI_METRIC_JOB_CONFIG.description,
            groups: MULTI_METRIC_JOB_CONFIG.groups,
            processed_record_count: 0,
            memory_status: 'ok',
            jobState: 'closed',
            hasDatafeed: false,
            datafeedId: '',
            datafeedIndices: [],
            datafeedState: '',
            isSingleMetricViewerJob: true,
          },
        ],
      },
    },
  ];

  const testDataListWithJobId = [
    {
      testTitle: 'as ML Poweruser',
      user: USER.ML_POWERUSER,
      requestBody: {
        jobIds: [SINGLE_METRIC_JOB_CONFIG.job_id],
      },
      expected: {
        responseCode: 200,
        responseBody: [
          {
            id: SINGLE_METRIC_JOB_CONFIG.job_id,
            description: SINGLE_METRIC_JOB_CONFIG.description,
            groups: SINGLE_METRIC_JOB_CONFIG.groups,
            processed_record_count: 0,
            memory_status: 'ok',
            jobState: 'closed',
            hasDatafeed: false,
            datafeedId: '',
            datafeedIndices: [],
            datafeedState: '',
            isSingleMetricViewerJob: true,
            fullJob: {
              // Only tests against some of the fields in the fullJob property.
              job_id: SINGLE_METRIC_JOB_CONFIG.job_id,
              job_type: 'anomaly_detector',
              description: SINGLE_METRIC_JOB_CONFIG.description,
              groups: SINGLE_METRIC_JOB_CONFIG.groups,
              analysis_config: {
                bucket_span: '15m',
                detectors: [
                  {
                    detector_description: 'mean(responsetime)',
                    function: 'mean',
                    field_name: 'responsetime',
                    detector_index: 0,
                  },
                ],
                influencers: [],
              },
            },
          },
          {
            id: MULTI_METRIC_JOB_CONFIG.job_id,
            description: MULTI_METRIC_JOB_CONFIG.description,
            groups: MULTI_METRIC_JOB_CONFIG.groups,
            processed_record_count: 0,
            memory_status: 'ok',
            jobState: 'closed',
            hasDatafeed: false,
            datafeedId: '',
            datafeedIndices: [],
            datafeedState: '',
            isSingleMetricViewerJob: true,
          },
        ],
      },
    },
  ];

  const testDataListNegative = [
    {
      testTitle: 'as ML Unauthorized user',
      user: USER.ML_UNAUTHORIZED,
      requestBody: {},
      // Note that the jobs and datafeeds are loaded async so the actual error message is not deterministic.
      expected: {
        responseCode: 404,
        error: 'Not Found',
      },
    },
  ];

  async function runJobsSummaryRequest(
    user: USER,
    requestBody: object,
    expectedResponsecode: number
  ): Promise<any> {
    const { body } = await supertest
      .post('/api/ml/jobs/jobs_summary')
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_HEADERS)
      .send(requestBody)
      .expect(expectedResponsecode);

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

  function getGroups(jobs: Array<{ groups: string[] }>) {
    const groupIds: string[] = [];
    jobs.forEach(job => {
      const groups = job.groups;
      groups.forEach(group => {
        if (groupIds.indexOf(group) === -1) {
          groupIds.push(group);
        }
      });
    });
    return groupIds.sort();
  }

  describe('jobs_summary', function() {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
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

    for (const testData of testDataListNoJobId) {
      describe('gets job summary with no job IDs supplied', function() {
        it(`${testData.testTitle}`, async () => {
          const body = await runJobsSummaryRequest(
            testData.user,
            testData.requestBody,
            testData.expected.responseCode
          );

          // Validate the important parts of the response.
          const expectedResponse = testData.expected.responseBody;

          // Validate job count.
          expect(body).to.have.length(expectedResponse.length);

          // Validate job IDs.
          const expectedRspJobIds = expectedResponse
            .map((job: { id: string }) => {
              return { id: job.id };
            })
            .sort(compareById);
          const actualRspJobIds = body
            .map((job: { id: string }) => {
              return { id: job.id };
            })
            .sort(compareById);

          expect(actualRspJobIds).to.eql(expectedRspJobIds);

          // Validate created group IDs.
          const expectedRspGroupIds = getGroups(expectedResponse);
          const actualRspGroupsIds = getGroups(body);
          expect(actualRspGroupsIds).to.eql(expectedRspGroupIds);
        });
      });
    }

    for (const testData of testDataListWithJobId) {
      describe('gets job summary with job ID supplied', function() {
        it(`${testData.testTitle}`, async () => {
          const body = await runJobsSummaryRequest(
            testData.user,
            testData.requestBody,
            testData.expected.responseCode
          );

          // Validate the important parts of the response.
          const expectedResponse = testData.expected.responseBody;

          // Validate job count.
          expect(body).to.have.length(expectedResponse.length);

          // Validate job IDs.
          const expectedRspJobIds = expectedResponse
            .map((job: { id: string }) => {
              return { id: job.id };
            })
            .sort(compareById);
          const actualRspJobIds = body
            .map((job: { id: string }) => {
              return { id: job.id };
            })
            .sort(compareById);

          expect(actualRspJobIds).to.eql(expectedRspJobIds);

          // Validate created group IDs.
          const expectedRspGroupIds = getGroups(expectedResponse);
          const actualRspGroupsIds = getGroups(body);
          expect(actualRspGroupsIds).to.eql(expectedRspGroupIds);

          // Validate the response for the specified job IDs contains a fullJob property.
          const requestedJobIds = testData.requestBody.jobIds;
          for (const job of body) {
            if (requestedJobIds.includes(job.id)) {
              expect(job).to.have.property('fullJob');
            } else {
              expect(job).not.to.have.property('fullJob');
            }
          }

          for (const expectedJob of expectedResponse) {
            const expectedJobId = expectedJob.id;
            const actualJob = body.find((job: { id: string }) => job.id === expectedJobId);
            if (expectedJob.fullJob) {
              expect(actualJob).to.have.property('fullJob');
              expect(actualJob.fullJob).to.have.property('analysis_config');
              expect(actualJob.fullJob.analysis_config).to.eql(expectedJob.fullJob.analysis_config);
            } else {
              expect(actualJob).not.to.have.property('fullJob');
            }
          }
        });
      });
    }

    for (const testData of testDataListNegative) {
      describe('rejects request', function() {
        it(testData.testTitle, async () => {
          const body = await runJobsSummaryRequest(
            testData.user,
            testData.requestBody,
            testData.expected.responseCode
          );

          expect(body)
            .to.have.property('error')
            .eql(testData.expected.error);

          expect(body).to.have.property('message');
        });
      });
    }
  });
};
