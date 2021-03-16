/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import supertest from 'supertest';
import { JobParamsDownloadCSV } from '../../../plugins/reporting/server/export_types/csv_searchsource_immediate/types';
import { FtrProviderContext } from '../ftr_provider_context';

const getMockJobParams = (obj: Partial<JobParamsDownloadCSV>): JobParamsDownloadCSV => ({
  title: `Mock CSV Title`,
  ...(obj as any),
});

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const supertestSvc = getService('supertest');
  const reportingAPI = getService('reportingAPI');

  const generateAPI = {
    getCSVFromSearchSource: async (job: JobParamsDownloadCSV) => {
      return await supertestSvc
        .post(`/api/reporting/v1/generate/immediate/csv_searchsource`)
        .set('kbn-xsrf', 'xxx')
        .send(job);
    },
  };

  describe('CSV Generation from SearchSource', () => {
    before(async () => {
      await kibanaServer.uiSettings.update({
        'csv:quoteValues': false,
        'dateFormat:tz': 'UTC',
        defaultIndex: 'logstash-*',
      });
    });
    after(async () => {
      await reportingAPI.deleteAllReports();
    });

    it('Exports CSV with almost all fields when using fieldsFromSource', async () => {
      await esArchiver.load('reporting/ecommerce');
      await esArchiver.load('reporting/ecommerce_kibana');

      const {
        status: resStatus,
        text: resText,
        type: resType,
      } = (await generateAPI.getCSVFromSearchSource(
        getMockJobParams({
          searchSource: {
            query: { query: '', language: 'kuery' },
            index: '5193f870-d861-11e9-a311-0fa548c5f953',
            sort: [{ order_date: 'desc' }],
            fieldsFromSource: [
              '_id',
              '_index',
              '_score',
              '_source',
              '_type',
              'category',
              'category.keyword',
              'currency',
              'customer_birth_date',
              'customer_first_name',
              'customer_first_name.keyword',
              'customer_full_name',
              'customer_full_name.keyword',
              'customer_gender',
              'customer_id',
              'customer_last_name',
              'customer_last_name.keyword',
              'customer_phone',
              'day_of_week',
              'day_of_week_i',
              'email',
              'geoip.city_name',
              'geoip.continent_name',
              'geoip.country_iso_code',
              'geoip.location',
              'geoip.region_name',
              'manufacturer',
              'manufacturer.keyword',
              'order_date',
              'order_id',
              'products._id',
              'products._id.keyword',
              'products.base_price',
              'products.base_unit_price',
              'products.category',
              'products.category.keyword',
              'products.created_on',
              'products.discount_amount',
              'products.discount_percentage',
              'products.manufacturer',
              'products.manufacturer.keyword',
              'products.min_price',
              'products.price',
              'products.product_id',
              'products.product_name',
              'products.product_name.keyword',
              'products.quantity',
              'products.sku',
              'products.tax_amount',
              'products.taxful_price',
              'products.taxless_price',
              'products.unit_discount_amount',
              'sku',
              'taxful_total_price',
              'taxless_total_price',
              'total_quantity',
              'total_unique_products',
              'type',
              'user',
            ],
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
                        gte: '2019-03-23T03:06:17.785Z',
                        lte: '2019-10-04T02:33:16.708Z',
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                ],
              },
            },
          },
          browserTimezone: 'UTC',
          title: 'testfooyu78yt90-',
        })
      )) as supertest.Response;
      expect(resStatus).to.eql(200);
      expect(resType).to.eql('text/csv');
      expectSnapshot(resText).toMatch();

      await esArchiver.unload('reporting/ecommerce');
      await esArchiver.unload('reporting/ecommerce_kibana');
    });

    it('Exports CSV with all fields when using defaults', async () => {
      await esArchiver.load('reporting/ecommerce');
      await esArchiver.load('reporting/ecommerce_kibana');

      const {
        status: resStatus,
        text: resText,
        type: resType,
      } = (await generateAPI.getCSVFromSearchSource(
        getMockJobParams({
          searchSource: {
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
                        gte: '2019-03-23T03:06:17.785Z',
                        lte: '2019-10-04T02:33:16.708Z',
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                ],
              },
            },
          },
          browserTimezone: 'UTC',
          title: 'testfooyu78yt90-',
        })
      )) as supertest.Response;
      expect(resStatus).to.eql(200);
      expect(resType).to.eql('text/csv');
      expectSnapshot(resText).toMatch();

      await esArchiver.unload('reporting/ecommerce');
      await esArchiver.unload('reporting/ecommerce_kibana');
    });

    it('Logs the error explanation if the search query returns an error', async () => {
      await esArchiver.load('reporting/ecommerce');
      await esArchiver.load('reporting/ecommerce_kibana');

      const { status: resStatus, text: resText } = (await generateAPI.getCSVFromSearchSource(
        getMockJobParams({
          searchSource: {
            query: { query: '', language: 'kuery' },
            index: '5193f870-d861-11e9-a311-0fa548c5f953',
            sort: [{ order_date: 'desc' }],
            fields: ['order_date', 'products'], // products is a non-leaf field
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
                        gte: '2019-03-23T03:06:17.785Z',
                        lte: '2019-10-04T02:33:16.708Z',
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                ],
              },
            },
          },
          browserTimezone: 'UTC',
          title: 'testfooyu78yt90-',
        })
      )) as supertest.Response;
      expect(resStatus).to.eql(500);
      expectSnapshot(resText).toMatch();

      await esArchiver.unload('reporting/ecommerce');
      await esArchiver.unload('reporting/ecommerce_kibana');
    });

    describe('date formatting', () => {
      before(async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/logs');
        await esArchiver.load('logstash_functional');
      });
      after(async () => {
        await esArchiver.unload('reporting/logs');
        await esArchiver.unload('logstash_functional');
      });

      it('With filters and timebased data, default to UTC', async () => {
        const res = (await generateAPI.getCSVFromSearchSource(
          getMockJobParams({
            searchSource: {
              fields: ['@timestamp', 'clientip', 'extension'],
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: '2015-09-20T10:19:40.307Z',
                      lt: '2015-09-20T10:26:56.221Z',
                    },
                  },
                },
                {
                  range: {
                    '@timestamp': {
                      format: 'strict_date_optional_time',
                      gte: '2015-01-12T07:00:55.654Z',
                      lte: '2016-01-29T21:08:10.881Z',
                    },
                  },
                },
              ],
              index: 'logstash-*',
              query: { language: 'kuery', query: '' },
              sort: [{ '@timestamp': 'desc' }],
            },
          })
        )) as supertest.Response;
        const { status: resStatus, text: resText, type: resType } = res;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expectSnapshot(resText).toMatch();
      });

      it('With filters and timebased data, non-default timezone', async () => {
        const res = (await generateAPI.getCSVFromSearchSource(
          getMockJobParams({
            browserTimezone: 'America/Phoenix',
            searchSource: {
              fields: ['@timestamp', 'clientip', 'extension'],
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: '2015-09-20T10:19:40.307Z',
                      lt: '2015-09-20T10:26:56.221Z',
                    },
                  },
                },
                {
                  range: {
                    '@timestamp': {
                      format: 'strict_date_optional_time',
                      gte: '2015-01-12T07:00:55.654Z',
                      lte: '2016-01-29T21:08:10.881Z',
                    },
                  },
                },
              ],
              index: 'logstash-*',
              query: { language: 'kuery', query: '' },
              sort: [{ '@timestamp': 'desc' }],
            },
          })
        )) as supertest.Response;
        const { status: resStatus, text: resText, type: resType } = res;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expectSnapshot(resText).toMatch();
      });

      it('Formatted date_nanos data, UTC timezone', async () => {
        await esArchiver.load('reporting/nanos');

        const res = await generateAPI.getCSVFromSearchSource(
          getMockJobParams({
            searchSource: {
              query: { query: '', language: 'kuery' },
              version: true,
              index: '907bc200-a294-11e9-a900-ef10e0ac769e',
              sort: [{ date: 'desc' }],
              fields: ['date', 'message'],
              filter: [],
            },
          })
        );
        const { status: resStatus, text: resText, type: resType } = res;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expectSnapshot(resText).toMatch();

        await esArchiver.unload('reporting/nanos');
      });

      it('Formatted date_nanos data, custom timezone (New York)', async () => {
        await esArchiver.load('reporting/nanos');

        const res = await generateAPI.getCSVFromSearchSource(
          getMockJobParams({
            browserTimezone: 'America/New_York',
            searchSource: {
              query: { query: '', language: 'kuery' },
              version: true,
              index: '907bc200-a294-11e9-a900-ef10e0ac769e',
              sort: [{ date: 'desc' }],
              fields: ['date', 'message'],
              filter: [],
            },
          })
        );
        const { status: resStatus, text: resText, type: resType } = res;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expectSnapshot(resText).toMatch();

        await esArchiver.unload('reporting/nanos');
      });
    });

    describe('non-timebased', () => {
      it('Handle _id and _index columns', async () => {
        await esArchiver.load('reporting/nanos');

        const res = await generateAPI.getCSVFromSearchSource(
          getMockJobParams({
            searchSource: {
              query: { query: '', language: 'kuery' },
              version: true,
              index: '907bc200-a294-11e9-a900-ef10e0ac769e',
              sort: [{ date: 'desc' }],
              fields: ['date', 'message', '_id', '_index'],
              filter: [],
            },
          })
        );
        const { status: resStatus, text: resText, type: resType } = res;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expectSnapshot(resText).toMatch();

        await esArchiver.unload('reporting/nanos');
      });

      it('With filters and non-timebased data', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/sales');

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
          })
        )) as supertest.Response;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expectSnapshot(resText).toMatch();

        await esArchiver.unload('reporting/sales');
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

      it(`Searches large amount of data, stops at Max Size Reached`, async () => {
        await esArchiver.load('reporting/ecommerce');
        await esArchiver.load('reporting/ecommerce_kibana');

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
              fields: [
                'order_date',
                'category',
                'currency',
                'customer_id',
                'order_id',
                'day_of_week_i',
                'products.created_on',
                'sku',
              ],
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
                          gte: '2019-03-23T03:06:17.785Z',
                          lte: '2019-10-04T02:33:16.708Z',
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

        await esArchiver.unload('reporting/ecommerce');
        await esArchiver.unload('reporting/ecommerce_kibana');
      });
    });
  });
}
