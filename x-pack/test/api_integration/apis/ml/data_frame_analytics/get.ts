/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { DataFrameAnalyticsConfig } from '../../../../../plugins/ml/public/application/data_frame_analytics/common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/machine_learning/security_common';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const timestamp = Date.now();

  async function createJobs() {
    const mockJobConfigs: Array<{
      suiteTitle: string;
      archive: string;
      indexPattern: { name: string; timeField: string };
      job: DataFrameAnalyticsConfig;
    }> = [
      {
        suiteTitle: 'classification job supported by the form',
        archive: 'ml/bm_classification',
        indexPattern: { name: 'ft_bank_marketing', timeField: '@timestamp' },
        job: {
          id: `bm_1_${timestamp}`,
          description:
            "Classification job based on 'ft_bank_marketing' dataset with dependentVariable 'y' and trainingPercent '20'",
          source: {
            index: ['ft_bank_marketing'],
            query: {
              match_all: {},
            },
          },
          dest: {
            index: `user-bm_1_${timestamp}`,
            results_field: 'ml',
          },
          analysis: {
            classification: {
              dependent_variable: 'y',
              training_percent: 20,
            },
          },
          analyzed_fields: {
            includes: [],
            excludes: [],
          },
          model_memory_limit: '350mb',
          create_time: 12345,
          version: 'version-1',
          allow_lazy_start: false,
        },
      },
      {
        suiteTitle: 'outlier detection job supported by the form',
        archive: 'ml/ihp_outlier',
        indexPattern: { name: 'ft_ihp_outlier', timeField: '@timestamp' },
        job: {
          id: `ihp_1_${timestamp}`,
          description: 'This is the job description',
          source: {
            index: ['ft_ihp_outlier'],
            query: {
              match_all: {},
            },
          },
          dest: {
            index: `user-ihp_1_${timestamp}`,
            results_field: 'ml',
          },
          analysis: {
            outlier_detection: {},
          },
          analyzed_fields: {
            includes: [],
            excludes: [],
          },
          model_memory_limit: '55mb',
          create_time: 12345,
          version: 'version-1',
          allow_lazy_start: false,
        },
      },
      {
        suiteTitle: 'regression job supported by the form',
        archive: 'ml/egs_regression',
        indexPattern: { name: 'ft_egs_regression', timeField: '@timestamp' },
        job: {
          id: `egs_1_${timestamp}`,
          description: 'This is the job description',
          source: {
            index: ['ft_egs_regression'],
            query: {
              match_all: {},
            },
          },
          dest: {
            index: `user-egs_1_${timestamp}`,
            results_field: 'ml',
          },
          analysis: {
            regression: {
              dependent_variable: 'stab',
              training_percent: 20,
            },
          },
          analyzed_fields: {
            includes: [],
            excludes: [],
          },
          model_memory_limit: '105mb',
          create_time: 12345,
          version: 'version-1',
          allow_lazy_start: false,
        },
      },
    ];

    for (const job of mockJobConfigs) {
      await esArchiver.loadIfNeeded(job.archive);
      await ml.api.createDataFrameAnalyticsJob(job.job);
    }
  }

  describe('GET analytics', () => {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await createJobs();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    describe('GetAnalytics', () => {
      it('should fetch all analytics jobs', async () => {
        const { body } = await supertest
          .get(`/api/ml/data_frame/analytics`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_HEADERS)
          .expect(200);
        // console.log('------ BODY! ------', JSON.stringify(body, null, 2)); // remove
        expect(body.count).to.eql(3);
        expect(body.jobs.length).to.eql(3);
        // expect(body.jobs[0].job_id).to.eql(`${jobId}_1`);
        // expect(body.jobs[1].job_id).to.eql(`${jobId}_2`);
      });

      // it('should not allow to retrieve jobs for the user without required permissions', async () => {
      //   const { body } = await supertest
      //     .get(`/api/ml/anomaly_detectors`)
      //     .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
      //     .set(COMMON_HEADERS)
      //     .expect(404);

      //   expect(body.error).to.eql('Not Found');
      //   expect(body.message).to.eql('Not Found');
      // });
    });

    // describe('GetAnomalyDetectorsById', () => {
    //   it('should fetch single anomaly detector job by id', async () => {
    //     const { body } = await supertest
    //       .get(`/api/ml/anomaly_detectors/${jobId}_1`)
    //       .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
    //       .set(COMMON_HEADERS)
    //       .expect(200);

    //     expect(body.count).to.eql(1);
    //     expect(body.jobs.length).to.eql(1);
    //     expect(body.jobs[0].job_id).to.eql(`${jobId}_1`);
    //   });

    //   it('should fetch anomaly detector jobs based on provided ids', async () => {
    //     const { body } = await supertest
    //       .get(`/api/ml/anomaly_detectors/${jobId}_1,${jobId}_2`)
    //       .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
    //       .set(COMMON_HEADERS)
    //       .expect(200);

    //     expect(body.count).to.eql(2);
    //     expect(body.jobs.length).to.eql(2);
    //     expect(body.jobs[0].job_id).to.eql(`${jobId}_1`);
    //     expect(body.jobs[1].job_id).to.eql(`${jobId}_2`);
    //   });

    //   it('should not allow to retrieve a job for the user without required permissions', async () => {
    //     const { body } = await supertest
    //       .get(`/api/ml/anomaly_detectors/${jobId}_1`)
    //       .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
    //       .set(COMMON_HEADERS)
    //       .expect(404);

    //     expect(body.error).to.eql('Not Found');
    //     expect(body.message).to.eql('Not Found');
    //   });
    // });

    // describe('GetAnomalyDetectorsStats', () => {
    //   it('should fetch jobs stats', async () => {
    //     const { body } = await supertest
    //       .get(`/api/ml/anomaly_detectors/_stats`)
    //       .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
    //       .set(COMMON_HEADERS)
    //       .expect(200);

    //     expect(body.count).to.eql(2);
    //     expect(body.jobs.length).to.eql(2);
    //     expect(body.jobs[0].job_id).to.eql(`${jobId}_1`);
    //     expect(body.jobs[0]).to.keys(
    //       'timing_stats',
    //       'state',
    //       'forecasts_stats',
    //       'model_size_stats',
    //       'data_counts'
    //     );
    //     expect(body.jobs[1].job_id).to.eql(`${jobId}_2`);
    //   });

    //   it('should not allow to retrieve jobs stats for the user without required permissions', async () => {
    //     const { body } = await supertest
    //       .get(`/api/ml/anomaly_detectors/_stats`)
    //       .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
    //       .set(COMMON_HEADERS)
    //       .expect(404);

    //     expect(body.error).to.eql('Not Found');
    //     expect(body.message).to.eql('Not Found');
    //   });
    // });

    //   describe('GetAnomalyDetectorsStatsById', () => {
    //     it('should fetch single job stats', async () => {
    //       const { body } = await supertest
    //         .get(`/api/ml/anomaly_detectors/${jobId}_1/_stats`)
    //         .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
    //         .set(COMMON_HEADERS)
    //         .expect(200);

    //       expect(body.count).to.eql(1);
    //       expect(body.jobs.length).to.eql(1);
    //       expect(body.jobs[0].job_id).to.eql(`${jobId}_1`);
    //       expect(body.jobs[0]).to.keys(
    //         'timing_stats',
    //         'state',
    //         'forecasts_stats',
    //         'model_size_stats',
    //         'data_counts'
    //       );
    //     });

    //     it('should fetch multiple jobs stats based on provided ids', async () => {
    //       const { body } = await supertest
    //         .get(`/api/ml/anomaly_detectors/${jobId}_1,${jobId}_2/_stats`)
    //         .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
    //         .set(COMMON_HEADERS)
    //         .expect(200);

    //       expect(body.count).to.eql(2);
    //       expect(body.jobs.length).to.eql(2);
    //       expect(body.jobs[0].job_id).to.eql(`${jobId}_1`);
    //       expect(body.jobs[0]).to.keys(
    //         'timing_stats',
    //         'state',
    //         'forecasts_stats',
    //         'model_size_stats',
    //         'data_counts'
    //       );
    //       expect(body.jobs[1].job_id).to.eql(`${jobId}_2`);
    //     });

    //     it('should not allow to retrieve a job stats for the user without required permissions', async () => {
    //       const { body } = await supertest
    //         .get(`/api/ml/anomaly_detectors/${jobId}_1/_stats`)
    //         .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
    //         .set(COMMON_HEADERS)
    //         .expect(404);

    //       expect(body.error).to.eql('Not Found');
    //       expect(body.message).to.eql('Not Found');
    //     });
    //   });
  });
};
