/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATAFEED_STATE, JOB_STATE } from '@kbn/ml-plugin/common';
import expect from '@kbn/expect';
import { USER } from '../../../../functional/services/ml/security_common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const supertest = getService('supertestWithoutAuth');

  const jobId1 = `fq_single_overall_buckets_1`;
  const jobId2 = `fq_single_overall_buckets_2`;

  async function getOverallBuckets({
    jobId,
    topN = 1,
    bucketSpan = '1h',
    start = 0,
    end = Date.now(),
    overallScore,
    expectedStatusCode = 200,
  }: {
    jobId: string;
    bucketSpan?: string;
    topN?: number;
    start?: number;
    end?: number;
    overallScore?: number;
    expectedStatusCode?: number;
  }) {
    const endpoint = `/internal/ml/anomaly_detectors/${jobId}/results/overall_buckets`;

    const { body, status } = await supertest
      .post(endpoint)
      .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
      .set(getCommonRequestHeader('1'))
      .send({
        topN,
        bucketSpan,
        start,
        end,
        ...(overallScore !== undefined && { overall_score: overallScore }),
      });

    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('POST anomaly_detectors results overall_buckets', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();

      for (const jobId of [jobId1, jobId2]) {
        const jobConfig = ml.commonConfig.getADFqSingleMetricJobConfig(jobId);
        const datafeedConfig = ml.commonConfig.getADFqDatafeedConfig(jobId);

        await ml.api.createAnomalyDetectionJob(jobConfig);

        await ml.api.createDatafeed(datafeedConfig);

        await ml.api.openAnomalyDetectionJob(jobId);
        await ml.api.startDatafeed(datafeedConfig.datafeed_id, {
          start: '0',
          end: String(Date.now()),
        });
        await ml.api.waitForDatafeedState(datafeedConfig.datafeed_id, DATAFEED_STATE.STOPPED);
        await ml.api.waitForJobState(jobId, JOB_STATE.CLOSED);
      }
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('should get overall buckets with correct structure for multiple jobs', async () => {
      const result = await getOverallBuckets({
        jobId: `${jobId1},${jobId2}`,
      });

      expect(result.count).to.be.greaterThan(0);
      expect(result.overall_buckets).not.to.be.empty();
      expect(result.overall_buckets[0]).to.have.keys(
        'bucket_span',
        'is_interim',
        'jobs',
        'overall_score',
        'result_type',
        'timestamp'
      );
      expect(result.overall_buckets[0].jobs.length).to.equal(2);
    });

    it('should respect the bucket_span parameter', async () => {
      const result1h = await getOverallBuckets({
        jobId: `${jobId1},${jobId2}`,
        bucketSpan: '1h',
      });
      const result2h = await getOverallBuckets({
        jobId: `${jobId1},${jobId2}`,
        bucketSpan: '2h',
      });

      expect(result1h.overall_buckets[0].bucket_span).to.not.equal(
        result2h.overall_buckets[0].bucket_span
      );
    });

    it('should filter results based on overall_score', async () => {
      const result = await getOverallBuckets({
        jobId: `${jobId1},${jobId2}`,
        overallScore: 5,
      });

      for (const bucket of result.overall_buckets) {
        expect(bucket.overall_score).to.be.greaterThan(5);
      }
    });

    it('should fail with non-existent job', async () => {
      await getOverallBuckets({
        jobId: 'non-existent-job',
        expectedStatusCode: 404,
      });
    });
  });
};
