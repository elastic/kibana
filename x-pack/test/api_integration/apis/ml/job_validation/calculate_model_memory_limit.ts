/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testDataList = [
    {
      testTitleSuffix: 'when no partition field is provided with regular function',
      user: USER.ML_POWERUSER,
      requestBody: {
        indexPattern: 'ft_ecommerce',
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
      testTitleSuffix: 'with 1 metric and 1 influencer same as split field',
      user: USER.ML_POWERUSER,
      requestBody: {
        indexPattern: 'ft_ecommerce',
        analysisConfig: {
          bucket_span: '15m',
          detectors: [
            {
              function: 'avg',
              field_name: 'taxless_total_price',
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
        indexPattern: 'ft_ecommerce',
        analysisConfig: {
          bucket_span: '15m',
          detectors: [
            {
              function: 'mean',
              by_field_name: 'geoip.city_name',
              field_name: 'taxless_total_price',
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
      testTitleSuffix:
        '2 detectors split by city and manufacturer, 4 influencers, filtering by country code',
      user: USER.ML_POWERUSER,
      requestBody: {
        indexPattern: 'ft_ecommerce',
        analysisConfig: {
          bucket_span: '2d',
          detectors: [
            {
              function: 'mean',
              by_field_name: 'geoip.city_name',
              field_name: 'taxless_total_price',
            },
            {
              function: 'avg',
              by_field_name: 'manufacturer.keyword',
              field_name: 'taxless_total_price',
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

  describe('calculate model memory limit', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    for (const testData of testDataList) {
      it(`calculates the model memory limit ${testData.testTitleSuffix}`, async () => {
        const { body, status } = await supertest
          .post('/api/ml/validate/calculate_model_memory_limit')
          .auth(testData.user, ml.securityCommon.getPasswordForUser(testData.user))
          .set(COMMON_REQUEST_HEADERS)
          .send(testData.requestBody);
        ml.api.assertResponseStatusCode(testData.expected.responseCode, status, body);

        // More backend changes to the model memory calculation are planned.
        // This value check will be re-enabled when the final batch of updates is in.
        // expect(body).to.eql(testData.expected.responseBody);
      });
    }
  });
};
