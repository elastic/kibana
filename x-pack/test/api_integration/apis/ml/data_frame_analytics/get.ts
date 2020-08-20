/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { DataFrameAnalyticsConfig } from '../../../../../plugins/ml/public/application/data_frame_analytics/common';
import { DeepPartial } from '../../../../../plugins/ml/common/types/common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const jobId = `bm_${Date.now()}`;

  async function createJobs() {
    const mockJobConfigs: Array<DeepPartial<DataFrameAnalyticsConfig>> = [
      {
        id: `${jobId}_1`,
        description:
          "Classification job based on 'ft_bank_marketing' dataset with dependentVariable 'y' and trainingPercent '20'",
        source: {
          index: ['ft_bank_marketing'],
          query: {
            match_all: {},
          },
        },
        dest: {
          index: `user-${jobId}_1`,
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
        model_memory_limit: '60mb',
      },
      {
        id: `${jobId}_2`,
        description:
          "Regression job based on 'ft_bank_marketing' dataset with dependentVariable 'duration' and trainingPercent '20'",
        source: {
          index: ['ft_bank_marketing'],
          query: {
            match_all: {},
          },
        },
        dest: {
          index: `user-${jobId}_2`,
          results_field: 'ml',
        },
        analysis: {
          regression: {
            dependent_variable: 'duration',
            training_percent: 20,
          },
        },
        analyzed_fields: {
          includes: [],
          excludes: [],
        },
        model_memory_limit: '60mb',
      },
    ];

    for (const jobConfig of mockJobConfigs) {
      await ml.api.createDataFrameAnalyticsJob(jobConfig as DataFrameAnalyticsConfig);
    }
  }

  describe('GET data_frame/analytics', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/bm_classification');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await createJobs();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    describe('GetDataFrameAnalytics', () => {
      it('should fetch all analytics jobs', async () => {
        const { body } = await supertest
          .get(`/api/ml/data_frame/analytics`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);
        expect(body.count).to.eql(2);
        expect(body.data_frame_analytics.length).to.eql(2);
        expect(body.data_frame_analytics[0].id).to.eql(`${jobId}_1`);
        expect(body.data_frame_analytics[1].id).to.eql(`${jobId}_2`);
      });

      it('should not allow to retrieve analytics jobs for the user without required permissions', async () => {
        const { body } = await supertest
          .get(`/api/ml/data_frame/analytics`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql('Not Found');
      });
    });

    describe('GetDataFrameAnalyticsById', () => {
      it('should fetch single analytics job by id', async () => {
        const { body } = await supertest
          .get(`/api/ml/data_frame/analytics/${jobId}_1`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);

        expect(body.count).to.eql(1);
        expect(body.data_frame_analytics.length).to.eql(1);
        expect(body.data_frame_analytics[0].id).to.eql(`${jobId}_1`);
      });

      it('should fetch analytics jobs based on provided ids', async () => {
        const { body } = await supertest
          .get(`/api/ml/data_frame/analytics/${jobId}_1,${jobId}_2`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);

        expect(body.count).to.eql(2);
        expect(body.data_frame_analytics.length).to.eql(2);
        expect(body.data_frame_analytics[0].id).to.eql(`${jobId}_1`);
        expect(body.data_frame_analytics[1].id).to.eql(`${jobId}_2`);
      });

      it('should not allow to retrieve a job for the user without required permissions', async () => {
        const { body } = await supertest
          .get(`/api/ml/data_frame/analytics/${jobId}_1`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql('Not Found');
      });
    });

    describe('GetDataFrameAnalyticsStats', () => {
      it('should fetch analytics jobs stats', async () => {
        const { body } = await supertest
          .get(`/api/ml/data_frame/analytics/_stats`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);

        expect(body.count).to.eql(2);
        expect(body.data_frame_analytics.length).to.eql(2);
        expect(body.data_frame_analytics[0].id).to.eql(`${jobId}_1`);
        expect(body.data_frame_analytics[0]).to.have.keys(
          'id',
          'state',
          'progress',
          'data_counts',
          'memory_usage'
        );
        expect(body.data_frame_analytics[1].id).to.eql(`${jobId}_2`);
      });

      it('should not allow to retrieve jobs stats for the user without required permissions', async () => {
        const { body } = await supertest
          .get(`/api/ml/data_frame/analytics/_stats`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql('Not Found');
      });
    });

    describe('GetDataFrameAnalyticsStatsById', () => {
      it('should fetch single analytics job stats by id', async () => {
        const { body } = await supertest
          .get(`/api/ml/data_frame/analytics/${jobId}_1/_stats`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);
        expect(body.count).to.eql(1);
        expect(body.data_frame_analytics.length).to.eql(1);
        expect(body.data_frame_analytics[0].id).to.eql(`${jobId}_1`);
        expect(body.data_frame_analytics[0]).to.have.keys(
          'id',
          'state',
          'progress',
          'data_counts',
          'memory_usage'
        );
      });

      it('should fetch multiple analytics jobs stats based on provided ids', async () => {
        const { body } = await supertest
          .get(`/api/ml/data_frame/analytics/${jobId}_1,${jobId}_2/_stats`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);
        expect(body.count).to.eql(2);
        expect(body.data_frame_analytics.length).to.eql(2);
        expect(body.data_frame_analytics[0].id).to.eql(`${jobId}_1`);
        expect(body.data_frame_analytics[0]).to.have.keys(
          'id',
          'state',
          'progress',
          'data_counts',
          'memory_usage'
        );
        expect(body.data_frame_analytics[1].id).to.eql(`${jobId}_2`);
      });

      it('should not allow to retrieve a job stats for the user without required permissions', async () => {
        const { body } = await supertest
          .get(`/api/ml/data_frame/analytics/${jobId}_1/_stats`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS)
          .expect(404);
        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql('Not Found');
      });
    });
  });
};
