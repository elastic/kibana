/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/machine_learning/security_common';
import { DataFrameAnalyticsConfig } from '../../../../../plugins/ml/public/application/data_frame_analytics/common';
import { DeepPartial } from '../../../../../plugins/ml/common/types/common';
const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

export default ({ getService }: FtrProviderContext) => {
  const es = getService('legacyEs');
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const jobId = `bm_${Date.now()}`;
  const generateDestinationIndex = (analyticsId: string) => `user-${analyticsId}_1`;
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
    model_memory_limit: '350mb',
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

  async function jobDeleted(analyticsId: string) {
    return await supertest
      .get(`/api/ml/data_frame/analytics/${analyticsId}`)
      .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
      .set(COMMON_HEADERS)
      .expect(404);
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
        const { body } = await supertest
          .delete(`/api/ml/data_frame/analytics/${jobId}_1`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_HEADERS)
          .expect(200);
        expect(body.analyticsJobDeleted.success).to.eql(true);
      });

      it('should not allow to retrieve analytics jobs for the user without required permissions', async () => {
        const { body } = await supertest
          .delete(`/api/ml/data_frame/analytics/${jobId}_2`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_HEADERS)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql('Not Found');

        const { body: body2 } = await supertest
          .delete(`/api/ml/data_frame/analytics/${jobId}_2`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_HEADERS)
          .expect(404);

        expect(body2.error).to.eql('Not Found');
        expect(body2.message).to.eql('Not Found');
      });

      it('should show 404 error if job does not exist or has already been deleted', async () => {
        const { body } = await supertest
          .delete(`/api/ml/data_frame/analytics/${jobId}_invalid`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_HEADERS)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql('Not Found');
      });

      describe('with deleteTargetIndex setting', function () {
        const analyticsId = `${jobId}_2`;
        const destinationIndex = generateDestinationIndex(analyticsId);

        before(async () => {
          await es.indices.create({ index: destinationIndex });
          await ml.api.assertIndicesExist(generateDestinationIndex(analyticsId));
        });

        after(async () => {
          await es.indices.delete({ index: destinationIndex, ignore: [404] });
        });

        it('should delete job and target index by id', async () => {
          const { body } = await supertest
            .delete(`/api/ml/data_frame/analytics/${analyticsId}`)
            .query({ deleteTargetIndex: true })
            .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
            .set(COMMON_HEADERS)
            .expect(200);

          expect(body.analyticsJobDeleted.success).to.eql(true);
          expect(body.targetIndexDeleted.success).to.eql(true);
          expect(body.targetIndexPatternDeleted.success).to.eql(false);
          expect(jobDeleted(analyticsId)).to.eql(true);

          const targetIndexExists = await es.indices.exists({
            index: destinationIndex,
            allowNoIndices: false,
          });
          expect(targetIndexExists).to.eql(false);
        });
      });
      describe('with deleteTargetIndex setting', function () {
        const analyticsId = `${jobId}_3`;
        const destinationIndex = generateDestinationIndex(analyticsId);

        before(async () => {
          // Mimic real job by creating index pattern after job is created
          await ml.testResources.createIndexPatternIfNeeded(destinationIndex);
        });

        after(async () => {
          await ml.testResources.deleteIndexPattern(destinationIndex);
        });

        it('should delete job and index pattern by id', async () => {
          const { body } = await supertest
            .delete(`/api/ml/data_frame/analytics/${analyticsId}`)
            .query({ deleteIndexPattern: true })
            .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
            .set(COMMON_HEADERS)
            .expect(200);
          expect(body.analyticsJobDeleted.success).to.eql(true);
          expect(body.targetIndexDeleted.success).to.eql(false);
          expect(body.targetIndexPatternDeleted.success).to.eql(true);
          expect(jobDeleted(analyticsId)).to.eql(true);

          // Check if index pattern was deleted
          const indexPatternId = await ml.testResources.getIndexPatternId(analyticsId);
          expect(indexPatternId).to.eql(undefined);
        });
      });

      describe('with deleteTargetIndex & deleteTargetIndex setting', function () {
        const analyticsId = `${jobId}_4`;
        const destinationIndex = generateDestinationIndex(analyticsId);

        before(async () => {
          await es.indices.create({ index: destinationIndex });
          await ml.api.assertIndicesExist(generateDestinationIndex(analyticsId));

          // Mimic real job by creating index pattern after job is created
          await ml.testResources.createIndexPatternIfNeeded(destinationIndex);
        });

        after(async () => {
          await es.indices.delete({ index: destinationIndex, ignore: [404] });
          await ml.testResources.deleteIndexPattern(destinationIndex);
        });

        it('deletes job, target index, and index pattern by id', async () => {
          // Mimic real job by creating target index & index pattern after DFA job is created
          const { body } = await supertest
            .delete(`/api/ml/data_frame/analytics/${analyticsId}`)
            .query({ deleteTargetIndex: true, deleteIndexPattern: true })
            .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
            .set(COMMON_HEADERS)
            .expect(200);
          expect(body.analyticsJobDeleted.success).to.eql(true);
          expect(body.targetIndexDeleted.success).to.eql(true);
          expect(body.targetIndexPatternDeleted.success).to.eql(true);

          // Check if index was deleted
          expect(jobDeleted(analyticsId)).to.eql(true);

          // Check if target index was deleted
          const targetIndexExists = await es.indices.exists({
            index: destinationIndex,
            allowNoIndices: false,
          });
          expect(targetIndexExists).to.eql(false);

          // Check if index pattern was deleted
          const indexPatternId = await ml.testResources.getIndexPatternId(analyticsId);
          expect(indexPatternId).to.eql(undefined);
        });
      });
    });
  });
};
