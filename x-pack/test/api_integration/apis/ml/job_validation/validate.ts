/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  basicValidJobMessages,
  basicInvalidJobMessages,
  nonBasicIssuesMessages,
} from '../../../../../../x-pack/plugins/ml/common/constants/messages.test.mock';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  describe('Validate job', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it(`should recognize a valid job configuration`, async () => {
      const requestBody = {
        duration: { start: 1586995459000, end: 1589672736000 },
        job: {
          job_id: 'test',
          description: '',
          groups: [],
          analysis_config: {
            bucket_span: '15m',
            detectors: [
              {
                function: 'mean',
                field_name: 'products.discount_amount',
                exclude_frequent: 'none',
              },
            ],
            influencers: [],
            summary_count_field_name: 'doc_count',
          },
          data_description: { time_field: 'order_date' },
          analysis_limits: { model_memory_limit: '11MB' },
          model_plot_config: { enabled: true },
          datafeed_config: {
            datafeed_id: 'datafeed-test',
            job_id: 'test',
            indices: ['ft_ecommerce'],
            query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
            aggregations: {
              buckets: {
                date_histogram: { field: 'order_date', fixed_interval: '90000ms' },
                aggregations: {
                  'products.discount_amount': { avg: { field: 'products.discount_amount' } },
                  order_date: { max: { field: 'order_date' } },
                },
              },
            },
          },
        },
      };

      const { body, status } = await supertest
        .post('/api/ml/validate/job')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body).to.eql(basicValidJobMessages);
    });

    it('should recognize a basic invalid job configuration and skip advanced checks', async () => {
      const requestBody = {
        duration: { start: 1586995459000, end: 1589672736000 },
        job: {
          job_id: '-(*&^',
          description: '',
          groups: [],
          analysis_config: {
            bucket_span: '15m',
            detectors: [{ function: 'mean', field_name: 'products.discount_amount' }],
            influencers: [],
            summary_count_field_name: 'doc_count',
          },
          data_description: { time_field: 'order_date' },
          analysis_limits: { model_memory_limit: '11MB' },
          model_plot_config: { enabled: true },
          datafeed_config: {
            datafeed_id: 'datafeed-test',
            job_id: 'test',
            indices: ['ft_ecommerce'],
            query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
            aggregations: {
              buckets: {
                date_histogram: { field: 'order_date', fixed_interval: '90000ms' },
                aggregations: {
                  'products.discount_amount': { avg: { field: 'products.discount_amount' } },
                  order_date: { max: { field: 'order_date' } },
                },
              },
            },
          },
        },
      };

      const { body, status } = await supertest
        .post('/api/ml/validate/job')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body).to.eql(basicInvalidJobMessages);
    });

    it('should recognize non-basic issues in job configuration', async () => {
      const requestBody = {
        duration: { start: 1586995459000, end: 1589672736000 },
        job: {
          job_id: 'test',
          description: '',
          groups: [],
          analysis_config: {
            bucket_span: '1000000m',
            detectors: [
              {
                function: 'mean',
                field_name: 'products.base_price',
                // some high cardinality field
                partition_field_name: 'order_id',
              },
            ],
            influencers: ['order_id'],
          },
          data_description: { time_field: 'order_date' },
          analysis_limits: { model_memory_limit: '1MB' },
          model_plot_config: { enabled: true },
          datafeed_config: {
            datafeed_id: 'datafeed-test',
            job_id: 'test',
            indices: ['ft_ecommerce'],
            query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
            aggregations: {
              buckets: {
                date_histogram: { field: 'order_date', fixed_interval: '90000ms' },
                aggregations: {
                  'products.discount_amount': { avg: { field: 'products.discount_amount' } },
                  order_date: { max: { field: 'order_date' } },
                },
              },
            },
          },
        },
      };

      const { body, status } = await supertest
        .post('/api/ml/validate/job')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody);
      ml.api.assertResponseStatusCode(200, status, body);

      // The existance and value of maxModelMemoryLimit depends on ES settings
      // and may vary between test environments, e.g. cloud vs non-cloud,
      // so it should not be part of the validation
      body.forEach((element: any) => {
        if (element.hasOwnProperty('maxModelMemoryLimit')) {
          delete element.maxModelMemoryLimit;
        }
      });

      const expectedResponse = nonBasicIssuesMessages;

      expect(body.length).to.eql(
        expectedResponse.length,
        `Response body should have ${expectedResponse.length} entries (got ${JSON.stringify(body)})`
      );
      for (const entry of expectedResponse) {
        const responseEntry = body.find((obj: any) => obj.id === entry.id);
        expect(responseEntry).to.not.eql(
          undefined,
          `Response entry with id '${entry.id}' should exist`
        );

        if (entry.id === 'cardinality_model_plot_high') {
          // don't check the exact value of modelPlotCardinality as this is an approximation
          expect(responseEntry).to.have.property('modelPlotCardinality');
        } else {
          expect(responseEntry).to.eql(entry);
        }
      }
    });

    it('should not validate configuration in case request payload is invalid', async () => {
      const requestBody = {
        duration: { start: 1586995459000, end: 1589672736000 },
        job: {
          job_id: 'test',
          description: '',
          groups: [],
          // missing analysis_config
          data_description: { time_field: 'order_date' },
          analysis_limits: { model_memory_limit: '11MB' },
          model_plot_config: { enabled: true },
          datafeed_config: {
            datafeed_id: 'datafeed-test',
            job_id: 'test',
            indices: ['ft_ecommerce'],
            query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
            aggregations: {
              buckets: {
                date_histogram: { field: 'order_date', fixed_interval: '90000ms' },
                aggregations: {
                  'products.discount_amount': { avg: { field: 'products.discount_amount' } },
                  order_date: { max: { field: 'order_date' } },
                },
              },
            },
          },
        },
      };

      const { body, status } = await supertest
        .post('/api/ml/validate/job')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody);
      ml.api.assertResponseStatusCode(400, status, body);

      expect(body.error).to.eql('Bad Request');
      expect(body.message).to.eql(
        '[request body.job.analysis_config.bucket_span]: expected value of type [string] but got [undefined]'
      );
    });

    it('should not validate if the user does not have required permissions', async () => {
      const requestBody = {
        job: {
          job_id: 'test',
          description: '',
          groups: [],
          analysis_config: {
            bucket_span: '15m',
            detectors: [{ function: 'mean', field_name: 'products.discount_amount' }],
            influencers: [],
            summary_count_field_name: 'doc_count',
          },
          data_description: { time_field: 'order_date' },
          analysis_limits: { model_memory_limit: '11MB' },
          model_plot_config: { enabled: true },
          datafeed_config: {
            datafeed_id: 'datafeed-test',
            job_id: 'test',
            indices: ['ft_ecommerce'],
            query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
            aggregations: {
              buckets: {
                date_histogram: { field: 'order_date', fixed_interval: '90000ms' },
                aggregations: {
                  'products.discount_amount': { avg: { field: 'products.discount_amount' } },
                  order_date: { max: { field: 'order_date' } },
                },
              },
            },
          },
        },
      };

      const { body, status } = await supertest
        .post('/api/ml/validate/job')
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody);
      ml.api.assertResponseStatusCode(403, status, body);

      expect(body.error).to.eql('Forbidden');
      expect(body.message).to.eql('Forbidden');
    });
  });
};
