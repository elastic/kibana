/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { USER } from '../../../functional/services/machine_learning/security_common';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

const start = 1554463535770;
const end = 1574316073914;
const analyzer = {
  tokenizer: 'ml_classic',
  filter: [
    {
      type: 'stop',
      stopwords: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat',
        'Sun',
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
        'GMT',
        'UTC',
      ],
    },
  ],
};
const defaultRequestBody = {
  indexPatternTitle: 'categorization_functional_test',
  query: { bool: { must: [{ match_all: {} }] } },
  size: 5,
  timeField: '@timestamp',
  start,
  end,
  analyzer,
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const mlSecurity = getService('mlSecurity');

  const testDataList = [
    {
      title: 'valid with good number of tokens',
      user: USER.ML_POWERUSER,
      requestBody: {
        ...defaultRequestBody,
        field: 'field1',
      },
      expected: {
        responseCode: 200,
        overallValidStatus: 'valid',
        sampleSize: 1000,
        exampleLength: 5,
        validationChecks: [
          {
            id: 0,
            valid: 'valid',
            message: '1000 field values analyzed, 95% contain 3 or more tokens.',
          },
        ],
      },
    },
    {
      title: 'invalid, too many tokens.',
      user: USER.ML_POWERUSER,
      requestBody: {
        ...defaultRequestBody,
        field: 'field2',
      },
      expected: {
        responseCode: 200,
        overallValidStatus: 'invalid',
        sampleSize: 500,
        exampleLength: 5,
        validationChecks: [
          {
            id: 1,
            valid: 'partially_valid',
            message: 'The median length for the field values analyzed is over 400 characters.',
          },
          {
            id: 4,
            valid: 'invalid',
            message:
              'Tokenization of field value examples has failed due to more than 10000 tokens being found in a sample of 50 values.',
          },
        ],
      },
    },
    {
      title: 'partially valid, more than 75% are null',
      user: USER.ML_POWERUSER,
      requestBody: {
        ...defaultRequestBody,
        field: 'field3',
      },
      expected: {
        responseCode: 200,
        overallValidStatus: 'partially_valid',
        sampleSize: 250,
        exampleLength: 5,
        validationChecks: [
          {
            id: 0,
            valid: 'valid',
            message: '250 field values analyzed, 95% contain 3 or more tokens.',
          },
          {
            id: 2,
            valid: 'partially_valid',
            message: 'More than 75% of field values are null.',
          },
        ],
      },
    },
    {
      title: 'partially valid, median length is over 400 characters',
      user: USER.ML_POWERUSER,
      requestBody: {
        ...defaultRequestBody,
        field: 'field4',
      },
      expected: {
        responseCode: 200,
        overallValidStatus: 'partially_valid',
        sampleSize: 500,
        exampleLength: 5,
        validationChecks: [
          {
            id: 0,
            valid: 'valid',
            message: '500 field values analyzed, 100% contain 3 or more tokens.',
          },
          {
            id: 1,
            valid: 'partially_valid',
            message: 'The median length for the field values analyzed is over 400 characters.',
          },
        ],
      },
    },
    {
      title: 'invalid, no values in any doc',
      user: USER.ML_POWERUSER,
      requestBody: {
        ...defaultRequestBody,
        field: 'field5',
      },
      expected: {
        responseCode: 200,
        overallValidStatus: 'invalid',
        sampleSize: 0,
        exampleLength: 0,
        validationChecks: [
          {
            id: 3,
            valid: 'invalid',
            message:
              'No examples for this field could be found. Please ensure the selected date range contains data.',
          },
        ],
      },
    },
    {
      title: 'invalid, mostly made up of stop words, so no matched tokens',
      user: USER.ML_POWERUSER,
      requestBody: {
        ...defaultRequestBody,
        field: 'field6',
      },
      expected: {
        responseCode: 200,
        overallValidStatus: 'invalid',
        sampleSize: 1000,
        exampleLength: 5,
        validationChecks: [
          {
            id: 0,
            valid: 'invalid',
            message: '1000 field values analyzed, 0% contain 3 or more tokens.',
          },
        ],
      },
    },
    {
      title: 'valid, mostly made up of stop words, but analyser has no stop words. so it is ok.',
      user: USER.ML_POWERUSER,
      requestBody: {
        ...defaultRequestBody,
        field: 'field6',
        analyzer: {
          tokenizer: 'ml_classic',
        },
      },
      expected: {
        responseCode: 200,
        overallValidStatus: 'valid',
        sampleSize: 1000,
        exampleLength: 5,
        validationChecks: [
          {
            id: 0,
            valid: 'valid',
            message: '1000 field values analyzed, 100% contain 3 or more tokens.',
          },
        ],
      },
    },
    {
      title: 'partially valid, half the docs are stop words.',
      user: USER.ML_POWERUSER,
      requestBody: {
        ...defaultRequestBody,
        field: 'field7',
      },
      expected: {
        responseCode: 200,
        overallValidStatus: 'partially_valid',
        sampleSize: 1000,
        exampleLength: 5,
        validationChecks: [
          {
            id: 0,
            valid: 'partially_valid',
            message: '1000 field values analyzed, 50% contain 3 or more tokens.',
          },
        ],
      },
    },
    {
      title: "endpoint error, index doesn't exist",
      user: USER.ML_POWERUSER,
      requestBody: {
        ...defaultRequestBody,
        indexPatternTitle: 'does_not_exist',
        field: 'field1',
      },
      expected: {
        responseCode: 404,
        overallValidStatus: undefined,
        sampleSize: undefined,
        validationChecks: undefined,
      },
    },
  ];

  describe('Categorization example endpoint - ', function() {
    before(async () => {
      await esArchiver.load('ml/categorization');
    });

    after(async () => {
      await esArchiver.unload('ml/categorization');
    });

    for (const testData of testDataList) {
      it(testData.title, async () => {
        const { body } = await supertest
          .post('/api/ml/jobs/categorization_field_examples')
          .auth(testData.user, mlSecurity.getPasswordForUser(testData.user))
          .set(COMMON_HEADERS)
          .send(testData.requestBody)
          .expect(testData.expected.responseCode);

        expect(body.overallValidStatus).to.eql(testData.expected.overallValidStatus);
        expect(body.sampleSize).to.eql(testData.expected.sampleSize);
        expect(body.validationChecks).to.eql(testData.expected.validationChecks);
        if (body.statusCode === 200) {
          expect(body.examples.length).to.eql(testData.expected.exampleLength);
        }
      });
    }
  });
};
