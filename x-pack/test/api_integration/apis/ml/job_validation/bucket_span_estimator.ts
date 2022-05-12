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
  const esSupertest = getService('esSupertest');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testDataList = [
    {
      testTitleSuffix: 'with 1 field, 1 agg, no split',
      user: USER.ML_POWERUSER,
      requestBody: {
        aggTypes: ['avg'],
        duration: { start: 1560297859000, end: 1562975136000 },
        fields: ['taxless_total_price'],
        index: 'ft_ecommerce',
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
        index: 'ft_ecommerce',
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
        index: 'ft_ecommerce',
        query: { bool: { must: [{ match_all: {} }] } },
        splitField: 'customer_first_name.keyword',
        timeField: 'order_date',
      },
      expected: {
        responseCode: 200,
        responseBody: { name: '3h', ms: 10800000 },
      },
    },
    {
      testTitleSuffix: 'with 1 field, 1 agg, no split, and empty filters',
      user: USER.ML_POWERUSER,
      requestBody: {
        aggTypes: ['avg'],
        duration: { start: 1560297859000, end: 1562975136000 },
        fields: ['taxless_total_price'],
        filters: [],
        index: 'ft_ecommerce',
        query: { bool: { must: [{ match_all: {} }] } },
        timeField: 'order_date',
      },
      expected: {
        responseCode: 200,
        responseBody: { name: '15m', ms: 900000 },
      },
    },
  ];

  describe('bucket span estimator', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    describe('with default settings', function () {
      for (const testData of testDataList) {
        it(`estimates the bucket span ${testData.testTitleSuffix}`, async () => {
          const { body, status } = await supertest
            .post('/api/ml/validate/estimate_bucket_span')
            .auth(testData.user, ml.securityCommon.getPasswordForUser(testData.user))
            .set(COMMON_REQUEST_HEADERS)
            .send(testData.requestBody);
          ml.api.assertResponseStatusCode(testData.expected.responseCode, status, body);

          expect(body).to.eql(testData.expected.responseBody);
        });
      }
    });

    describe('with transient search.max_buckets setting', function () {
      before(async () => {
        const { body, status } = await esSupertest
          .put('/_cluster/settings')
          .send({ transient: { 'search.max_buckets': 9000 } });
        ml.api.assertResponseStatusCode(200, status, body);
      });

      after(async () => {
        const { body, status } = await esSupertest
          .put('/_cluster/settings')
          .send({ transient: { 'search.max_buckets': null } });
        ml.api.assertResponseStatusCode(200, status, body);
      });

      const testData = testDataList[0];

      it(`estimates the bucket span`, async () => {
        const { body, status } = await supertest
          .post('/api/ml/validate/estimate_bucket_span')
          .auth(testData.user, ml.securityCommon.getPasswordForUser(testData.user))
          .set(COMMON_REQUEST_HEADERS)
          .send(testData.requestBody);
        ml.api.assertResponseStatusCode(testData.expected.responseCode, status, body);

        expect(body).to.eql(testData.expected.responseBody);
      });
    });

    describe('with persistent search.max_buckets setting', function () {
      before(async () => {
        const { body, status } = await esSupertest
          .put('/_cluster/settings')
          .send({ persistent: { 'search.max_buckets': 9000 } });
        ml.api.assertResponseStatusCode(200, status, body);
      });

      after(async () => {
        const { body, status } = await esSupertest
          .put('/_cluster/settings')
          .send({ persistent: { 'search.max_buckets': null } });
        ml.api.assertResponseStatusCode(200, status, body);
      });

      const testData = testDataList[0];

      it(`estimates the bucket span`, async () => {
        const { body, status } = await supertest
          .post('/api/ml/validate/estimate_bucket_span')
          .auth(testData.user, ml.securityCommon.getPasswordForUser(testData.user))
          .set(COMMON_REQUEST_HEADERS)
          .send(testData.requestBody);
        ml.api.assertResponseStatusCode(testData.expected.responseCode, status, body);

        expect(body).to.eql(testData.expected.responseBody);
      });
    });
  });
};
