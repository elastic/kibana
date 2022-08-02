/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

const TEST_START_TIME = '2015-09-19T06:31:44.000';
const TEST_END_TIME = '2015-09-23T18:31:44.000';
const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');

  describe('index stats apis', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
    });

    describe('field distribution', () => {
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/visualize/default'
        );
      });
      after(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('should return a 404 for missing index patterns', async () => {
        await supertest
          .post('/api/lens/index_stats/123/field')
          .set(COMMON_HEADERS)
          .send({
            dslQuery: { match_all: {} },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            timeFieldName: '@timestamp',
            fieldName: 'bytes',
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
            fieldName: 'bytes',
          })
          .expect(200);

        expect(body).to.have.property('totalDocuments', 4634);
      });

      it('should return an auto histogram for numbers and top values', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/logstash-2015.09.22/field')
          .set(COMMON_HEADERS)
          .send({
            dslQuery: { match_all: {} },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            fieldName: 'bytes',
          })
          .expect(200);

        expect(body).to.eql({
          totalDocuments: 4634,
          sampledDocuments: 4634,
          sampledValues: 4634,
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
                count: 886,
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
                key: 5846,
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
            fieldName: '@timestamp',
          })
          .expect(200);

        expect(body).to.eql({
          totalDocuments: 4634,
          histogram: {
            buckets: [
              {
                count: 1162,
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
            fieldName: 'geo.src',
          })
          .expect(200);

        expect(body).to.eql({
          totalDocuments: 4634,
          sampledDocuments: 4634,
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

      it('should return top values for ip fields', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/logstash-2015.09.22/field')
          .set(COMMON_HEADERS)
          .send({
            dslQuery: { match_all: {} },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            fieldName: 'ip',
          })
          .expect(200);

        expect(body).to.eql({
          totalDocuments: 4634,
          sampledDocuments: 4634,
          sampledValues: 4633,
          topValues: {
            buckets: [
              {
                count: 13,
                key: '177.194.175.66',
              },
              {
                count: 12,
                key: '18.55.141.62',
              },
              {
                count: 12,
                key: '53.55.251.105',
              },
              {
                count: 11,
                key: '21.111.249.239',
              },
              {
                count: 11,
                key: '97.63.84.25',
              },
              {
                count: 11,
                key: '100.99.207.174',
              },
              {
                count: 11,
                key: '112.34.138.226',
              },
              {
                count: 11,
                key: '194.68.89.92',
              },
              {
                count: 11,
                key: '235.186.79.201',
              },
              {
                count: 10,
                key: '57.79.108.136',
              },
            ],
          },
        });
      });

      it('should return histograms for scripted date fields', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/logstash-2015.09.22/field')
          .set(COMMON_HEADERS)
          .send({
            dslQuery: { match_all: {} },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            fieldName: 'scripted_date',
          })
          .expect(200);

        expect(body).to.eql({
          histogram: {
            buckets: [
              {
                count: 4634,
                key: 0,
              },
            ],
          },
          totalDocuments: 4634,
        });
      });

      it('should return top values for scripted string fields', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/logstash-2015.09.22/field')
          .set(COMMON_HEADERS)
          .send({
            dslQuery: { match_all: {} },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            fieldName: 'scripted_string',
          })
          .expect(200);

        expect(body).to.eql({
          totalDocuments: 4634,
          sampledDocuments: 4634,
          sampledValues: 4634,
          topValues: {
            buckets: [
              {
                count: 4634,
                key: 'hello',
              },
            ],
          },
        });
      });

      it('should return top values for index pattern runtime string fields', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/logstash-2015.09.22/field')
          .set(COMMON_HEADERS)
          .send({
            dslQuery: { match_all: {} },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            fieldName: 'runtime_string_field',
          })
          .expect(200);

        expect(body).to.eql({
          totalDocuments: 4634,
          sampledDocuments: 4634,
          sampledValues: 4634,
          topValues: {
            buckets: [
              {
                count: 4634,
                key: 'hello world!',
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
            fieldName: 'bytes',
          })
          .expect(200);

        expect(body.totalDocuments).to.eql(425);
      });

      it('should allow filtering on a runtime field other than the field in use', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/logstash-2015.09.22/field')
          .set(COMMON_HEADERS)
          .send({
            dslQuery: {
              bool: {
                filter: [{ exists: { field: 'runtime_string_field' } }],
              },
            },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            fieldName: 'runtime_number_field',
          })
          .expect(200);

        expect(body).to.eql({
          totalDocuments: 4634,
          sampledDocuments: 4634,
          sampledValues: 4634,
          topValues: {
            buckets: [
              {
                count: 4634,
                key: 5,
              },
            ],
          },
          histogram: { buckets: [] },
        });
      });
    });

    describe('histogram', () => {
      before(async () => {
        await esArchiver.loadIfNeeded(
          'x-pack/test/functional/es_archives/pre_calculated_histogram'
        );
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/pre_calculated_histogram');
      });

      it('should return an auto histogram for precalculated histograms', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/histogram-test/field')
          .set(COMMON_HEADERS)
          .send({
            dslQuery: { match_all: {} },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            fieldName: 'histogram-content',
          })
          .expect(200);

        expect(body).to.eql({
          histogram: {
            buckets: [
              {
                count: 237,
                key: 0,
              },
              {
                count: 323,
                key: 0.47000000000000003,
              },
              {
                count: 454,
                key: 0.9400000000000001,
              },
              {
                count: 166,
                key: 1.4100000000000001,
              },
              {
                count: 168,
                key: 1.8800000000000001,
              },
              {
                count: 425,
                key: 2.35,
              },
              {
                count: 311,
                key: 2.8200000000000003,
              },
              {
                count: 391,
                key: 3.29,
              },
              {
                count: 406,
                key: 3.7600000000000002,
              },
              {
                count: 324,
                key: 4.23,
              },
              {
                count: 628,
                key: 4.7,
              },
            ],
          },
          sampledDocuments: 7,
          sampledValues: 3833,
          totalDocuments: 7,
          topValues: { buckets: [] },
        });
      });

      it('should return a single-value histogram when filtering a precalculated histogram', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/histogram-test/field')
          .set(COMMON_HEADERS)
          .send({
            dslQuery: { match: { 'histogram-title': 'single value' } },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            fieldName: 'histogram-content',
          })
          .expect(200);

        expect(body).to.eql({
          histogram: { buckets: [{ count: 1, key: 1 }] },
          sampledDocuments: 1,
          sampledValues: 1,
          totalDocuments: 1,
          topValues: { buckets: [] },
        });
      });
    });
  });
};
