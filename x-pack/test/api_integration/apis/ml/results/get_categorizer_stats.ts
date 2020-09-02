/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { Datafeed } from '../../../../../plugins/ml/common/types/anomaly_detection_jobs';
import { AnomalyCategorizerStatsDoc } from '../../../../../plugins/ml/common/types/anomalies';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const jobId = `sample_logs_${Date.now()}`;
  const PARTITION_FIELD_NAME = 'event.dataset';
  const testJobConfig = {
    job_id: jobId,
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
  const testDatafeedConfig: Datafeed = {
    datafeed_id: `datafeed-${jobId}`,
    indices: ['ft_module_sample_logs'],
    job_id: jobId,
    query: { bool: { must: [{ match_all: {} }] } },
  };

  describe('get categorizer_stats', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/module_sample_logs');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.api.createAndRunAnomalyDetectionLookbackJob(testJobConfig, testDatafeedConfig);
    });

    after(async () => {
      await ml.testResources.deleteIndexPatternByTitle('ft_module_sample_logs');
      await ml.api.cleanMlIndices();
    });

    it('should fetch all the categorizer stats for job id', async () => {
      const { body } = await supertest
        .get(`/api/ml/results/${jobId}/categorizer_stats`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      body.forEach((doc: AnomalyCategorizerStatsDoc) => {
        expect(doc.job_id).to.eql(jobId);
        expect(doc.result_type).to.eql('categorizer_stats');
        expect(doc.partition_field_name).to.be(PARTITION_FIELD_NAME);
        expect(doc.partition_field_value).to.not.be(undefined);
      });
    });

    it('should fetch categorizer stats for job id for user with view permission', async () => {
      const { body } = await supertest
        .get(`/api/ml/results/${jobId}/categorizer_stats`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      body.forEach((doc: AnomalyCategorizerStatsDoc) => {
        expect(doc.job_id).to.eql(jobId);
        expect(doc.result_type).to.eql('categorizer_stats');
        expect(doc.partition_field_name).to.be(PARTITION_FIELD_NAME);
        expect(doc.partition_field_value).to.not.be(undefined);
      });
    });

    it('should not fetch categorizer stats for job id for unauthorized user', async () => {
      const { body } = await supertest
        .get(`/api/ml/results/${jobId}/categorizer_stats`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .expect(404);

      expect(body.error).to.be('Not Found');
      expect(body.message).to.be('Not Found');
    });

    it('should fetch all the categorizer stats with per-partition value for job id', async () => {
      const { body } = await supertest
        .get(`/api/ml/results/${jobId}/categorizer_stats`)
        .query({ partitionByValue: 'sample_web_logs' })
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);
      body.forEach((doc: AnomalyCategorizerStatsDoc) => {
        expect(doc.job_id).to.eql(jobId);
        expect(doc.result_type).to.eql('categorizer_stats');
        expect(doc.partition_field_name).to.be(PARTITION_FIELD_NAME);
        expect(doc.partition_field_value).to.be('sample_web_logs');
      });
    });

    it('should fetch categorizer stats with per-partition value for user with view permission', async () => {
      const { body } = await supertest
        .get(`/api/ml/results/${jobId}/categorizer_stats`)
        .query({ partitionByValue: 'sample_web_logs' })
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      body.forEach((doc: AnomalyCategorizerStatsDoc) => {
        expect(doc.job_id).to.eql(jobId);
        expect(doc.result_type).to.eql('categorizer_stats');
        expect(doc.partition_field_name).to.be(PARTITION_FIELD_NAME);
        expect(doc.partition_field_value).to.be('sample_web_logs');
      });
    });

    it('should not fetch categorizer stats with per-partition value for unauthorized user', async () => {
      const { body } = await supertest
        .get(`/api/ml/results/${jobId}/categorizer_stats`)
        .query({ partitionByValue: 'sample_web_logs' })
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .expect(404);

      expect(body.error).to.be('Not Found');
      expect(body.message).to.be('Not Found');
    });
  });
};
