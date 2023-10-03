/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import supertest from 'supertest';
import { JobParamsDownloadCSV } from '@kbn/reporting-plugin/server/export_types/csv_searchsource_immediate/types';
import { FtrProviderContext } from '../ftr_provider_context';

const getMockJobParams = (obj: object) => {
  return {
    title: `Mock CSV Title`,
    ...obj,
  } as JobParamsDownloadCSV;
};

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const supertestSvc = getService('supertest');

  const generateAPI = {
    getCSVFromSearchSource: async (job: JobParamsDownloadCSV) => {
      return await supertestSvc
        .post(`/internal/reporting/generate/immediate/csv_searchsource`)
        .set('kbn-xsrf', 'xxx')
        .send(job);
    },
  };


  describe('CSV Generation from SearchSource', () => {
    describe('non-timebased', () => {
      it('Handle _id and _index columns', async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/nanos');

        const res = await generateAPI.getCSVFromSearchSource(
          getMockJobParams({
            searchSource: {
              query: { query: '', language: 'kuery' },
              version: true,
              index: '907bc200-a294-11e9-a900-ef10e0ac769e',
              sort: [{ date: 'desc' }],
              filter: [],
            },
            columns: ['date', 'message', '_id', '_index'],
          })
        );
        const { status: resStatus, text: resText, type: resType } = res;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expectSnapshot(resText).toMatch();

        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/nanos');
      });

      it('With filters and non-timebased data', async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/sales');

        const {
          status: resStatus,
          text: resText,
          type: resType,
        } = (await generateAPI.getCSVFromSearchSource(
          getMockJobParams({
            searchSource: {
              query: { query: '', language: 'kuery' },
              version: true,
              index: 'timeless-sales',
              sort: [{ power: 'asc' }],
              fields: ['name', 'power'],
              filter: [
                {
                  range: { power: { gte: 1, lt: null } },
                },
              ],
            },
            columns: ['name', 'power'],
          })
        )) as supertest.Response;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expectSnapshot(resText).toMatch();

        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/sales');
      });
    });

    describe('_id field is a big integer', () => {
      before(async () => {
        await Promise.all([
          esArchiver.load('x-pack/test/functional/es_archives/reporting/big_int_id_field'),
          kibanaServer.importExport.load(
            'x-pack/test/functional/fixtures/kbn_archiver/reporting/big_int_id_field'
          ),
        ]);
      });

      after(async () => {
        await Promise.all([
          esArchiver.unload('x-pack/test/functional/es_archives/reporting/big_int_id_field'),
          kibanaServer.importExport.unload(
            'x-pack/test/functional/fixtures/kbn_archiver/reporting/big_int_id_field'
          ),
        ]);
      });
      it('passes through the value without mutation', async () => {
        const { text } = (await generateAPI.getCSVFromSearchSource(
          getMockJobParams({
            browserTimezone: 'UTC',
            version: '8.6.0',
            searchSource: {
              query: { query: '', language: 'kuery' },
              fields: [{ field: '*', include_unmapped: 'true' }],
              index: 'c424ce04-f440-4f48-aa0c-534da84d06f6',
              sort: [{ timestamp: 'desc' }],
              filter: [
                {
                  meta: {
                    index: 'c424ce04-f440-4f48-aa0c-534da84d06f6',
                    params: {},
                    field: 'timestamp',
                  },
                  query: {
                    range: {
                      timestamp: {
                        format: 'strict_date_optional_time',
                        gte: '2007-10-25T21:18:23.905Z',
                        lte: '2022-10-30T00:00:00.000Z',
                      },
                    },
                  },
                },
              ],
              parent: {
                query: { query: '', language: 'kuery' },
                filter: [],
                parent: {
                  filter: [
                    {
                      meta: {
                        index: 'c424ce04-f440-4f48-aa0c-534da84d06f6',
                        params: {},
                        field: 'timestamp',
                      },
                      query: {
                        range: {
                          timestamp: {
                            format: 'strict_date_optional_time',
                            gte: '2007-10-25T21:18:23.905Z',
                            lte: '2022-10-30T00:00:00.000Z',
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
            columns: [],
            title: 'testsearch',
          })
        )) as supertest.Response;
        expectSnapshot(text).toMatch();
      });
    });

    describe('validation', () => {
      it('Return a 404', async () => {
        const { body } = (await generateAPI.getCSVFromSearchSource(
          getMockJobParams({
            searchSource: {
              index: 'gobbledygook',
            },
          })
        )) as supertest.Response;
        const expectedBody = {
          error: 'Not Found',
          message: 'Saved object [index-pattern/gobbledygook] not found',
          statusCode: 404,
        };
        expect(body).to.eql(expectedBody);
      });

      // NOTE: this test requires having the test server run with `xpack.reporting.csv.maxSizeBytes=6000`
      it(`Searches large amount of data, stops at Max Size Reached`, async () => {
        const {
          status: resStatus,
          text: resText,
          type: resType,
        } = (await generateAPI.getCSVFromSearchSource(
          getMockJobParams({
            searchSource: {
              version: true,
              query: { query: '', language: 'kuery' },
              index: '5193f870-d861-11e9-a311-0fa548c5f953',
              sort: [{ order_date: 'desc' }],
              fields: ['*'],
              filter: [],
              parent: {
                query: { language: 'kuery', query: '' },
                filter: [],
                parent: {
                  filter: [
                    {
                      meta: { index: '5193f870-d861-11e9-a311-0fa548c5f953', params: {} },
                      range: {
                        order_date: {
                          gte: '2019-03-23T00:00:00.000Z',
                          lte: '2019-10-04T00:00:00.000Z',
                          format: 'strict_date_optional_time',
                        },
                      },
                    },
                  ],
                },
              },
            },
            browserTimezone: 'UTC',
            title: 'Ecommerce Data',
          })
        )) as supertest.Response;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expectSnapshot(resText).toMatch();
      });
    });
  });
}
