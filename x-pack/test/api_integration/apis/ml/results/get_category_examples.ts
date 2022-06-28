/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Datafeed } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');
  const spacesService = getService('spaces');

  const jobIdSpace1 = `sample_logs_${Date.now()}`;
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  const PARTITION_FIELD_NAME = 'event.dataset';
  const testJobConfig = {
    job_id: jobIdSpace1,
    groups: ['sample_logs', 'bootstrap', 'categorization'],
    description: "count by mlcategory (message) on 'sample logs' dataset with 15m bucket span",
    analysis_config: {
      bucket_span: '15m',
      categorization_field_name: 'message',
      per_partition_categorization: { enabled: true, stop_on_warn: true },
      detectors: [
        {
          function: 'count',
          by_field_name: 'mlcategory',
          partition_field_name: PARTITION_FIELD_NAME,
        },
      ],
      influencers: ['mlcategory'],
    },
    analysis_limits: { model_memory_limit: '26MB' },
    data_description: { time_field: '@timestamp', time_format: 'epoch_ms' },
    model_plot_config: { enabled: false, annotations_enabled: true },
    model_snapshot_retention_days: 10,
    daily_model_snapshot_retention_after_days: 1,
    allow_lazy_open: false,
  };
  // @ts-expect-error not full interface
  const testDatafeedConfig: Datafeed = {
    datafeed_id: `datafeed-${jobIdSpace1}`,
    indices: ['ft_module_sample_logs'],
    job_id: jobIdSpace1,
    query: { bool: { must: [{ match_all: {} }] } },
  };

  const expectedCategoryExamples = {
    categoryId: '1',
    examplesLength: 3,
  };

  async function getCategoryExamples(
    jobId: string,
    categoryIds: string[],
    maxExamples: number,
    user: USER,
    expectedStatusCode: number,
    space?: string
  ) {
    const { body, status } = await supertest
      .post(`${space ? `/s/${space}` : ''}/api/ml/results/category_examples`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send({ jobId, categoryIds, maxExamples });
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('get category_examples', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/module_sample_logs');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      await ml.api.createAndRunAnomalyDetectionLookbackJob(
        // @ts-expect-error not full interface
        testJobConfig,
        testDatafeedConfig,
        idSpace1
      );
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
    });

    it('should produce the correct 1 example for the job', async () => {
      const maxExamples = 1;
      const resp = await getCategoryExamples(
        jobIdSpace1,
        [expectedCategoryExamples.categoryId],
        maxExamples,
        USER.ML_POWERUSER,
        200,
        idSpace1
      );

      expect(resp[expectedCategoryExamples.categoryId].length).to.eql(
        maxExamples,
        `response examples length should be ${maxExamples} (got ${
          resp[expectedCategoryExamples.categoryId].length
        })`
      );
    });

    it('should produce the correct 3 examples for the job', async () => {
      const resp = await getCategoryExamples(
        jobIdSpace1,
        [expectedCategoryExamples.categoryId],
        expectedCategoryExamples.examplesLength,
        USER.ML_POWERUSER,
        200,
        idSpace1
      );

      expect(resp[expectedCategoryExamples.categoryId].length).to.eql(
        expectedCategoryExamples.examplesLength,
        `response examples length should be ${expectedCategoryExamples.examplesLength} (got ${
          resp[expectedCategoryExamples.categoryId].length
        })`
      );
    });

    it('should not produce the correct examples for the job in the wrong space', async () => {
      await getCategoryExamples(
        jobIdSpace1,
        [expectedCategoryExamples.categoryId],
        expectedCategoryExamples.examplesLength,
        USER.ML_POWERUSER,
        404,
        idSpace2
      );
    });

    it('should produce the correct example for the job for the ml viewer user', async () => {
      const resp = await getCategoryExamples(
        jobIdSpace1,
        [expectedCategoryExamples.categoryId],
        expectedCategoryExamples.examplesLength,
        USER.ML_VIEWER,
        200,
        idSpace1
      );

      expect(resp[expectedCategoryExamples.categoryId].length).to.eql(
        expectedCategoryExamples.examplesLength,
        `response examples length should be ${expectedCategoryExamples.examplesLength} (got ${
          resp[expectedCategoryExamples.categoryId].length
        })`
      );
    });

    it('should not produce the correct example for the job for the ml unauthorized user', async () => {
      await getCategoryExamples(
        jobIdSpace1,
        [expectedCategoryExamples.categoryId],
        expectedCategoryExamples.examplesLength,
        USER.ML_UNAUTHORIZED,
        403,
        idSpace1
      );
    });
  });
};
