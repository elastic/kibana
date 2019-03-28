/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import supertest from 'supertest';
import { CSV_RESULT_SCRIPTED, CSV_RESULT_TIMEBASED, CSV_RESULT_TIMELESS } from './fixtures';

interface GenerateOpts {
  timerange?: {
    timezone: string;
    min: number | string | Date;
    max: number | string | Date;
  };
  state: any;
}

// tslint:disable:no-default-export
export default function({ getService }: { getService: any }) {
  const esArchiver = getService('esArchiver');
  const supertestSvc = getService('supertest');
  const generateAPI = {
    getCsvFromSavedSearch: async (id: string, { timerange, state }: GenerateOpts) => {
      return await supertestSvc
        .post(`/api/reporting/v1/generate/immediate/csv/saved-object/${id}`)
        .set('kbn-xsrf', 'xxx')
        .send({ timerange, state });
    },
  };

  describe('Generation from Saved Search ID', () => {
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

    it('With filters and timebased data', async () => {
      // load test data that contains a saved search and documents
      await esArchiver.load('reporting/logs');
      await esArchiver.load('logstash_functional');

      // TODO: check headers for inline filename
      const {
        status: resStatus,
        text: resText,
        type: resType,
      } = (await generateAPI.getCsvFromSavedSearch('search:d7a79750-3edd-11e9-99cc-4d80163ee9e7', {
        timerange: {
          timezone: 'UTC',
          min: '2015-09-19T10:00:00.000Z',
          max: '2015-09-21T10:00:00.000Z',
        },
        state: {},
      })) as supertest.Response;

      expect(resStatus).to.eql(200);
      expect(resType).to.eql('text/csv');
      expect(resText).to.eql(CSV_RESULT_TIMEBASED);

      await esArchiver.unload('reporting/logs');
      await esArchiver.unload('logstash_functional');
    });

    it('With filters and non-timebased data', async () => {
      // load test data that contains a saved search and documents
      await esArchiver.load('reporting/sales');

      // TODO: check headers for inline filename
      const {
        status: resStatus,
        text: resText,
        type: resType,
      } = (await generateAPI.getCsvFromSavedSearch('search:71e3ee20-3f99-11e9-b8ee-6b9604f2f877', {
        timerange: {
          timezone: 'UTC',
          min: '2015-09-19T10:00:00.000Z',
          max: '2015-09-21T10:00:00.000Z',
        },
        state: {},
      })) as supertest.Response;

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
      } = (await generateAPI.getCsvFromSavedSearch('search:f34bf440-5014-11e9-bce7-4dabcb8bef24', {
        timerange: {
          timezone: 'UTC',
          min: '1979-01-01T10:00:00Z',
          max: '1981-01-01T10:00:00Z',
        },
        state: {},
      })) as supertest.Response;

      expect(resStatus).to.eql(200);
      expect(resType).to.eql('text/csv');
      expect(resText).to.eql(CSV_RESULT_SCRIPTED);

      await esArchiver.unload('reporting/scripted');
    });
  });
}
