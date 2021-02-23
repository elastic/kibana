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
    allow_lazy_start: false, // default value
    max_num_threads: 1, // default value
  };

  const testJobConfigs: Array<DeepPartial<DataFrameAnalyticsConfig>> = [
    {
      id: `${jobId}_0`,
      description: 'Test start and stop for analytics',
      dest: {
        index: generateDestinationIndex(`${jobId}_0`),
        results_field: 'ml',
      },
      ...commonJobConfig,
    },
  ];

  async function createJobs(mockJobConfigs: Array<DeepPartial<DataFrameAnalyticsConfig>>) {
    for (const jobConfig of mockJobConfigs) {
      await ml.api.createDataFrameAnalyticsJob(jobConfig as DataFrameAnalyticsConfig);
    }
  }

  describe('POST data_frame/analytics', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/bm_classification');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await createJobs(testJobConfigs);
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    describe('StartDataFrameAnalyticsJob', () => {
      it('should start analytics job for specified id if job exists', async () => {
        const analyticsId = `${jobId}_0`;

        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_start`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);

        expect(body).not.to.be(undefined);
        expect(body.acknowledged).to.be(true);
        expect(body.node).not.to.be('');
      });

      it('should show 404 error if job does not exist', async () => {
        const id = `${jobId}_invalid`;
        const message = `No known job with id '${id}'`;

        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${id}/_start`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql(message);
      });

      it('should not allow to start analytics job for unauthorized user', async () => {
        const analyticsId = `${jobId}_0`;

        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_start`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS)
          .expect(403);

        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.eql('Forbidden');
      });
    });

    describe('StopsDataFrameAnalyticsJob', () => {
      it('should stop analytics job for specified id when job exists', async () => {
        const analyticsId = `${jobId}_0`;

        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_stop`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);

        expect(body).not.to.be(undefined);
        expect(body.stopped).to.be(true);
      });

      it('should show 404 error if job does not exist', async () => {
        const id = `${jobId}_invalid`;
        const message = `No known job with id '${id}'`;

        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${id}/_stop`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql(message);
      });

      it('should not allow to stop analytics job for unauthorized user', async () => {
        const analyticsId = `${jobId}_0`;

        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_stop`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS)
          .expect(403);

        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.eql('Forbidden');
      });
    });
  });
};
