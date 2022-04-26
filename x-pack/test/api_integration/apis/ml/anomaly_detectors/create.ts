/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const jobId = `fq_single_${Date.now()}`;

  const testDataList = [
    {
      testTitle: 'ML Poweruser creates a single metric job',
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
      },
      expected: {
        responseCode: 200,
        responseBody: {
          job_id: `${jobId}_1`,
          job_type: 'anomaly_detector',
          groups: ['automated', 'farequote', 'single-metric'],
          description:
            'Single metric job based on the farequote dataset with 30m bucketspan and mean(responsetime)',
          analysis_config: {
            bucket_span: '30m',
            summary_count_field_name: 'doc_count',
            detectors: [
              {
                detector_description: 'mean(responsetime)',
                function: 'mean',
                field_name: 'responsetime',
                detector_index: 0,
              },
            ],
            influencers: [],
          },
          analysis_limits: { model_memory_limit: '11mb', categorization_examples_limit: 4 },
          data_description: { time_field: '@timestamp', time_format: 'epoch_ms' },
          model_plot_config: { enabled: true },
          model_snapshot_retention_days: 1,
          results_index_name: 'shared',
          allow_lazy_open: false,
        },
      },
    },
    {
      testTitle: 'ML viewer cannot create a job',
      user: USER.ML_VIEWER,
      jobId: `${jobId}_2`,
      requestBody: {
        job_id: `${jobId}_2`,
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
      },
      expected: {
        responseCode: 403,
        responseBody: {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Forbidden',
        },
      },
    },
  ];

  describe('create', function () {
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
          .put(`/api/ml/anomaly_detectors/${testData.jobId}`)
          .auth(testData.user, ml.securityCommon.getPasswordForUser(testData.user))
          .set(COMMON_REQUEST_HEADERS)
          .send(testData.requestBody);
        ml.api.assertResponseStatusCode(testData.expected.responseCode, status, body);

        if (body.error === undefined) {
          // Validate the important parts of the response.
          const expectedResponse = testData.expected.responseBody;
          expect(body.job_id).to.eql(expectedResponse.job_id);
          expect(body.groups).to.eql(expectedResponse.groups);
          expect(body.analysis_config!.bucket_span).to.eql(
            expectedResponse.analysis_config!.bucket_span
          );
          expect(body.analysis_config.detectors).to.have.length(
            expectedResponse.analysis_config!.detectors.length
          );
          expect(body.analysis_config.detectors[0]).to.eql(
            expectedResponse.analysis_config!.detectors[0]
          );
        } else {
          expect(body.error).to.eql(testData.expected.responseBody.error);
          expect(body.message).to.eql(testData.expected.responseBody.message);
        }
      });
    }
  });
};
