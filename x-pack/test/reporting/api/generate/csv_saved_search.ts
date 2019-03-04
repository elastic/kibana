/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import supertest from 'supertest';
import { CSV_RESULT } from './fixtures';

interface GenerateOpts {
  timerange: {};
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
    it('Return a 200', async () => {
      // load test data that contains a saved search and documents
      await esArchiver.load('reporting');
      await esArchiver.load('logstash_functional');

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
      expect(resText).to.eql(CSV_RESULT);

      await esArchiver.unload('reporting');
      await esArchiver.unload('logstash_functional');
    });

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
  });
}
