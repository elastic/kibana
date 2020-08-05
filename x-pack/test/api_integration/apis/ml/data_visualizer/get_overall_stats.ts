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
      testTitle: 'returns stats over all time',
      index: 'ft_farequote',
      user: USER.ML_POWERUSER,
      requestBody: {
        query: { bool: { must: [{ match_all: {} }] } },
        aggregatableFields: ['@timestamp', 'airline', 'responsetime', 'sourcetype'],
        nonAggregatableFields: ['type'],
        samplerShardSize: -1, // No sampling, as otherwise counts would vary on each run.
        timeFieldName: '@timestamp',
      },
      expected: {
        responseCode: 200,
        responseBody: {
          totalCount: 86274,
          aggregatableExistsFields: [
            {
              fieldName: '@timestamp',
              existsInDocs: true,
              stats: { sampleCount: 86274, count: 86274, cardinality: 78580 },
            },
            {
              fieldName: 'airline',
              existsInDocs: true,
              stats: { sampleCount: 86274, count: 86274, cardinality: 19 },
            },
            {
              fieldName: 'responsetime',
              existsInDocs: true,
              stats: { sampleCount: 86274, count: 86274, cardinality: 83346 },
            },
          ],
          aggregatableNotExistsFields: [{ fieldName: 'sourcetype', existsInDocs: false }],
          nonAggregatableExistsFields: [{ fieldName: 'type', existsInDocs: true, stats: {} }],
          nonAggregatableNotExistsFields: [],
        },
      },
    },
    {
      testTitle: 'returns stats when specifying query and time range',
      index: 'ft_farequote',
      user: USER.ML_POWERUSER,
      requestBody: {
        query: {
          bool: {
            must: {
              term: { airline: 'AAL' },
            },
          },
        },
        aggregatableFields: ['@timestamp', 'airline', 'responsetime', 'sourcetype'],
        nonAggregatableFields: ['type'],
        samplerShardSize: -1, // No sampling, as otherwise counts would vary on each run.
        timeFieldName: '@timestamp',
        earliest: 1454889600000, // February 8, 2016 12:00:00 AM GMT
        latest: 1454976000000, // February 9, 2016 12:00:00 AM GMT
      },
      expected: {
        responseCode: 200,
        responseBody: {
          totalCount: 1733,
          aggregatableExistsFields: [
            {
              fieldName: '@timestamp',
              existsInDocs: true,
              stats: { sampleCount: 1733, count: 1733, cardinality: 1713 },
            },
            {
              fieldName: 'airline',
              existsInDocs: true,
              stats: { sampleCount: 1733, count: 1733, cardinality: 1 },
            },
            {
              fieldName: 'responsetime',
              existsInDocs: true,
              stats: { sampleCount: 1733, count: 1733, cardinality: 1730 },
            },
          ],
          aggregatableNotExistsFields: [{ fieldName: 'sourcetype', existsInDocs: false }],
          nonAggregatableExistsFields: [{ fieldName: 'type', existsInDocs: true, stats: {} }],
          nonAggregatableNotExistsFields: [],
        },
      },
    },
    {
      testTitle: 'returns error for index which does not exist',
      index: 'ft_farequote_not_exist',
      user: USER.ML_POWERUSER,
      requestBody: {
        query: { bool: { must: [{ match_all: {} }] } },
        aggregatableFields: ['@timestamp', 'airline', 'responsetime', 'sourcetype'],
        nonAggregatableFields: ['@version', 'type'],
        samplerShardSize: 1000,
        timeFieldName: '@timestamp',
      },
      expected: {
        responseCode: 404,
        responseBody: {
          statusCode: 404,
          error: 'Not Found',
          message:
            '[index_not_found_exception] no such index [ft_farequote_not_exist], with { resource.type="index_or_alias" & resource.id="ft_farequote_not_exist" & index_uuid="_na_" & index="ft_farequote_not_exist" }',
        },
      },
    },
  ];

  describe('get_overall_stats', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    for (const testData of testDataList) {
      it(`${testData.testTitle}`, async () => {
        const { body } = await supertest
          .post(`/api/ml/data_visualizer/get_overall_stats/${testData.index}`)
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
