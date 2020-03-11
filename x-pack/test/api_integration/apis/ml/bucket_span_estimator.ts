/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

const testDataList = [
  {
    testTitleSuffix: 'with 1 field, 1 agg, no split',
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

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const esSupertest = getService('esSupertest');
  const supertest = getService('supertest');

  describe('bucket span estimator', () => {
    before(async () => {
      await esArchiver.load('ml/ecommerce');
    });

    after(async () => {
      await esArchiver.unload('ml/ecommerce');
    });

    describe('with default settings', function() {
      for (const testData of testDataList) {
        it(`estimates the bucket span ${testData.testTitleSuffix}`, async () => {
          const { body } = await supertest
            .post('/api/ml/validate/estimate_bucket_span')
            .set(COMMON_HEADERS)
            .send(testData.requestBody)
            .expect(testData.expected.responseCode);

          expect(body).to.eql(testData.expected.responseBody);
        });
      }
    });

    describe('with transient search.max_buckets setting', function() {
      before(async () => {
        await esSupertest
          .put('/_cluster/settings')
          .send({ transient: { 'search.max_buckets': 9000 } })
          .expect(200);
      });

      after(async () => {
        await esSupertest
          .put('/_cluster/settings')
          .send({ transient: { 'search.max_buckets': null } })
          .expect(200);
      });

      const testData = testDataList[0];

      it(`estimates the bucket span`, async () => {
        const { body } = await supertest
          .post('/api/ml/validate/estimate_bucket_span')
          .set(COMMON_HEADERS)
          .send(testData.requestBody)
          .expect(testData.expected.responseCode);

        expect(body).to.eql(testData.expected.responseBody);
      });
    });

    describe('with persistent search.max_buckets setting', function() {
      before(async () => {
        await esSupertest
          .put('/_cluster/settings')
          .send({ persistent: { 'search.max_buckets': 9000 } })
          .expect(200);
      });

      after(async () => {
        await esSupertest
          .put('/_cluster/settings')
          .send({ persistent: { 'search.max_buckets': null } })
          .expect(200);
      });

      const testData = testDataList[0];

      it(`estimates the bucket span`, async () => {
        const { body } = await supertest
          .post('/api/ml/validate/estimate_bucket_span')
          .set(COMMON_HEADERS)
          .send(testData.requestBody)
          .expect(testData.expected.responseCode);

        expect(body).to.eql(testData.expected.responseBody);
      });
    });
  });
};
