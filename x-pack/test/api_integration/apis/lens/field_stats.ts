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
      it('should return a 404 for missing index patterns', async () => {
        await supertest
          .post('/api/lens/index_stats/logstash/field')
          .set(COMMON_HEADERS)
          .send({
            dslQuery: { match_all: {} },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            timeFieldName: '@timestamp',
            field: {
              name: 'bytes',
              type: 'number',
            },
          })
          .expect(404);
      });

      it('should also work without specifying a time field', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/logstash-2015.09.22/field')
          .set(COMMON_HEADERS)
          .send({
            dslQuery: { match_all: {} },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            field: {
              name: 'bytes',
              type: 'number',
            },
          })
          .expect(200);

        expect(body).to.have.property('totalDocuments', 4633);
      });

      it('should return an auto histogram for numbers and top values', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/logstash-2015.09.22/field')
          .set(COMMON_HEADERS)
          .send({
            dslQuery: { match_all: {} },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            timeFieldName: '@timestamp',
            field: {
              name: 'bytes',
              type: 'number',
            },
          })
          .expect(200);

        expect(body).to.eql({
          totalDocuments: 4633,
          sampledDocuments: 4633,
          sampledValues: 4633,
          histogram: {
            buckets: [
              {
                count: 705,
                key: 0,
              },
              {
                count: 898,
                key: 1999,
              },
              {
                count: 885,
                key: 3998,
              },
              {
                count: 970,
                key: 5997,
              },
              {
                count: 939,
                key: 7996,
              },
              {
                count: 44,
                key: 9995,
              },
              {
                count: 43,
                key: 11994,
              },
              {
                count: 43,
                key: 13993,
              },
              {
                count: 57,
                key: 15992,
              },
              {
                count: 49,
                key: 17991,
              },
            ],
          },
          topValues: {
            buckets: [
              {
                count: 147,
                key: 0,
              },
              {
                count: 5,
                key: 3954,
              },
              {
                count: 5,
                key: 6497,
              },
              {
                count: 4,
                key: 1840,
              },
              {
                count: 4,
                key: 4206,
              },
              {
                count: 4,
                key: 4328,
              },
              {
                count: 4,
                key: 4669,
              },
              {
                count: 4,
                key: 5846,
              },
              {
                count: 4,
                key: 5863,
              },
              {
                count: 4,
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
            dslQuery: { match_all: {} },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            timeFieldName: '@timestamp',
            field: {
              name: '@timestamp',
              type: 'date',
            },
          })
          .expect(200);

        expect(body).to.eql({
          totalDocuments: 4633,
          histogram: {
            buckets: [
              {
                count: 1161,
                key: 1442875680000,
              },
              {
                count: 3420,
                key: 1442914560000,
              },
              {
                count: 52,
                key: 1442953440000,
              },
            ],
          },
        });
      });

      it('should return top values for strings', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/logstash-2015.09.22/field')
          .set(COMMON_HEADERS)
          .send({
            dslQuery: { match_all: {} },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            timeFieldName: '@timestamp',
            field: {
              name: 'geo.src',
              type: 'string',
            },
          })
          .expect(200);

        expect(body).to.eql({
          totalDocuments: 4633,
          sampledDocuments: 4633,
          sampledValues: 4633,
          topValues: {
            buckets: [
              {
                count: 832,
                key: 'CN',
              },
              {
                count: 804,
                key: 'IN',
              },
              {
                count: 425,
                key: 'US',
              },
              {
                count: 158,
                key: 'ID',
              },
              {
                count: 143,
                key: 'BR',
              },
              {
                count: 116,
                key: 'PK',
              },
              {
                count: 106,
                key: 'BD',
              },
              {
                count: 94,
                key: 'NG',
              },
              {
                count: 84,
                key: 'RU',
              },
              {
                count: 73,
                key: 'JP',
              },
            ],
          },
        });
      });

      it('should apply filters and queries', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/logstash-2015.09.22/field')
          .set(COMMON_HEADERS)
          .send({
            dslQuery: {
              bool: {
                filter: [{ match: { 'geo.src': 'US' } }],
              },
            },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            timeFieldName: '@timestamp',
            field: {
              name: 'bytes',
              type: 'number',
            },
          })
          .expect(200);

        expect(body.totalDocuments).to.eql(425);
      });
    });
  });
};
