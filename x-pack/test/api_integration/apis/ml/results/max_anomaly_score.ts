/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Datafeed, Job } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { USER } from '../../../../functional/services/ml/security_common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  // @ts-expect-error not full interface
  const JOB_CONFIG: Job = {
    job_id: `fq_multi_1_ae`,
    description: 'mean(responsetime) partition=airline on farequote dataset with 1h bucket span',
    groups: ['farequote', 'automated', 'multi-metric'],
    analysis_config: {
      bucket_span: '1h',
      influencers: ['airline'],
      detectors: [
        { function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' },
      ],
    },
    data_description: { time_field: '@timestamp' },
    analysis_limits: { model_memory_limit: '20mb' },
    model_plot_config: { enabled: false },
  };

  // @ts-expect-error not full interface
  const DATAFEED_CONFIG: Datafeed = {
    datafeed_id: 'datafeed-fq_multi_1_ae',
    indices: ['ft_farequote'],
    job_id: 'fq_multi_1_ae',
    query: { bool: { must: [{ match_all: {} }] } },
  };

  async function createMockJobs() {
    await ml.api.createAndRunAnomalyDetectionLookbackJob(JOB_CONFIG, DATAFEED_CONFIG);
  }

  async function runRequest(requestBody: object) {
    const { body, status } = await supertest
      .post(`/api/ml/results/max_anomaly_score`)
      .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
      .set(COMMON_REQUEST_HEADERS)
      .send(requestBody);
    return { body, status };
  }

  describe('MaxAnomalyScore', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await createMockJobs();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('should fetch max anomaly score based on provided time range', async () => {
      const requestBody = {
        jobIds: [JOB_CONFIG.job_id],
        earliestMs: 1454889600000, // February 8, 2016 12:00:00 AM GMT
        latestMs: 1454976000000, // February 9, 2016 12:00:00 AM GMT
      };

      const { body, status } = await runRequest(requestBody);
      ml.api.assertResponseStatusCode(200, status, body);
      expect(body).to.eql({ maxScore: 0 });
    });

    it('should fetch max anomaly score from the entire range of data', async () => {
      const requestBody = {
        jobIds: [JOB_CONFIG.job_id],
      };

      const { body, status } = await runRequest(requestBody);
      ml.api.assertResponseStatusCode(200, status, body);
      expect(body.maxScore).to.be.above(50);
    });
    it('should respond with an error when job with provided id does not exist', async () => {
      const requestBody = {
        jobIds: ['i_am_not_found'],
      };

      const { body, status } = await runRequest(requestBody);
      ml.api.assertResponseStatusCode(404, status, body);
      expect(body.message).to.eql('i_am_not_found missing');
    });
  });
};
