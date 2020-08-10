/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Datafeed, Job } from '../../../../../plugins/ml/common/types/anomaly_detection_jobs';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testJobId = `sample_logs_${Date.now()}`;
  const PARTITION_FIELD_NAME = 'event.dataset';

  interface TestConfig {
    testDescription: string;
    jobId: string;
    jobConfig: Job;
    datafeedConfig: Datafeed;
  }
  const setupTestConfigs = (jobId: string, stopOnWarn: boolean): TestConfig => {
    const commonJobConfig = {
      groups: ['sample_logs', 'bootstrap', 'categorization'],
      description: "count by mlcategory (message) on 'sample logs' dataset with 15m bucket span",
      analysis_limits: { model_memory_limit: '26MB' },
      data_description: { time_field: '@timestamp', time_format: 'epoch_ms' },
      model_snapshot_retention_days: 10,
      daily_model_snapshot_retention_after_days: 1,
      allow_lazy_open: false,
    };
    const datafeedConfig: Datafeed = {
      datafeed_id: `datafeed-${jobId}`,
      indices: ['ft_module_sample_logs'],
      job_id: jobId,
      query: { bool: { must: [{ match_all: {} }] } },
    };

    return {
      testDescription: `stop_on_warn is ${stopOnWarn}`,
      jobId,
      jobConfig: {
        job_id: jobId,
        ...commonJobConfig,
        analysis_config: {
          bucket_span: '1m',
          categorization_field_name: 'message',
          per_partition_categorization: { enabled: true, stop_on_warn: stopOnWarn },
          detectors: [
            {
              function: 'count',
              by_field_name: 'mlcategory',
              partition_field_name: PARTITION_FIELD_NAME,
            },
          ],
          influencers: ['mlcategory'],
        },
      },
      datafeedConfig,
    };
  };

  const testSetUps: TestConfig[] = [
    setupTestConfigs(`${testJobId}_t`, true),
    setupTestConfigs(`${testJobId}_f`, false),
    setupTestConfigs(`${testJobId}_viewer`, true),
    setupTestConfigs(`${testJobId}_unauthorized`, true),
    setupTestConfigs(`${testJobId}_t_2`, true),
  ];

  const testJobIds = testSetUps.map((t) => t.jobId);

  describe('get stopped_partitions', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/module_sample_logs');
      await ml.testResources.setKibanaTimeZoneToUTC();
      for (const testData of testSetUps) {
        const { jobConfig, datafeedConfig } = testData;
        await ml.api.createAndRunAnomalyDetectionLookbackJob(jobConfig, datafeedConfig);
      }
    });

    after(async () => {
      await ml.testResources.deleteIndexPatternByTitle('ft_module_sample_logs');
      await ml.api.cleanMlIndices();
    });

    it('should fetch all the stopped partitions correctly', async () => {
      const { jobId } = testSetUps[0];
      const { body } = await supertest
        .post(`/api/ml/results/stopped_partitions`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .send({ jobIds: [jobId] })
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      expect(body).to.be.an('array');
      if (body.length > 0) {
        body.forEach((partitionValue: string) => {
          expect(partitionValue).to.be.a('string');
        });
      }
    });

    it('should return empty array if stopped_on_warn is false', async () => {
      const { jobId } = testSetUps[1];
      const { body } = await supertest
        .post(`/api/ml/results/stopped_partitions`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .send({ jobIds: [jobId] })
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      expect(body).to.be.an('array');
      expect(body).to.have.length(0);
    });

    it('should fetch stopped partitions for user with view permission', async () => {
      const { jobId } = testSetUps[2];
      const { body } = await supertest
        .post(`/api/ml/results/stopped_partitions`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .send({ jobIds: [jobId] })
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      expect(body).to.be.an('array');
      if (body.length > 0) {
        body.forEach((partitionValue: string) => {
          expect(partitionValue).to.be.a('string');
        });
      }
    });

    it('should not fetch stopped partitions for unauthorized user', async () => {
      const { jobId } = testSetUps[3];

      const { body } = await supertest
        .post(`/api/ml/results/stopped_partitions`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .send({ jobIds: [jobId] })
        .set(COMMON_REQUEST_HEADERS)
        .expect(404);

      expect(body.error).to.be('Not Found');
      expect(body.message).to.be('Not Found');
    });

    it('should fetch stopped partitions for multiple job ids', async () => {
      const { body } = await supertest
        .post(`/api/ml/results/stopped_partitions`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .send({ jobIds: testJobIds })
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      expect(body).to.be.an('array');
      if (body.length > 0) {
        body.forEach((partitionValue: string) => {
          expect(partitionValue).to.be.a('string');
        });
      }
    });

    it('should fetch list of jobs with stopped_partitions for multiple job ids', async () => {
      const { body } = await supertest
        .post(`/api/ml/results/stopped_partitions`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .send({ jobIds: testJobIds, fieldToBucket: 'job_id' })
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      expect(body).to.be.an('array');
      if (body.length > 0) {
        body.forEach((jobId: string) => {
          expect(testJobIds).to.contain(jobId);
        });
      }
    });
  });
};
