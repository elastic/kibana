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

  const fieldHistogramsTestData = {
    testTitle: 'returns histogram data for fields',
    index: 'ft_farequote',
    user: USER.ML_POWERUSER,
    requestBody: {
      query: { bool: { should: [{ match_phrase: { airline: 'JZA' } }], minimum_should_match: 1 } },
      fields: [
        { fieldName: '@timestamp', type: 'date' },
        { fieldName: 'airline', type: 'string' },
        { fieldName: 'responsetime', type: 'number' },
      ],
      samplerShardSize: -1, // No sampling, as otherwise counts could vary on each run.
    },
    expected: {
      responseCode: 200,
      responseBody: [
        {
          dataLength: 20,
          type: 'numeric',
          id: '@timestamp',
        },
        { type: 'ordinal', dataLength: 1, id: 'airline' },
        {
          dataLength: 20,
          type: 'numeric',
          id: 'responsetime',
        },
      ],
    },
  };

  const errorTestData = {
    testTitle: 'returns error for index which does not exist',
    index: 'ft_farequote_not_exists',
    user: USER.ML_POWERUSER,
    requestBody: {
      query: { bool: { must: [{ match_all: {} }] } },
      fields: [{ fieldName: 'responsetime', type: 'number' }],
      samplerShardSize: -1,
    },
    expected: {
      responseCode: 404,
      responseBody: {
        statusCode: 404,
        error: 'Not Found',
        message:
          '[index_not_found_exception] no such index [ft_farequote_not_exists], with { resource.type="index_or_alias" & resource.id="ft_farequote_not_exists" & index_uuid="_na_" & index="ft_farequote_not_exists" }',
      },
    },
  };

  async function runGetFieldHistogramsRequest(
    index: string,
    user: USER,
    requestBody: object,
    expectedResponsecode: number
  ): Promise<any> {
    const { body } = await supertest
      .post(`/api/ml/data_visualizer/get_field_histograms/${index}`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send(requestBody)
      .expect(expectedResponsecode);

    return body;
  }

  describe('get_field_histograms', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    it(`${fieldHistogramsTestData.testTitle}`, async () => {
      const body = await runGetFieldHistogramsRequest(
        fieldHistogramsTestData.index,
        fieldHistogramsTestData.user,
        fieldHistogramsTestData.requestBody,
        fieldHistogramsTestData.expected.responseCode
      );

      const expected = fieldHistogramsTestData.expected;

      const actual = body.map((b: any) => ({
        dataLength: b.data.length,
        type: b.type,
        id: b.id,
      }));
      expect(actual).to.eql(expected.responseBody);
    });

    it(`${errorTestData.testTitle}`, async () => {
      const body = await runGetFieldHistogramsRequest(
        errorTestData.index,
        errorTestData.user,
        errorTestData.requestBody,
        errorTestData.expected.responseCode
      );

      expect(body.error).to.eql(errorTestData.expected.responseBody.error);
      expect(body.message).to.eql(errorTestData.expected.responseBody.message);
    });
  });
};
