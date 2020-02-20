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
      testTitleSuffix: 'with 1 field, 1 agg, no split',
      user: USER.ML_POWERUSER,
      requestBody: {
        aggTypes: ['avg'],
        duration: { start: 1560297859000, end: 1562975136000 },
        fields: ['taxless_total_price'],
        index: 'ecommerce',
        query: { bool: { must: [{ match_all: {} }] } },
        timeField: 'order_date',
      },
      expected: {
        responseCode: 200,
        responseBody: { name: '15m', ms: 900000 },
      },
    },
    {
      testTitleSuffix: 'with 2 fields, 2 aggs, no split',
      user: USER.ML_POWERUSER,
      requestBody: {
        aggTypes: ['avg', 'sum'],
        duration: { start: 1560297859000, end: 1562975136000 },
        fields: ['products.base_price', 'products.base_unit_price'],
        index: 'ecommerce',
        query: { bool: { must: [{ match_all: {} }] } },
        timeField: 'order_date',
      },
      expected: {
        responseCode: 200,
        responseBody: { name: '30m', ms: 1800000 },
      },
    },
    {
      testTitleSuffix: 'with 1 field, 1 agg, 1 split with cardinality 46',
      user: USER.ML_POWERUSER,
      requestBody: {
        aggTypes: ['avg'],
        duration: { start: 1560297859000, end: 1562975136000 },
        fields: ['taxless_total_price'],
        index: 'ecommerce',
        query: { bool: { must: [{ match_all: {} }] } },
        splitField: 'customer_first_name.keyword',
        timeField: 'order_date',
      },
      expected: {
        responseCode: 200,
        responseBody: { name: '3h', ms: 10800000 },
      },
    },
  ];

  describe('bucket span estimator', function() {
    before(async () => {
      await esArchiver.load('ml/ecommerce');
    });

    after(async () => {
      await esArchiver.unload('ml/ecommerce');
    });

    for (const testData of testDataList) {
      it(`estimates the bucket span ${testData.testTitleSuffix}`, async () => {
        const { body } = await supertest
          .post('/api/ml/validate/estimate_bucket_span')
          .auth(testData.user, mlSecurity.getPasswordForUser(testData.user))
          .set(COMMON_HEADERS)
          .send(testData.requestBody)
          .expect(testData.expected.responseCode);

        expect(body).to.eql(testData.expected.responseBody);
      });
    }
  });
};
