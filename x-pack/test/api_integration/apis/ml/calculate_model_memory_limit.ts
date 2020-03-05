/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { USER } from '../../../functional/services/machine_learning/security_common';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const mlSecurity = getService('mlSecurity');

  const testDataList = [
    {
      testTitleSuffix: 'with 0 metrics, 0 influencers and no split field',
      user: USER.ML_POWERUSER,
      requestBody: {
        indexPattern: 'ecommerce',
        splitFieldName: '',
        query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
        fieldNames: ['__ml_event_rate_count__'],
        influencerNames: [],
        timeFieldName: 'order_date',
        earliestMs: 1560297859000,
        latestMs: 1562975136000,
      },
      expected: {
        responseCode: 400,
        responseBody: {
          statusCode: 400,
          error: 'Bad Request',
          message: "[illegal_argument_exception] specified fields can't be null or empty",
        },
      },
    },
    {
      testTitleSuffix: 'with 1 metrics and 1 influencers same as split field',
      user: USER.ML_POWERUSER,
      requestBody: {
        indexPattern: 'ecommerce',
        splitFieldName: 'geoip.city_name',
        query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
        fieldNames: ['products.base_price'],
        influencerNames: ['geoip.city_name'],
        timeFieldName: 'order_date',
        earliestMs: 1560297859000,
        latestMs: 1562975136000,
      },
      expected: {
        responseCode: 200,
        responseBody: { modelMemoryLimit: '12MB' },
      },
    },
    {
      testTitleSuffix: 'with 3 metrics, 3 influencers, split by city',
      user: USER.ML_POWERUSER,
      requestBody: {
        indexPattern: 'ecommerce',
        splitFieldName: 'geoip.city_name',
        query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
        fieldNames: ['products.base_price', 'taxful_total_price', 'products.discount_amount'],
        influencerNames: ['geoip.city_name', 'customer_gender', 'customer_full_name.keyword'],
        timeFieldName: 'order_date',
        earliestMs: 1560297859000,
        latestMs: 1562975136000,
      },
      expected: {
        responseCode: 200,
        responseBody: { modelMemoryLimit: '14MB' },
      },
    },
    {
      testTitleSuffix: 'with 4 metrics, 4 influencers, split by customer_id',
      user: USER.ML_POWERUSER,
      requestBody: {
        indexPattern: 'ecommerce',
        splitFieldName: 'customer_id',
        query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
        fieldNames: [
          'geoip.country_iso_code',
          'taxless_total_price',
          'taxful_total_price',
          'products.discount_amount',
        ],
        influencerNames: [
          'customer_id',
          'geoip.country_iso_code',
          'products.discount_percentage',
          'products.discount_amount',
        ],
        timeFieldName: 'order_date',
        earliestMs: 1560297859000,
        latestMs: 1562975136000,
      },
      expected: {
        responseCode: 200,
        responseBody: { modelMemoryLimit: '23MB' },
      },
    },
    {
      testTitleSuffix:
        'with 4 metrics, 4 influencers, split by customer_id and filtering by country code',
      user: USER.ML_POWERUSER,
      requestBody: {
        indexPattern: 'ecommerce',
        splitFieldName: 'customer_id',
        query: {
          bool: {
            filter: {
              term: {
                'geoip.country_iso_code': 'US',
              },
            },
          },
        },
        fieldNames: [
          'geoip.country_iso_code',
          'taxless_total_price',
          'taxful_total_price',
          'products.discount_amount',
        ],
        influencerNames: [
          'customer_id',
          'geoip.country_iso_code',
          'products.discount_percentage',
          'products.discount_amount',
        ],
        timeFieldName: 'order_date',
        earliestMs: 1560297859000,
        latestMs: 1562975136000,
      },
      expected: {
        responseCode: 200,
        responseBody: { modelMemoryLimit: '14MB' },
      },
    },
  ];

  describe('calculate model memory limit', function() {
    before(async () => {
      await esArchiver.load('ml/ecommerce');
    });

    after(async () => {
      await esArchiver.unload('ml/ecommerce');
    });

    for (const testData of testDataList) {
      it(`calculates the model memory limit ${testData.testTitleSuffix}`, async () => {
        const { body } = await supertest
          .post('/api/ml/validate/calculate_model_memory_limit')
          .auth(testData.user, mlSecurity.getPasswordForUser(testData.user))
          .set(COMMON_HEADERS)
          .send(testData.requestBody)
          .expect(testData.expected.responseCode);

        expect(body).to.eql(testData.expected.responseBody);
      });
    }
  });
};
