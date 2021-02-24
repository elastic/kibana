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
        training_percent: 80, // increase to ensure slow running job
      },
    },
    analyzed_fields: {
      includes: [],
      excludes: [],
    },
    model_memory_limit: '80mb',
    allow_lazy_start: false, // default value
    max_num_threads: 1, // default value
  };

  const analyticsId = `${jobId}_1`;
  const destinationIndex = generateDestinationIndex(analyticsId);

  const testJobConfigs: Array<DeepPartial<DataFrameAnalyticsConfig>> = [
    {
      id: analyticsId,
      description: 'Test stop for analytics',
      dest: {
        index: destinationIndex,
        results_field: 'ml',
      },
      ...commonJobConfig,
    },
  ];

  async function createJobs(mockJobConfigs: Array<DeepPartial<DataFrameAnalyticsConfig>>) {
    for (const jobConfig of mockJobConfigs) {
      if (jobConfig) {
        await ml.api.createDataFrameAnalyticsJob(jobConfig as DataFrameAnalyticsConfig);
        await ml.api.runDFAJob(jobConfig.id!);
      }
    }
  }

  describe('POST data_frame/analytics/{analyticsId}/_stop', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/bm_classification');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await createJobs(testJobConfigs);
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.api.deleteIndices(destinationIndex);
    });

    describe('StopsDataFrameAnalyticsJob', () => {
      it('should stop analytics job for specified id when job exists', async () => {
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
        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_stop`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS)
          .expect(403);

        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.eql('Forbidden');
      });

      it('should not allow to stop analytics job for user with view only permission', async () => {
        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_stop`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(403);

        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.eql('Forbidden');
      });
    });
  });
};
