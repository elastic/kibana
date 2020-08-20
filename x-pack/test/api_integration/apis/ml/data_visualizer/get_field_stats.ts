/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const metricFieldsTestData = {
    testTitle: 'returns stats for metric fields over all time',
    index: 'ft_farequote',
    user: USER.ML_POWERUSER,
    requestBody: {
      query: {
        bool: {
          must: {
            term: { airline: 'JZA' }, // Only use one airline to ensure no sampling.
          },
        },
      },
      fields: [
        { type: 'number', cardinality: 0 },
        { fieldName: 'responsetime', type: 'number', cardinality: 4249 },
      ],
      samplerShardSize: -1, // No sampling, as otherwise counts could vary on each run.
      timeFieldName: '@timestamp',
      interval: '1d',
      maxExamples: 10,
    },
    expected: {
      responseCode: 200,
      responseBody: [
        {
          documentCounts: {
            interval: '1d',
            buckets: {
              '1454803200000': 846,
              '1454889600000': 846,
              '1454976000000': 859,
              '1455062400000': 851,
              '1455148800000': 858,
            },
          },
        },
        {
          // Cannot verify median and percentiles responses as the ES percentiles agg is non-deterministic.
          fieldName: 'responsetime',
          count: 4260,
          min: 963.4293212890625,
          max: 1042.13525390625,
          avg: 1000.0378077547315,
          isTopValuesSampled: false,
          topValues: [
            { key: 980.0411987304688, doc_count: 2 },
            { key: 989.278076171875, doc_count: 2 },
            { key: 989.763916015625, doc_count: 2 },
            { key: 991.290771484375, doc_count: 2 },
            { key: 992.0765991210938, doc_count: 2 },
            { key: 993.8115844726562, doc_count: 2 },
            { key: 993.8973999023438, doc_count: 2 },
            { key: 994.0230102539062, doc_count: 2 },
            { key: 994.364990234375, doc_count: 2 },
            { key: 994.916015625, doc_count: 2 },
          ],
          topValuesSampleSize: 4260,
          topValuesSamplerShardSize: -1,
        },
      ],
    },
  };

  const nonMetricFieldsTestData = {
    testTitle: 'returns stats for non-metric fields specifying query and time range',
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
      fields: [
        { fieldName: '@timestamp', type: 'date', cardinality: 4751 },
        { fieldName: '@version.keyword', type: 'keyword', cardinality: 1 },
        { fieldName: 'airline', type: 'keyword', cardinality: 19 },
        { fieldName: 'type', type: 'text', cardinality: 0 },
        { fieldName: 'type.keyword', type: 'keyword', cardinality: 1 },
      ],
      samplerShardSize: -1, // No sampling, as otherwise counts would vary on each run.
      timeFieldName: '@timestamp',
      earliest: 1454889600000, // February 8, 2016 12:00:00 AM GMT
      latest: 1454976000000, // February 9, 2016 12:00:00 AM GMT
      maxExamples: 10,
    },
    expected: {
      responseCode: 200,
      responseBody: [
        { fieldName: '@timestamp', count: 1733, earliest: 1454889602000, latest: 1454975948000 },
        {
          fieldName: '@version.keyword',
          isTopValuesSampled: false,
          topValues: [{ key: '1', doc_count: 1733 }],
          topValuesSampleSize: 1733,
          topValuesSamplerShardSize: -1,
        },
        {
          fieldName: 'airline',
          isTopValuesSampled: false,
          topValues: [{ key: 'AAL', doc_count: 1733 }],
          topValuesSampleSize: 1733,
          topValuesSamplerShardSize: -1,
        },
        {
          fieldName: 'type.keyword',
          isTopValuesSampled: false,
          topValues: [{ key: 'farequote', doc_count: 1733 }],
          topValuesSampleSize: 1733,
          topValuesSamplerShardSize: -1,
        },
        { fieldName: 'type', examples: ['farequote'] },
      ],
    },
  };

  const errorTestData = {
    testTitle: 'returns error for index which does not exist',
    index: 'ft_farequote_not_exists',
    user: USER.ML_POWERUSER,
    requestBody: {
      query: { bool: { must: [{ match_all: {} }] } },
      fields: [
        { type: 'number', cardinality: 0 },
        { fieldName: 'responsetime', type: 'number', cardinality: 4249 },
      ],
      samplerShardSize: -1, // No sampling, as otherwise counts could vary on each run.
      timeFieldName: '@timestamp',
      maxExamples: 10,
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

  async function runGetFieldStatsRequest(
    index: string,
    user: USER,
    requestBody: object,
    expectedResponsecode: number
  ): Promise<any> {
    const { body } = await supertest
      .post(`/api/ml/data_visualizer/get_field_stats/${index}`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send(requestBody)
      .expect(expectedResponsecode);

    return body;
  }

  function compareByFieldName(a: { fieldName: string }, b: { fieldName: string }) {
    if (a.fieldName < b.fieldName) {
      return -1;
    }
    if (a.fieldName > b.fieldName) {
      return 1;
    }
    return 0;
  }

  describe('get_field_stats', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    it(`${metricFieldsTestData.testTitle}`, async () => {
      const body = await runGetFieldStatsRequest(
        metricFieldsTestData.index,
        metricFieldsTestData.user,
        metricFieldsTestData.requestBody,
        metricFieldsTestData.expected.responseCode
      );

      // Cannot verify median and percentiles responses as the ES percentiles agg is non-deterministic.
      const expected = metricFieldsTestData.expected;
      expect(body).to.have.length(expected.responseBody.length);

      const actualDocCounts = body[0];
      const expectedDocCounts = expected.responseBody[0];
      expect(actualDocCounts).to.eql(expectedDocCounts);

      const actualFieldData = { ...body[1] };
      delete actualFieldData.median;
      delete actualFieldData.distribution;

      expect(actualFieldData).to.eql(expected.responseBody[1]);
    });

    it(`${nonMetricFieldsTestData.testTitle}`, async () => {
      const body = await runGetFieldStatsRequest(
        nonMetricFieldsTestData.index,
        nonMetricFieldsTestData.user,
        nonMetricFieldsTestData.requestBody,
        nonMetricFieldsTestData.expected.responseCode
      );

      // Sort the fields in the response before validating.
      const expectedRspFields = nonMetricFieldsTestData.expected.responseBody.sort(
        compareByFieldName
      );
      const actualRspFields = body.sort(compareByFieldName);
      expect(actualRspFields).to.eql(expectedRspFields);
    });

    it(`${errorTestData.testTitle}`, async () => {
      const body = await runGetFieldStatsRequest(
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
