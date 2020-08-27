/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import supertest from 'supertest';
import * as fixtures from '../fixtures';
import { FtrProviderContext } from '../ftr_provider_context';

interface GenerateOpts {
  timerange?: {
    timezone: string;
    min?: number | string | Date;
    max?: number | string | Date;
  };
  state: any;
}

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertestSvc = getService('supertest');
  const reportingAPI = getService('reportingAPI');

  const generateAPI = {
    getCsvFromSavedSearch: async (
      id: string,
      { timerange, state }: GenerateOpts,
      isImmediate = true
    ) => {
      return await supertestSvc
        .post(`/api/reporting/v1/generate/${isImmediate ? 'immediate/' : ''}csv/saved-object/${id}`)
        .set('kbn-xsrf', 'xxx')
        .send({ timerange, state });
    },
  };

  describe('Generation from Saved Search ID', () => {
    describe('Saved Search Features', () => {
      after(async () => {
        await reportingAPI.deleteAllReports();
      });

      it('With filters and timebased data, explicit UTC format', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/logs');
        await esArchiver.load('logstash_functional');

        const res = (await generateAPI.getCsvFromSavedSearch(
          'search:d7a79750-3edd-11e9-99cc-4d80163ee9e7',
          {
            timerange: {
              timezone: 'UTC',
              min: '2015-09-19T10:00:00.000Z',
              max: '2015-09-21T10:00:00.000Z',
            },
            state: {},
          }
        )) as supertest.Response;
        const { status: resStatus, text: resText, type: resType } = res;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expect(resText).to.eql(fixtures.CSV_RESULT_TIMEBASED_UTC);

        await esArchiver.unload('reporting/logs');
        await esArchiver.unload('logstash_functional');
      });

      it('With filters and timebased data, default to UTC', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/logs');
        await esArchiver.load('logstash_functional');

        const res = (await generateAPI.getCsvFromSavedSearch(
          'search:d7a79750-3edd-11e9-99cc-4d80163ee9e7',
          {
            // @ts-expect-error: timerange.timezone is missing from post params
            timerange: {
              min: '2015-09-19T10:00:00.000Z',
              max: '2015-09-21T10:00:00.000Z',
            },
            state: {},
          }
        )) as supertest.Response;
        const { status: resStatus, text: resText, type: resType } = res;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expect(resText).to.eql(fixtures.CSV_RESULT_TIMEBASED_UTC);

        await esArchiver.unload('reporting/logs');
        await esArchiver.unload('logstash_functional');
      });

      it('With filters and timebased data, custom timezone', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/logs');
        await esArchiver.load('logstash_functional');

        const {
          status: resStatus,
          text: resText,
          type: resType,
        } = (await generateAPI.getCsvFromSavedSearch(
          'search:d7a79750-3edd-11e9-99cc-4d80163ee9e7',
          {
            timerange: {
              timezone: 'America/Phoenix',
              min: '2015-09-19T10:00:00.000Z',
              max: '2015-09-21T10:00:00.000Z',
            },
            state: {},
          }
        )) as supertest.Response;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expect(resText).to.eql(fixtures.CSV_RESULT_TIMEBASED_CUSTOM);

        await esArchiver.unload('reporting/logs');
        await esArchiver.unload('logstash_functional');
      });

      it('With filters and non-timebased data', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/sales');

        const {
          status: resStatus,
          text: resText,
          type: resType,
        } = (await generateAPI.getCsvFromSavedSearch(
          'search:71e3ee20-3f99-11e9-b8ee-6b9604f2f877',
          {
            state: {},
          }
        )) as supertest.Response;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expect(resText).to.eql(fixtures.CSV_RESULT_TIMELESS);

        await esArchiver.unload('reporting/sales');
      });

      it('With scripted fields and field formatters', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/scripted_small2');

        const {
          status: resStatus,
          text: resText,
          type: resType,
        } = (await generateAPI.getCsvFromSavedSearch(
          'search:a6d51430-ace2-11ea-815f-39e12f89a8c2',
          {
            timerange: {
              timezone: 'UTC',
              min: '1979-01-01T10:00:00Z',
              max: '1981-01-01T10:00:00Z',
            },
            state: {},
          }
        )) as supertest.Response;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expect(resText).to.eql(fixtures.CSV_RESULT_SCRIPTED);

        await esArchiver.unload('reporting/scripted_small2');
      });

      it('Formatted date_nanos data, UTC timezone', async () => {
        await esArchiver.load('reporting/nanos');

        const {
          status: resStatus,
          text: resText,
          type: resType,
        } = (await generateAPI.getCsvFromSavedSearch(
          'search:e4035040-a295-11e9-a900-ef10e0ac769e',
          {
            state: {},
          }
        )) as supertest.Response;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expect(resText).to.eql(fixtures.CSV_RESULT_NANOS);

        await esArchiver.unload('reporting/nanos');
      });

      it('Formatted date_nanos data, custom time zone', async () => {
        await esArchiver.load('reporting/nanos');

        const {
          status: resStatus,
          text: resText,
          type: resType,
        } = (await generateAPI.getCsvFromSavedSearch(
          'search:e4035040-a295-11e9-a900-ef10e0ac769e',
          {
            state: {},
            timerange: { timezone: 'America/New_York' },
          }
        )) as supertest.Response;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expect(resText).to.eql(fixtures.CSV_RESULT_NANOS_CUSTOM);

        await esArchiver.unload('reporting/nanos');
      });
    });

    describe('API Features', () => {
      it('Return a 404', async () => {
        const { body } = (await generateAPI.getCsvFromSavedSearch('search:gobbledygook', {
          timerange: { timezone: 'UTC', min: 63097200000, max: 126255599999 },
          state: {},
        })) as supertest.Response;
        const expectedBody = {
          error: 'Not Found',
          message: 'Saved object [search/gobbledygook] not found',
          statusCode: 404,
        };
        expect(body).to.eql(expectedBody);
      });

      it('Return 400 if time range param is needed but missing', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/logs');
        await esArchiver.load('logstash_functional');

        const {
          status: resStatus,
          text: resText,
          type: resType,
        } = (await generateAPI.getCsvFromSavedSearch(
          'search:d7a79750-3edd-11e9-99cc-4d80163ee9e7',
          { state: {} }
        )) as supertest.Response;

        expect(resStatus).to.eql(400);
        expect(resType).to.eql('application/json');
        const { message: errorMessage } = JSON.parse(resText);
        expect(errorMessage).to.eql(
          'Time range params are required for index pattern [logstash-*], using time field [@timestamp]'
        );

        await esArchiver.unload('reporting/logs');
        await esArchiver.unload('logstash_functional');
      });

      it('Stops at Max Size Reached', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/hugedata');

        const {
          status: resStatus,
          text: resText,
          type: resType,
        } = (await generateAPI.getCsvFromSavedSearch(
          'search:f34bf440-5014-11e9-bce7-4dabcb8bef24',
          {
            timerange: {
              timezone: 'UTC',
              min: '1960-01-01T10:00:00Z',
              max: '1999-01-01T10:00:00Z',
            },
            state: {},
          }
        )) as supertest.Response;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expect(resText).to.eql(fixtures.CSV_RESULT_HUGE);

        await esArchiver.unload('reporting/hugedata');
      });
    });

    describe('Merge user state into the query', () => {
      it('for query', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/scripted_small2');

        const params = {
          searchId: 'search:a6d51430-ace2-11ea-815f-39e12f89a8c2',
          postPayload: {
            timerange: { timezone: 'UTC', min: '1979-01-01T10:00:00Z', max: '1981-01-01T10:00:00Z' }, // prettier-ignore
            state: { query: { bool: { filter: [ { bool: { filter: [ { bool: { minimum_should_match: 1, should: [{ query_string: { fields: ['name'], query: 'Fel*' } }] } } ] } } ] } } }, // prettier-ignore
          },
          isImmediate: true,
        };
        const {
          status: resStatus,
          text: resText,
          type: resType,
        } = (await generateAPI.getCsvFromSavedSearch(
          params.searchId,
          params.postPayload,
          params.isImmediate
        )) as supertest.Response;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expect(resText).to.eql(fixtures.CSV_RESULT_SCRIPTED_REQUERY);

        await esArchiver.unload('reporting/scripted_small2');
      });

      it('for sort', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/hugedata');

        const {
          status: resStatus,
          text: resText,
          type: resType,
        } = (await generateAPI.getCsvFromSavedSearch(
          'search:f34bf440-5014-11e9-bce7-4dabcb8bef24',
          {
            timerange: {
              timezone: 'UTC',
              min: '1979-01-01T10:00:00Z',
              max: '1981-01-01T10:00:00Z',
            },
            state: { sort: [{ name: { order: 'asc', unmapped_type: 'boolean' } }] },
          }
        )) as supertest.Response;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expect(resText).to.eql(fixtures.CSV_RESULT_SCRIPTED_RESORTED);

        await esArchiver.unload('reporting/hugedata');
      });

      it('for docvalue_fields', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/ecommerce');
        await esArchiver.load('reporting/ecommerce_kibana');

        const params = {
          searchId: 'search:6091ead0-1c6d-11ea-a100-8589bb9d7c6b',
          postPayload: {
            timerange: {
              min: '2019-06-26T06:20:28Z',
              max: '2019-06-26T07:27:58Z',
              timezone: 'UTC',
            },
            state: {
              sort: [{ order_date: { order: 'desc', unmapped_type: 'boolean' } }],
              docvalue_fields: [
                { field: 'customer_birth_date', format: 'date_time' },
                { field: 'order_date', format: 'date_time' },
                { field: 'products.created_on', format: 'date_time' },
              ],
              query: {
                bool: {
                  must: [],
                  filter: [
                    { match_all: {} },
                    { match_all: {} },
                    {
                      range: {
                        order_date: {
                          gte: '2019-06-26T06:20:28.066Z',
                          lte: '2019-06-26T07:27:58.573Z',
                          format: 'strict_date_optional_time',
                        },
                      },
                    },
                  ],
                  should: [],
                  must_not: [],
                },
              },
            },
          },
          isImmediate: true,
        };
        const {
          status: resStatus,
          text: resText,
          type: resType,
        } = (await generateAPI.getCsvFromSavedSearch(
          params.searchId,
          params.postPayload,
          params.isImmediate
        )) as supertest.Response;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expect(resText).to.eql(fixtures.CSV_RESULT_DOCVALUE);

        await esArchiver.unload('reporting/ecommerce');
        await esArchiver.unload('reporting/ecommerce_kibana');
      });
    });
  });
}
