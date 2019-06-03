/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import supertest from 'supertest';
import {
  CSV_RESULT_HUGE,
  CSV_RESULT_SCRIPTED,
  CSV_RESULT_SCRIPTED_REQUERY,
  CSV_RESULT_SCRIPTED_RESORTED,
  CSV_RESULT_TIMEBASED,
  CSV_RESULT_TIMELESS,
} from './fixtures';

interface GenerateOpts {
  timerange?: {
    timezone: string;
    min: number | string | Date;
    max: number | string | Date;
  };
  state: any;
}

// eslint-disable-next-line import/no-default-export
export default function({ getService }: { getService: any }) {
  const esArchiver = getService('esArchiver');
  const supertestSvc = getService('supertest');
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
      it('With filters and timebased data', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/logs');
        await esArchiver.load('logstash_functional');

        // TODO: check headers for inline filename
        const {
          status: resStatus,
          text: resText,
          type: resType,
        } = (await generateAPI.getCsvFromSavedSearch(
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

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expect(resText).to.eql(CSV_RESULT_TIMEBASED);

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
        expect(resText).to.eql(CSV_RESULT_TIMELESS);

        await esArchiver.unload('reporting/sales');
      });

      it('With scripted fields and field formatters', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/scripted');

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
            state: {},
          }
        )) as supertest.Response;

        expect(resStatus).to.eql(200);
        expect(resType).to.eql('text/csv');
        expect(resText).to.eql(CSV_RESULT_SCRIPTED);

        await esArchiver.unload('reporting/scripted');
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
        await esArchiver.load('reporting/scripted');

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
        expect(resText).to.eql(CSV_RESULT_HUGE);

        await esArchiver.unload('reporting/scripted');
      });
    });

    describe('Merge user state into the query', () => {
      it('for query', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/scripted');

        const params = {
          searchId: 'search:f34bf440-5014-11e9-bce7-4dabcb8bef24',
          postPayload: {
            timerange: { timezone: 'UTC', min: '1979-01-01T10:00:00Z', max: '1981-01-01T10:00:00Z' }, // prettier-ignore
            state: { query: { bool: { filter: [ { bool: { filter: [ { bool: { minimum_should_match: 1, should: [{ query_string: { fields: ['name'], query: 'Fe*' } }] } } ] } } ] } } } // prettier-ignore
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
        expect(resText).to.eql(CSV_RESULT_SCRIPTED_REQUERY);

        await esArchiver.unload('reporting/scripted');
      });

      it('for sort', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/scripted');

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
        expect(resText).to.eql(CSV_RESULT_SCRIPTED_RESORTED);

        await esArchiver.unload('reporting/scripted');
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/37471
    describe.skip('Non-Immediate', () => {
      it('using queries in job params', async () => {
        // load test data that contains a saved search and documents
        await esArchiver.load('reporting/scripted');

        const params = {
          searchId: 'search:f34bf440-5014-11e9-bce7-4dabcb8bef24',
          postPayload: {
            timerange: { timezone: 'UTC', min: '1979-01-01T10:00:00Z', max: '1981-01-01T10:00:00Z' }, // prettier-ignore
            state: { query: { bool: { filter: [ { bool: { filter: [ { bool: { minimum_should_match: 1, should: [{ query_string: { fields: ['name'], query: 'Fe*' } }] } } ] } } ] } } } // prettier-ignore
          },
          isImmediate: false,
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
        expect(resType).to.eql('application/json');
        const {
          path: jobDownloadPath,
          job: { index: jobIndex, jobtype: jobType, created_by: jobCreatedBy, payload: jobPayload },
        } = JSON.parse(resText);

        expect(jobDownloadPath.slice(0, 29)).to.equal('/api/reporting/jobs/download/');
        expect(jobIndex.slice(0, 11)).to.equal('.reporting-');
        expect(jobType).to.be('csv_from_savedobject');
        expect(jobCreatedBy).to.be('elastic');

        const {
          title: payloadTitle,
          objects: payloadObjects,
          jobParams: payloadParams,
        } = jobPayload;
        expect(payloadTitle).to.be('EVERYBABY2');
        expect(payloadObjects).to.be(null); // value for non-immediate
        expect(payloadParams.savedObjectType).to.be('search');
        expect(payloadParams.savedObjectId).to.be('f34bf440-5014-11e9-bce7-4dabcb8bef24');
        expect(payloadParams.isImmediate).to.be(false);

        const { state: postParamState, timerange: postParamTimerange } = payloadParams.post;
        expect(postParamState).to.eql({
          query: { bool: { filter: [ { bool: { filter: [ { bool: { minimum_should_match: 1, should: [{ query_string: { fields: ['name'], query: 'Fe*' } }] } } ] } } ] } } // prettier-ignore
        });
        expect(postParamTimerange).to.eql({
          max: '1981-01-01T10:00:00.000Z',
          min: '1979-01-01T10:00:00.000Z',
          timezone: 'UTC',
        });

        const {
          indexPatternSavedObjectId: payloadPanelIndexPatternSavedObjectId,
          timerange: payloadPanelTimerange,
        } = payloadParams.panel;
        expect(payloadPanelIndexPatternSavedObjectId).to.be('89655130-5013-11e9-bce7-4dabcb8bef24');
        expect(payloadPanelTimerange).to.eql({
          timezone: 'UTC',
          min: '1979-01-01T10:00:00.000Z',
          max: '1981-01-01T10:00:00.000Z',
        });

        expect(payloadParams.visType).to.be('search');

        // check the resource at jobDownloadPath
        const downloadFromPath = async (downloadPath: string) => {
          const { status, text, type } = await supertestSvc
            .get(downloadPath)
            .set('kbn-xsrf', 'xxx');
          return {
            status,
            text,
            type,
          };
        };

        await new Promise(resolve => {
          setTimeout(async () => {
            const { status, text, type } = await downloadFromPath(jobDownloadPath);
            expect(status).to.eql(200);
            expect(type).to.eql('text/csv');
            expect(text).to.eql(CSV_RESULT_SCRIPTED_REQUERY);
            resolve();
          }, 5000); // x-pack/test/functional/config settings are inherited, uses 3 seconds for polling interval.
        });

        await esArchiver.unload('reporting/scripted');
      });
    });
  });
}
