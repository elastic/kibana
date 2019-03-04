/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import supertest from 'supertest';

interface GenerateOpts {
  timerange: {};
  state: any;
}

// tslint:disable:no-default-export
export default function({ getService }: { getService: any }) {
  // const esArchiver = getService('esArchiver');
  const supertestSvc = getService('supertest');

  const generateAPI = {
    getCsvFromSavedSearch: async (id: string, { timerange, state }: GenerateOpts) => {
      return await supertestSvc
        .post(`/api/reporting/v1/generate/immediate/csv/saved-object/search:${id}`)
        .set('kbn-xsrf', 'xxx')
        .send({ timerange, state });
    },
  };

  describe('Generation from Saved Search ID', () => {
    it('Return a 404', async () => {
      const { body } = (await generateAPI.getCsvFromSavedSearch('gobbledygook', {
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
