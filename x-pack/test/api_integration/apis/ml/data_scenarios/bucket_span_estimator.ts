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
        aggTypes: ['sum'],
        duration: { start: 1325548800000, end: 1538092800000 },
        fields: ['sale_dollars'],
        index: 'iowa*',
        query: { bool: { must: [{ match_all: {} }] } },
        timeField: 'date',
      },
      expected: {
        responseCode: 200,
        responseBody: { name: '2d', ms: 172800000 },
      },
    },
  ];

  describe('bucket span estimator', function () {
    before(async () => {
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
  });
};
