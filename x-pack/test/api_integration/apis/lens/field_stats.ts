/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

const TEST_START_TIME = '2015-09-19T06:31:44.000';
const TEST_END_TIME = '2015-09-23T18:31:44.000';
const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('index stats apis', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('visualize/default');
    });
    after(async () => {
      await esArchiver.unload('logstash_functional');
      await esArchiver.unload('visualize/default');
    });

    describe('field distribution', () => {
      it('should return an auto histogram for numbers and top values', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/logstash-2015.09.22/field')
          .set(COMMON_HEADERS)
          .send({
            query: { match_all: {} },
            earliest: TEST_START_TIME,
            latest: TEST_END_TIME,
            timeFieldName: '@timestamp',
            field: {
              name: 'bytes',
              type: 'number',
            },
          })
          .expect(200);

        expect(body).to.eql({
          histogram: {
            doc_count: 4633,
            histo: {
              buckets: [
                {
                  doc_count: 705,
                  key: 0,
                },
                {
                  doc_count: 898,
                  key: 1999,
                },
                {
                  doc_count: 885,
                  key: 3998,
                },
                {
                  doc_count: 970,
                  key: 5997,
                },
                {
                  doc_count: 939,
                  key: 7996,
                },
                {
                  doc_count: 44,
                  key: 9995,
                },
                {
                  doc_count: 43,
                  key: 11994,
                },
                {
                  doc_count: 43,
                  key: 13993,
                },
                {
                  doc_count: 57,
                  key: 15992,
                },
                {
                  doc_count: 49,
                  key: 17991,
                },
              ],
            },
          },
          top_values: {
            sum_other_doc_count: 4448,
            doc_count_error_upper_bound: 0,
            buckets: [
              {
                doc_count: 147,
                key: 0,
              },
              {
                doc_count: 5,
                key: 3954,
              },
              {
                doc_count: 5,
                key: 6497,
              },
              {
                doc_count: 4,
                key: 1840,
              },
              {
                doc_count: 4,
                key: 4206,
              },
              {
                doc_count: 4,
                key: 4328,
              },
              {
                doc_count: 4,
                key: 4669,
              },
              {
                doc_count: 4,
                key: 5846,
              },
              {
                doc_count: 4,
                key: 5863,
              },
              {
                doc_count: 4,
                key: 6631,
              },
            ],
          },
        });
      });

      it('should return an auto histogram for dates', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/logstash-2015.09.22/field')
          .set(COMMON_HEADERS)
          .send({
            query: { match_all: {} },
            earliest: TEST_START_TIME,
            latest: TEST_END_TIME,
            timeFieldName: '@timestamp',
            field: {
              name: '@timestamp',
              type: 'date',
            },
          })
          .expect(200);

        expect(body).to.eql({
          histogram: {
            histo: {
              buckets: [
                {
                  doc_count: 1161,
                  key: 1442875680000,
                  key_as_string: '2015-09-21T22:48:00.000Z',
                },
                {
                  doc_count: 3420,
                  key: 1442914560000,
                  key_as_string: '2015-09-22T09:36:00.000Z',
                },
                {
                  doc_count: 52,
                  key: 1442953440000,
                  key_as_string: '2015-09-22T20:24:00.000Z',
                },
              ],
            },
          },
        });
      });

      it('should return top values for strings', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/logstash-2015.09.22/field')
          .set(COMMON_HEADERS)
          .send({
            query: { match_all: {} },
            earliest: TEST_START_TIME,
            latest: TEST_END_TIME,
            timeFieldName: '@timestamp',
            field: {
              name: 'geo.src',
              type: 'string',
            },
          })
          .expect(200);

        expect(body).to.eql({
          doc_count: 4633,
          top_values: {
            sum_other_doc_count: 1798,
            doc_count_error_upper_bound: 0,
            buckets: [
              {
                doc_count: 832,
                key: 'CN',
              },
              {
                doc_count: 804,
                key: 'IN',
              },
              {
                doc_count: 425,
                key: 'US',
              },
              {
                doc_count: 158,
                key: 'ID',
              },
              {
                doc_count: 143,
                key: 'BR',
              },
              {
                doc_count: 116,
                key: 'PK',
              },
              {
                doc_count: 106,
                key: 'BD',
              },
              {
                doc_count: 94,
                key: 'NG',
              },
              {
                doc_count: 84,
                key: 'RU',
              },
              {
                doc_count: 73,
                key: 'JP',
              },
            ],
          },
        });
      });
    });
  });
};
