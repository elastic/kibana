/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testDataList = [
    {
      testTitle: 'should successfully create new filter',
      user: USER.ML_POWERUSER,
      requestBody: { filterId: 'safe_ip_addresses', description: '', items: ['104.236.210.185'] },
      expected: {
        responseCode: 200,
        responseBody: {
          filter_id: 'safe_ip_addresses',
          description: '',
          items: ['104.236.210.185'],
        },
      },
    },
    {
      testTitle: 'should not create new filter for user without required permission',
      user: USER.ML_VIEWER,
      requestBody: {
        filterId: 'safe_ip_addresses_view_only',

        description: '',
        items: ['104.236.210.185'],
      },
      expected: {
        responseCode: 404,
        responseBody: {
          error: 'Not Found',
          message: 'Not Found',
        },
      },
    },
    {
      testTitle: 'should not create new filter for unauthorized user',
      user: USER.ML_UNAUTHORIZED,
      requestBody: {
        filterId: 'safe_ip_addresses_unauthorized',
        description: '',
        items: ['104.236.210.185'],
      },
      expected: {
        responseCode: 404,
        responseBody: {
          error: 'Not Found',
          message: 'Not Found',
        },
      },
    },
  ];

  describe('create_filters', function () {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      for (const testData of testDataList) {
        const { filterId } = testData.requestBody;
        await ml.api.deleteFilter(filterId);
      }
    });

    for (const testData of testDataList) {
      const { testTitle, user, requestBody, expected } = testData;
      it(`${testTitle}`, async () => {
        const { body } = await supertest
          .put(`/api/ml/filters`)
          .auth(user, ml.securityCommon.getPasswordForUser(user))
          .set(COMMON_REQUEST_HEADERS)
          .send(requestBody)
          .expect(expected.responseCode);
        if (body.error === undefined) {
          // Validate the important parts of the response.
          const expectedResponse = testData.expected.responseBody;
          expect(body).to.eql(expectedResponse);
        } else {
          expect(body.error).to.eql(expected.responseBody.error);
          expect(body.message).to.eql(expected.responseBody.message);
        }
      });
    }

    it(`should return 400 bad request if invalid filterId`, async () => {
      await supertest
        .put(`/api/ml/filters`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send({ filterId: '@invalid_filter_id', description: '', items: ['104.236.210.185'] })
        .expect(400);
    });

    it(`should return 400 bad request if invalid items`, async () => {
      await supertest
        .put(`/api/ml/filters`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send({ filterId: 'valid_filter', description: '' })
        .expect(400);
    });
  });
};
