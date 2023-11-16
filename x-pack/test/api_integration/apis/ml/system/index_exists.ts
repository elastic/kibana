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

  const responseBody = {
    ft_farequote_small: { exists: true },
    'ft_farequote_*': { exists: true }, // wildcard
    ft_farequote_fail: { exists: false },
    'ft_farequote_fail_*': { exists: false }, // wildcard
  };

  const testDataList = [
    {
      testTitle: 'as ML Poweruser',
      user: USER.ML_POWERUSER,
      requestBody: {
        indices: Object.keys(responseBody),
      },
      expected: {
        responseCode: 200,
        responseBody,
      },
    },
  ];

  const testDataListUnauthorized = [
    {
      testTitle: 'as ML Viewer',
      user: USER.ML_VIEWER,
      requestBody: {
        indices: Object.keys(responseBody),
      },
      expected: {
        responseCode: 403,
        error: 'Forbidden',
      },
    },
    {
      testTitle: 'as ML Unauthorized user',
      user: USER.ML_UNAUTHORIZED,
      requestBody: {
        jobIds: Object.keys(responseBody),
      },
      expected: {
        responseCode: 403,
        error: 'Forbidden',
      },
    },
  ];

  async function runRequest(user: USER, requestBody: object, expectedStatusCode: number) {
    const { body, status } = await supertest
      .post('/internal/ml/index_exists')
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'))
      .send(requestBody);

    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);
    return body;
  }

  describe('POST ml/index_exists', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote_small');
    });

    describe('should correctly check if indices exist ', function () {
      for (const testData of testDataList) {
        it(`${testData.testTitle}`, async () => {
          const body = await runRequest(
            testData.user,
            testData.requestBody,
            testData.expected.responseCode
          );
          const expectedResponse = testData.expected.responseBody;
          expect(body).to.eql(expectedResponse);
        });
      }
    });

    describe('rejects request', function () {
      for (const testData of testDataListUnauthorized) {
        describe('fails to check if indices exist', function () {
          it(`${testData.testTitle}`, async () => {
            const body = await runRequest(
              testData.user,
              testData.requestBody,
              testData.expected.responseCode
            );

            expect(body).to.have.property('error').eql(testData.expected.error);
          });
        });
      }
    });
  });
};
