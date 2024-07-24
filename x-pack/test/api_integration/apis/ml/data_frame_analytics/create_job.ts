/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  type DataFrameAnalyticsConfig,
  ANALYSIS_CONFIG_TYPE,
} from '@kbn/ml-data-frame-analytics-utils';
import { DeepPartial } from '@kbn/ml-plugin/common/types/common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

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

  const jobTypes = Object.values(ANALYSIS_CONFIG_TYPE);
  type JobType = (typeof jobTypes)[number];
  const jobAnalyses = {
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
    jobType: JobType;
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
            .put(`/internal/ml/data_frame/analytics/${analyticsId}`)
            .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
            .set(getCommonRequestHeader('1'))
            .send(requestBody);
          ml.api.assertResponseStatusCode(200, status, body);

          expect(body).not.to.be(undefined);

          expect(body.dataFrameAnalyticsJobsCreated).to.have.length(
            1,
            `Expected dataFrameAnalyticsJobsCreated length to be 1, got ${body.dataFrameAnalyticsJobsCreated}.`
          );
          expect(body.dataFrameAnalyticsJobsErrors).to.have.length(
            0,
            `Expected dataFrameAnalyticsJobsErrors length to be 0, got ${body.dataFrameAnalyticsJobsErrors}.`
          );
          expect(body.dataViewsCreated).to.have.length(
            0,
            `Expected dataViewsCreated length to be 0, got ${body.dataViewsCreated}.`
          );
          expect(body.dataViewsErrors).to.have.length(
            0,
            `Expected dataViewsErrors length to be 0, got ${body.dataViewsErrors}.`
          );
        });

        it(`should create ${testConfig.jobType} job and data view with given config`, async () => {
          const analyticsId = `${testConfig.jobId}_with_data_view`;
          const requestBody = testConfig.config;

          const { body, status } = await supertest
            .put(
              `/internal/ml/data_frame/analytics/${analyticsId}?createDataView=true&timeFieldName=@timestamp`
            )
            .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
            .set(getCommonRequestHeader('1'))
            .send(requestBody);
          ml.api.assertResponseStatusCode(200, status, body);

          expect(body).not.to.be(undefined);

          expect(body.dataFrameAnalyticsJobsCreated).to.have.length(
            1,
            `Expected dataFrameAnalyticsJobsCreated length to be 1, got ${body.dataFrameAnalyticsJobsCreated}.`
          );
          expect(body.dataFrameAnalyticsJobsErrors).to.have.length(
            0,
            `Expected dataFrameAnalyticsJobsErrors length to be 0, got ${body.dataFrameAnalyticsJobsErrors}.`
          );
          expect(body.dataViewsCreated).to.have.length(
            1,
            `Expected dataViewsCreated length to be 1, got ${body.dataViewsCreated}.`
          );
          expect(body.dataViewsErrors).to.have.length(
            0,
            `Expected dataViewsErrors length to be 0, got ${body.dataViewsErrors}.`
          );
        });
      });

      it('should not allow analytics job creation for unauthorized user', async () => {
        const analyticsId = `${testJobConfigs[0].jobId}`;
        const requestBody = testJobConfigs[0].config;

        const { body, status } = await supertest
          .put(`/internal/ml/data_frame/analytics/${analyticsId}`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(getCommonRequestHeader('1'))
          .send(requestBody);
        ml.api.assertResponseStatusCode(403, status, body);

        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.eql('Forbidden');
      });

      it('should not allow analytics job creation for the user with only view permission', async () => {
        const analyticsId = `${testJobConfigs[0].jobId}`;
        const requestBody = testJobConfigs[0].config;

        const { body, status } = await supertest
          .put(`/internal/ml/data_frame/analytics/${analyticsId}`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(getCommonRequestHeader('1'))
          .send(requestBody);
        ml.api.assertResponseStatusCode(403, status, body);

        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.eql('Forbidden');
      });
    });
  });
};
