/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const jobId = `fq_single_${Date.now()}`;

  const testDataList = [
    {
      testTitle: 'ML Poweruser creates a single metric job with datafeed',
      user: USER.ML_POWERUSER,
      jobId: `${jobId}_1`,
      requestBody: {
        job_id: `${jobId}_1`,
        description:
          'Single metric job based on the farequote dataset with 30m bucketspan and mean(responsetime)',
        groups: ['automated', 'farequote', 'single-metric'],
        analysis_config: {
          bucket_span: '30m',
          detectors: [{ function: 'mean', field_name: 'responsetime' }],
          influencers: [],
          summary_count_field_name: 'doc_count',
        },
        data_description: { time_field: '@timestamp' },
        analysis_limits: { model_memory_limit: '11MB' },
        model_plot_config: { enabled: true },
        datafeed_config: {
          datafeed_id: `datafeed-${jobId}_1`,
          indices: ['farequote-*'],
          query: {
            match_all: {},
          },
        },
      },
      expected: {
        responseCode: 200,
        responseBody: {
          // skipping parts of the job config we're not going to check
          // we're only interesting in the datafeed_config for this test
          datafeed_config: {
            job_id: `${jobId}_1`,
            datafeed_id: `datafeed-${jobId}_1`,
            indices: ['farequote-*'],
            query: {
              match_all: {},
            },
          },
        },
      },
    },
  ];

  describe('PUT anomaly_detectors which contain a datafeed config', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    for (const testData of testDataList) {
      it(`${testData.testTitle}`, async () => {
        const { body, status } = await supertest
          .put(`/internal/ml/anomaly_detectors/${testData.jobId}`)
          .auth(testData.user, ml.securityCommon.getPasswordForUser(testData.user))
          .set(getCommonRequestHeader('1'))
          .send(testData.requestBody);
        ml.api.assertResponseStatusCode(testData.expected.responseCode, status, body);

        // Validate the important parts of the response.
        const expectedResponse = testData.expected.responseBody;
        expect(body.datafeed_config.datafeed_id).to.eql(
          expectedResponse.datafeed_config.datafeed_id
        );
        expect(body.datafeed_config.job_id).to.eql(expectedResponse.datafeed_config.job_id);
        expect(body.datafeed_config.indices).to.eql(expectedResponse.datafeed_config.indices);
      });
    }
  });
};
