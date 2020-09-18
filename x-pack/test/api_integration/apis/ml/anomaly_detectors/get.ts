/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const jobId = `fq_single_${Date.now()}`;

  async function createJobs() {
    const mockJobConfigs = [
      {
        job_id: `${jobId}_1`,
        description:
          'Single metric job based on the farequote dataset with 30m bucketspan and mean(responsetime)',
        groups: ['automated', 'farequote', 'single-metric'],
        analysis_config: {
          bucket_span: '30m',
          detectors: [{ function: 'mean', field_name: 'responsetime' }],
          influencers: [],
          summary_count_field_name: 'doc_count',
        },
        data_description: { time_field: '@timestamp' },
        analysis_limits: { model_memory_limit: '11MB' },
        model_plot_config: { enabled: true },
      },
      {
        job_id: `${jobId}_2`,
        description:
          'Another single metric job based on the farequote dataset with 30m bucketspan and mean(responsetime)',
        groups: ['automated', 'farequote', 'single-metric'],
        analysis_config: {
          bucket_span: '30m',
          detectors: [{ function: 'mean', field_name: 'responsetime' }],
          influencers: [],
          summary_count_field_name: 'doc_count',
        },
        data_description: { time_field: '@timestamp' },
        analysis_limits: { model_memory_limit: '11MB' },
        model_plot_config: { enabled: false },
      },
    ];

    for (const jobConfig of mockJobConfigs) {
      await ml.api.createAnomalyDetectionJob(jobConfig);
    }
  }

  describe('GET anomaly_detectors', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await createJobs();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    describe('GetAnomalyDetectors', () => {
      it('should fetch all anomaly detector jobs', async () => {
        const { body } = await supertest
          .get(`/api/ml/anomaly_detectors`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);

        expect(body.count).to.eql(2);
        expect(body.jobs.length).to.eql(2);
        expect(body.jobs[0].job_id).to.eql(`${jobId}_1`);
        expect(body.jobs[1].job_id).to.eql(`${jobId}_2`);
      });

      it('should not allow to retrieve jobs for the user without required permissions', async () => {
        const { body } = await supertest
          .get(`/api/ml/anomaly_detectors`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql('Not Found');
      });
    });

    describe('GetAnomalyDetectorsById', () => {
      it('should fetch single anomaly detector job by id', async () => {
        const { body } = await supertest
          .get(`/api/ml/anomaly_detectors/${jobId}_1`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);

        expect(body.count).to.eql(1);
        expect(body.jobs.length).to.eql(1);
        expect(body.jobs[0].job_id).to.eql(`${jobId}_1`);
      });

      it('should fetch anomaly detector jobs based on provided ids', async () => {
        const { body } = await supertest
          .get(`/api/ml/anomaly_detectors/${jobId}_1,${jobId}_2`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);

        expect(body.count).to.eql(2);
        expect(body.jobs.length).to.eql(2);
        expect(body.jobs[0].job_id).to.eql(`${jobId}_1`);
        expect(body.jobs[1].job_id).to.eql(`${jobId}_2`);
      });

      it('should not allow to retrieve a job for the user without required permissions', async () => {
        const { body } = await supertest
          .get(`/api/ml/anomaly_detectors/${jobId}_1`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql('Not Found');
      });
    });

    describe('GetAnomalyDetectorsStats', () => {
      it('should fetch jobs stats', async () => {
        const { body } = await supertest
          .get(`/api/ml/anomaly_detectors/_stats`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);

        expect(body.count).to.eql(2);
        expect(body.jobs.length).to.eql(2);
        expect(body.jobs[0].job_id).to.eql(`${jobId}_1`);
        expect(body.jobs[0]).to.have.keys(
          'timing_stats',
          'state',
          'forecasts_stats',
          'model_size_stats',
          'data_counts'
        );
        expect(body.jobs[1].job_id).to.eql(`${jobId}_2`);
      });

      it('should not allow to retrieve jobs stats for the user without required permissions', async () => {
        const { body } = await supertest
          .get(`/api/ml/anomaly_detectors/_stats`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql('Not Found');
      });
    });

    describe('GetAnomalyDetectorsStatsById', () => {
      it('should fetch single job stats', async () => {
        const { body } = await supertest
          .get(`/api/ml/anomaly_detectors/${jobId}_1/_stats`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);

        expect(body.count).to.eql(1);
        expect(body.jobs.length).to.eql(1);
        expect(body.jobs[0].job_id).to.eql(`${jobId}_1`);
        expect(body.jobs[0]).to.have.keys(
          'timing_stats',
          'state',
          'forecasts_stats',
          'model_size_stats',
          'data_counts'
        );
      });

      it('should fetch multiple jobs stats based on provided ids', async () => {
        const { body } = await supertest
          .get(`/api/ml/anomaly_detectors/${jobId}_1,${jobId}_2/_stats`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);

        expect(body.count).to.eql(2);
        expect(body.jobs.length).to.eql(2);
        expect(body.jobs[0].job_id).to.eql(`${jobId}_1`);
        expect(body.jobs[0]).to.have.keys(
          'timing_stats',
          'state',
          'forecasts_stats',
          'model_size_stats',
          'data_counts'
        );
        expect(body.jobs[1].job_id).to.eql(`${jobId}_2`);
      });

      it('should not allow to retrieve a job stats for the user without required permissions', async () => {
        const { body } = await supertest
          .get(`/api/ml/anomaly_detectors/${jobId}_1/_stats`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql('Not Found');
      });
    });
  });
};
