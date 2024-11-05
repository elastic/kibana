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

  const jobId = `fq_single_buckets`;

  async function getBuckets({
    _jobId,
    timestamp,
    expectedStatusCode = 200,
  }: {
    _jobId: string;
    timestamp?: number;
    expectedStatusCode?: number;
  }) {
    const endpoint = `/internal/ml/anomaly_detectors/${_jobId}/results/buckets/${
      timestamp ? `${timestamp}` : ''
    }`;

    const { body, status } = await supertest
      .post(endpoint)
      .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
      .set(getCommonRequestHeader('1'))
      .send({});

    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('POST anomaly_detectors results buckets', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();

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
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('should get buckets with correct structure for a job', async () => {
      const result = await getBuckets({ _jobId: jobId });

      expect(result.count).to.be.greaterThan(0);
      expect(result.buckets).not.to.be.empty();
      expect(result.buckets[0]).to.have.keys(
        'job_id',
        'timestamp',
        'anomaly_score',
        'bucket_span',
        'initial_anomaly_score',
        'event_count',
        'is_interim',
        'bucket_influencers',
        'processing_time_ms',
        'result_type'
      );
    });

    it('should get a single bucket when timestamp is specified', async () => {
      const allBuckets = await getBuckets({ _jobId: jobId });
      const sampleTimestamp = allBuckets.buckets[0].timestamp;
      const result = await getBuckets({ _jobId: jobId, timestamp: sampleTimestamp });

      expect(result.count).to.eql(1);
      expect(result.buckets).to.have.length(1);
    });

    it('should fail with non-existent job', async () => {
      await getBuckets({ _jobId: 'non-existent-job', expectedStatusCode: 404 });
    });

    it('should fail with non-existent timestamp', async () => {
      await getBuckets({
        _jobId: jobId,
        timestamp: 1,
        expectedStatusCode: 404,
      });
    });
  });
};
