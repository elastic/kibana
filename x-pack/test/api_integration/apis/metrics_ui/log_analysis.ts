/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { fold } from 'fp-ts/lib/Either';
import {
  LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH,
  getLogEntryRateRequestPayloadRT,
  getLogEntryRateSuccessReponsePayloadRT,
} from '../../../../plugins/infra/common/http_api/log_analysis';
import { createPlainError, throwErrors } from '../../../../plugins/infra/common/runtime_types';
import { FtrProviderContext } from '../../ftr_provider_context';

const TIME_BEFORE_START = 1569934800000;
const TIME_AFTER_END = 1570016700000;
const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};
const ML_JOB_ID = 'kibana-logs-ui-default-default-log-entry-rate';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const retry = getService('retry');

  async function createDummyJob(jobId: string) {
    await supertest
      .put(`/api/ml/anomaly_detectors/${jobId}`)
      .set(COMMON_HEADERS)
      .send({
        job_id: jobId,
        groups: [],
        analysis_config: {
          bucket_span: '15m',
          detectors: [{ function: 'count' }],
          influencers: [],
        },
        data_description: { time_field: '@timestamp' },
        analysis_limits: { model_memory_limit: '11MB' },
        model_plot_config: { enabled: false, annotations_enabled: false },
      })
      .expect(200);
  }

  async function deleteDummyJob(jobId: string) {
    await supertest.delete(`/api/ml/anomaly_detectors/${jobId}`).set(COMMON_HEADERS).expect(200);

    await retry.waitForWithTimeout(`'${jobId}' to not exist`, 5 * 1000, async () => {
      if (await supertest.get(`/api/ml/anomaly_detectors/${jobId}`).expect(404)) {
        return true;
      } else {
        throw new Error(`expected anomaly detection job '${jobId}' not to exist`);
      }
    });
  }

  describe('log analysis apis', () => {
    before(async () => {
      // a real ML job must exist when searching for the results
      await createDummyJob(ML_JOB_ID);
      await esArchiver.load('infra/8.0.0/ml_anomalies_partitioned_log_rate');
    });
    after(async () => {
      await deleteDummyJob(ML_JOB_ID);
      await esArchiver.unload('infra/8.0.0/ml_anomalies_partitioned_log_rate');
    });

    describe('log rate results', () => {
      describe('with the default source', () => {
        it('should return buckets when there are matching ml result documents', async () => {
          const { body } = await supertest
            .post(LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH)
            .set(COMMON_HEADERS)
            .send(
              getLogEntryRateRequestPayloadRT.encode({
                data: {
                  sourceId: 'default',
                  timeRange: {
                    startTime: TIME_BEFORE_START,
                    endTime: TIME_AFTER_END,
                  },
                  bucketDuration: 15 * 60 * 1000,
                },
              })
            )
            .expect(200);

          const logEntryRateBuckets = pipe(
            getLogEntryRateSuccessReponsePayloadRT.decode(body),
            fold(throwErrors(createPlainError), identity)
          );
          expect(logEntryRateBuckets.data.bucketDuration).to.be(15 * 60 * 1000);
          expect(logEntryRateBuckets.data.histogramBuckets).to.not.be.empty();
          expect(
            logEntryRateBuckets.data.histogramBuckets.some((bucket) => {
              return bucket.partitions.some((partition) => partition.anomalies.length > 0);
            })
          ).to.be(true);
        });

        it('should return no buckets when there are no matching ml result documents', async () => {
          const { body } = await supertest
            .post(LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH)
            .set(COMMON_HEADERS)
            .send(
              getLogEntryRateRequestPayloadRT.encode({
                data: {
                  sourceId: 'default',
                  timeRange: {
                    startTime: TIME_BEFORE_START - 10 * 15 * 60 * 1000,
                    endTime: TIME_BEFORE_START - 1,
                  },
                  bucketDuration: 15 * 60 * 1000,
                },
              })
            )
            .expect(200);

          const logEntryRateBuckets = pipe(
            getLogEntryRateSuccessReponsePayloadRT.decode(body),
            fold(throwErrors(createPlainError), identity)
          );

          expect(logEntryRateBuckets.data.bucketDuration).to.be(15 * 60 * 1000);
          expect(logEntryRateBuckets.data.histogramBuckets).to.be.empty();
        });
      });
    });
  });
};
