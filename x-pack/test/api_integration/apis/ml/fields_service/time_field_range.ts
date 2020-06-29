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
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testDataList = [
    {
      testTitle: 'returns expected time range with index and match_all query',
      user: USER.ML_POWERUSER,
      requestBody: {
        index: 'ft_ecommerce',
        query: { bool: { must: [{ match_all: {} }] } },
        timeFieldName: 'order_date',
      },
      expected: {
        responseCode: 200,
        responseBody: {
          start: {
            epoch: 1560297859000,
            string: '2019-06-12T00:04:19.000Z',
          },
          end: {
            epoch: 1562975136000,
            string: '2019-07-12T23:45:36.000Z',
          },
          success: true,
        },
      },
    },
    {
      testTitle: 'returns expected time range with index and query',
      user: USER.ML_POWERUSER,
      requestBody: {
        index: 'ft_ecommerce',
        query: {
          term: {
            'customer_first_name.keyword': {
              value: 'Brigitte',
            },
          },
        },
        timeFieldName: 'order_date',
      },
      expected: {
        responseCode: 200,
        responseBody: {
          start: {
            epoch: 1560298982000,
            string: '2019-06-12T00:23:02.000Z',
          },
          end: {
            epoch: 1562973754000,
            string: '2019-07-12T23:22:34.000Z',
          },
          success: true,
        },
      },
    },
    {
      testTitle: 'returns error for index which does not exist',
      user: USER.ML_POWERUSER,
      requestBody: {
        index: 'ft_ecommerce_not_exist',
        query: { bool: { must: [{ match_all: {} }] } },
        timeFieldName: 'order_date',
      },
      expected: {
        responseCode: 404,
        responseBody: {
          statusCode: 404,
          error: 'Not Found',
          message:
            '[index_not_found_exception] no such index [ft_ecommerce_not_exist], with { resource.type="index_or_alias" & resource.id="ft_ecommerce_not_exist" & index_uuid="_na_" & index="ft_ecommerce_not_exist" }',
        },
      },
    },
  ];

  describe('time_field_range', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/ecommerce');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    for (const testData of testDataList) {
      it(`${testData.testTitle}`, async () => {
        const { body } = await supertest
          .post('/api/ml/fields_service/time_field_range')
          .auth(testData.user, ml.securityCommon.getPasswordForUser(testData.user))
          .set(COMMON_REQUEST_HEADERS)
          .send(testData.requestBody)
          .expect(testData.expected.responseCode);

        if (body.error === undefined) {
          expect(body).to.eql(testData.expected.responseBody);
        } else {
          expect(body.error).to.eql(testData.expected.responseBody.error);
          expect(body.message).to.eql(testData.expected.responseBody.message);
        }
      });
    }
  });
};
