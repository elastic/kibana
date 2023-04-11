/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { DataFrameAnalyticsConfig } from '../../../../../plugins/ml/public/application/data_frame_analytics/common';
import { DeepPartial } from '../../../../../plugins/ml/common/types/common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const jobId = `bm_${Date.now()}`;
  const generateDestinationIndex = (analyticsId: string) => `user-${analyticsId}`;
  const commonJobConfig = {
    source: {
      index: ['ft_bank_marketing'],
      query: {
        match_all: {},
      },
    },
    analyzed_fields: {
      includes: [],
      excludes: [],
    },
    model_memory_limit: '60mb',
    allow_lazy_start: false, // default value
    max_num_threads: 1, // default value
  };

  const jobTypes = ['classification', 'regression', 'outlier_detection'];
  const jobAnalyses: any = {
    classification: {
      dependent_variable: 'y',
      training_percent: 20,
    },
    regression: {
      dependent_variable: 'y',
      training_percent: 20,
    },
    outlier_detection: {
      compute_feature_influence: true,
      standardization_enabled: true,
    },
  };

  const testJobConfigs: Array<{
    jobId: string;
    jobType: string;
    config: DeepPartial<DataFrameAnalyticsConfig>;
  }> = ['Test classification job', 'Test regression job', 'Test outlier detection job'].map(
    (description, idx) => {
      const analyticsId = `${jobId}_${idx}`;
      const jobType = jobTypes[idx];
      return {
        jobId: analyticsId,
        jobType,
        config: {
          description,
          dest: {
            index: generateDestinationIndex(analyticsId),
            results_field: 'ml',
          },
          analysis: { [jobType]: jobAnalyses[jobType] },
          ...commonJobConfig,
        },
      };
    }
  );

  describe('PUT data_frame/analytics/{analyticsId}', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/bm_classification');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    describe('CreateDataFrameAnalytics', () => {
      testJobConfigs.forEach((testConfig) => {
        it(`should create ${testConfig.jobType} job with given config`, async () => {
          const analyticsId = `${testConfig.jobId}`;
          const requestBody = testConfig.config;

          const { body, status } = await supertest
            .put(`/api/ml/data_frame/analytics/${analyticsId}`)
            .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
            .set(COMMON_REQUEST_HEADERS)
            .send(requestBody);
          ml.api.assertResponseStatusCode(200, status, body);

          expect(body).not.to.be(undefined);

          expect(body.description).to.eql(requestBody.description);
          expect(body.allow_lazy_start).to.eql(requestBody.allow_lazy_start);
          expect(body.model_memory_limit).to.eql(requestBody.model_memory_limit);
          expect(body.max_num_threads).to.eql(requestBody.max_num_threads);

          expect(Object.keys(body.analysis)).to.eql(Object.keys(requestBody.analysis!));
        });
      });

      it('should not allow analytics job creation for unauthorized user', async () => {
        const analyticsId = `${testJobConfigs[0].jobId}`;
        const requestBody = testJobConfigs[0].config;

        const { body, status } = await supertest
          .put(`/api/ml/data_frame/analytics/${analyticsId}`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS)
          .send(requestBody);
        ml.api.assertResponseStatusCode(403, status, body);

        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.eql('Forbidden');
      });

      it('should not allow analytics job creation for the user with only view permission', async () => {
        const analyticsId = `${testJobConfigs[0].jobId}`;
        const requestBody = testJobConfigs[0].config;

        const { body, status } = await supertest
          .put(`/api/ml/data_frame/analytics/${analyticsId}`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .send(requestBody);
        ml.api.assertResponseStatusCode(403, status, body);

        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.eql('Forbidden');
      });
    });
  });
};
