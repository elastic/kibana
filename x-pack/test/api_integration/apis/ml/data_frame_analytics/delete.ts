/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { DataFrameAnalyticsConfig } from '../../../../../plugins/ml/public/application/data_frame_analytics/common';
import { DeepPartial } from '../../../../../plugins/ml/common/types/common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common';

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
  };

  const testJobConfigs: Array<DeepPartial<DataFrameAnalyticsConfig>> = [
    'Test delete job only',
    'Test delete job and target index',
    'Test delete job and index pattern',
    'Test delete job, target index, and index pattern',
  ].map((description, idx) => {
    const analyticsId = `${jobId}_${idx + 1}`;
    return {
      id: analyticsId,
      description,
      dest: {
        index: generateDestinationIndex(analyticsId),
        results_field: 'ml',
      },
      ...commonJobConfig,
    };
  });

  async function createJobs(mockJobConfigs: Array<DeepPartial<DataFrameAnalyticsConfig>>) {
    for (const jobConfig of mockJobConfigs) {
      await ml.api.createDataFrameAnalyticsJob(jobConfig as DataFrameAnalyticsConfig);
    }
  }

  describe('DELETE data_frame/analytics', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/bm_classification');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await createJobs(testJobConfigs);
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    describe('DeleteDataFrameAnalytics', () => {
      it('should delete analytics jobs by id', async () => {
        const analyticsId = `${jobId}_1`;
        const { body } = await supertest
          .delete(`/api/ml/data_frame/analytics/${analyticsId}`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);

        expect(body.analyticsJobDeleted.success).to.eql(true);
        await ml.api.waitForDataFrameAnalyticsJobNotToExist(analyticsId);
      });

      it('should not allow to retrieve analytics jobs for unauthorized user', async () => {
        const analyticsId = `${jobId}_2`;
        const { body } = await supertest
          .delete(`/api/ml/data_frame/analytics/${analyticsId}`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql('Not Found');
        await ml.api.waitForDataFrameAnalyticsJobToExist(analyticsId);
      });

      it('should not allow to retrieve analytics jobs for the user with only view permission', async () => {
        const analyticsId = `${jobId}_2`;
        const { body } = await supertest
          .delete(`/api/ml/data_frame/analytics/${analyticsId}`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql('Not Found');
        await ml.api.waitForDataFrameAnalyticsJobToExist(analyticsId);
      });

      it('should show 404 error if job does not exist or has already been deleted', async () => {
        const { body } = await supertest
          .delete(`/api/ml/data_frame/analytics/${jobId}_invalid`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql('Not Found');
      });

      describe('with deleteDestIndex setting', function () {
        const analyticsId = `${jobId}_2`;
        const destinationIndex = generateDestinationIndex(analyticsId);

        before(async () => {
          await ml.api.createIndices(destinationIndex);
          await ml.api.assertIndicesExist(destinationIndex);
        });

        after(async () => {
          await ml.api.deleteIndices(destinationIndex);
        });

        it('should delete job and destination index by id', async () => {
          const { body } = await supertest
            .delete(`/api/ml/data_frame/analytics/${analyticsId}`)
            .query({ deleteDestIndex: true })
            .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
            .set(COMMON_REQUEST_HEADERS)
            .expect(200);

          expect(body.analyticsJobDeleted.success).to.eql(true);
          expect(body.destIndexDeleted.success).to.eql(true);
          expect(body.destIndexPatternDeleted.success).to.eql(false);
          await ml.api.waitForDataFrameAnalyticsJobNotToExist(analyticsId);
          await ml.api.assertIndicesNotToExist(destinationIndex);
        });
      });

      describe('with deleteDestIndexPattern setting', function () {
        const analyticsId = `${jobId}_3`;
        const destinationIndex = generateDestinationIndex(analyticsId);

        before(async () => {
          // Mimic real job by creating index pattern after job is created
          await ml.testResources.createIndexPatternIfNeeded(destinationIndex);
        });

        after(async () => {
          await ml.testResources.deleteIndexPatternByTitle(destinationIndex);
        });

        it('should delete job and index pattern by id', async () => {
          const { body } = await supertest
            .delete(`/api/ml/data_frame/analytics/${analyticsId}`)
            .query({ deleteDestIndexPattern: true })
            .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
            .set(COMMON_REQUEST_HEADERS)
            .expect(200);

          expect(body.analyticsJobDeleted.success).to.eql(true);
          expect(body.destIndexDeleted.success).to.eql(false);
          expect(body.destIndexPatternDeleted.success).to.eql(true);
          await ml.api.waitForDataFrameAnalyticsJobNotToExist(analyticsId);
          await ml.testResources.assertIndexPatternNotExist(destinationIndex);
        });
      });

      describe('with deleteDestIndex & deleteDestIndexPattern setting', function () {
        const analyticsId = `${jobId}_4`;
        const destinationIndex = generateDestinationIndex(analyticsId);

        before(async () => {
          // Mimic real job by creating target index & index pattern after DFA job is created
          await ml.api.createIndices(destinationIndex);
          await ml.api.assertIndicesExist(destinationIndex);
          await ml.testResources.createIndexPatternIfNeeded(destinationIndex);
        });

        after(async () => {
          await ml.api.deleteIndices(destinationIndex);
          await ml.testResources.deleteIndexPatternByTitle(destinationIndex);
        });

        it('should delete job, target index, and index pattern by id', async () => {
          const { body } = await supertest
            .delete(`/api/ml/data_frame/analytics/${analyticsId}`)
            .query({ deleteDestIndex: true, deleteDestIndexPattern: true })
            .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
            .set(COMMON_REQUEST_HEADERS)
            .expect(200);

          expect(body.analyticsJobDeleted.success).to.eql(true);
          expect(body.destIndexDeleted.success).to.eql(true);
          expect(body.destIndexPatternDeleted.success).to.eql(true);
          await ml.api.waitForDataFrameAnalyticsJobNotToExist(analyticsId);
          await ml.api.assertIndicesNotToExist(destinationIndex);
          await ml.testResources.assertIndexPatternNotExist(destinationIndex);
        });
      });
    });
  });
};
