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
      testTitle: 'returns cardinality of customer name fields over full time range',
      user: USER.ML_POWERUSER,
      requestBody: {
        index: 'ft_ecommerce',
        fieldNames: ['customer_first_name.keyword', 'customer_last_name.keyword'],
        query: { bool: { must: [{ match_all: {} }] } },
        timeFieldName: 'order_date',
      },
      expected: {
        responseBody: {
          'customer_first_name.keyword': 46,
          'customer_last_name.keyword': 183,
        },
      },
    },
    {
      testTitle: 'returns cardinality of geoip fields over specified range',
      user: USER.ML_POWERUSER,
      requestBody: {
        index: 'ft_ecommerce',
        fieldNames: ['geoip.city_name', 'geoip.continent_name', 'geoip.country_iso_code'],
        query: { bool: { must: [{ match_all: {} }] } },
        timeFieldName: 'order_date',
        earliestMs: 1560556800000, // June 15, 2019 12:00:00 AM GMT
        latestMs: 1560643199000, //  June 15, 2019 11:59:59 PM GMT
      },
      expected: {
        responseBody: {
          'geoip.city_name': 10,
          'geoip.continent_name': 5,
          'geoip.country_iso_code': 9,
        },
      },
    },
    {
      testTitle: 'returns empty response for non aggregatable field',
      user: USER.ML_POWERUSER,
      requestBody: {
        index: 'ft_ecommerce',
        fieldNames: ['manufacturer'],
        query: { bool: { must: [{ match_all: {} }] } },
        timeFieldName: 'order_date',
        earliestMs: 1560556800000, // June 15, 2019 12:00:00 AM GMT
        latestMs: 1560643199000, //  June 15, 2019 11:59:59 PM GMT
      },
      expected: {
        responseBody: {},
      },
    },
    {
      testTitle: 'returns error for index which does not exist',
      user: USER.ML_POWERUSER,
      requestBody: {
        index: 'ft_ecommerce_not_exist',
        fieldNames: ['customer_first_name.keyword', 'customer_last_name.keyword'],
        timeFieldName: 'order_date',
      },
      expected: {
        responseBody: {
          statusCode: 404,
          error: 'Not Found',
          message:
            '[index_not_found_exception] no such index [ft_ecommerce_not_exist], with { resource.type="index_or_alias" & resource.id="ft_ecommerce_not_exist" & index_uuid="_na_" & index="ft_ecommerce_not_exist" }',
        },
      },
    },
  ];

  describe('field_cardinality', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/ecommerce');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    for (const testData of testDataList) {
      it(`${testData.testTitle}`, async () => {
        const { body } = await supertest
          .post('/api/ml/fields_service/field_cardinality')
          .auth(testData.user, ml.securityCommon.getPasswordForUser(testData.user))
          .set(COMMON_REQUEST_HEADERS)
          .send(testData.requestBody);

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
