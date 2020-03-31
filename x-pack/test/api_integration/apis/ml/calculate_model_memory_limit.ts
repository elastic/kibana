/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { USER } from '../../../functional/services/machine_learning/security_common';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testDataList = [
    {
      testTitleSuffix: 'when no partition field is provided with regular function',
      user: USER.ML_POWERUSER,
      requestBody: {
        indexPattern: 'ecommerce',
        analysisConfig: {
          bucket_span: '15m',
          detectors: [
            {
              function: 'mean',
            },
          ],
          influencers: [],
        },
        query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
        timeFieldName: 'order_date',
        earliestMs: 1560297859000,
        latestMs: 1562975136000,
      },
      expected: {
        responseCode: 400,
        responseBody: {
          statusCode: 400,
          error: 'Bad Request',
          message:
            '[status_exception] Unless a count or temporal function is used one of field_name, by_field_name or over_field_name must be set',
        },
      },
    },
    {
      testTitleSuffix: 'with 1 metrics and 1 influencers same as split field',
      user: USER.ML_POWERUSER,
      requestBody: {
        indexPattern: 'ecommerce',
        analysisConfig: {
          bucket_span: '15m',
          detectors: [
            {
              function: 'avg',
              field_name: 'geoip.city_name',
              by_field_name: 'geoip.city_name',
            },
          ],
          influencers: ['geoip.city_name'],
        },
        query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
        timeFieldName: 'order_date',
        earliestMs: 1560297859000,
        latestMs: 1562975136000,
      },
      expected: {
        responseCode: 200,
        responseBody: { modelMemoryLimit: '11MB', estimatedModelMemoryLimit: '11MB' },
      },
    },
    {
      testTitleSuffix: 'with 3 influencers, split by city',
      user: USER.ML_POWERUSER,
      requestBody: {
        indexPattern: 'ecommerce',
        analysisConfig: {
          bucket_span: '15m',
          detectors: [
            {
              function: 'mean',
              by_field_name: 'geoip.city_name',
              field_name: 'geoip.city_name',
            },
          ],
          influencers: ['geoip.city_name', 'customer_gender', 'customer_full_name.keyword'],
        },
        query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
        timeFieldName: 'order_date',
        earliestMs: 1560297859000,
        latestMs: 1562975136000,
      },
      expected: {
        responseCode: 200,
        responseBody: { estimatedModelMemoryLimit: '11MB', modelMemoryLimit: '11MB' },
      },
    },
    {
      testTitleSuffix: '4 influencers, split by customer_id and filtering by country code',
      user: USER.ML_POWERUSER,
      requestBody: {
        indexPattern: 'ecommerce',
        analysisConfig: {
          bucket_span: '2d',
          detectors: [
            {
              function: 'mean',
              by_field_name: 'customer_id.city_name',
              field_name: 'customer_id.city_name',
            },
            {
              function: 'avg',
              by_field_name: 'manufacturer.keyword',
              field_name: 'manufacturer.keyword',
            },
          ],
          influencers: [
            'geoip.country_iso_code',
            'products.discount_percentage',
            'products.discount_amount',
            'day_of_week',
          ],
        },
        query: {
          bool: {
            filter: {
              term: {
                'geoip.country_iso_code': 'US',
              },
            },
          },
        },
        timeFieldName: 'order_date',
        earliestMs: 1560297859000,
        latestMs: 1562975136000,
      },
      expected: {
        responseCode: 200,
        responseBody: { estimatedModelMemoryLimit: '11MB', modelMemoryLimit: '11MB' },
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
        await supertest
          .post('/api/ml/validate/calculate_model_memory_limit')
          .auth(testData.user, ml.securityCommon.getPasswordForUser(testData.user))
          .set(COMMON_HEADERS)
          .send(testData.requestBody)
          .expect(testData.expected.responseCode);

        // More backend changes to the model memory calculation are planned.
        // This value check will be re-enabled when the final batch of updates is in.
        // expect(body).to.eql(testData.expected.responseBody);
      });
    }
  });
};
