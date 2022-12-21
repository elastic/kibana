/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import supertest from 'supertest';
import type { CsvSavedSearchExportBodyType } from '../../../../x-pack/plugins/reporting/server/export_types/csv_saved_object/types';
import { FtrProviderContext } from '../ftr_provider_context';

const ECOM_SAVED_SEARCH_ID = '6091ead0-1c6d-11ea-a100-8589bb9d7c6b';

const getMockRequestBody = (
  obj: Partial<CsvSavedSearchExportBodyType>
): CsvSavedSearchExportBodyType => {
  const fromTime = '2019-06-10T00:00:00.000Z';
  const toTime = '2019-07-14T00:00:00.000Z';
  return {
    timerange: {
      timezone: 'UTC',
      min: fromTime,
      max: toTime,
    },
    ...obj,
  };
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const kibanaServer = getService('kibanaServer');
  const supertestSvc = getService('supertest');
  const reportingAPI = getService('reportingAPI');

  const requestCsvFromSavedSearch = async (
    savedSearchId: string,
    obj: Partial<CsvSavedSearchExportBodyType>
  ): Promise<supertest.Response> => {
    const body = getMockRequestBody(obj);
    return await supertestSvc
      .post(`/api/reporting/v1/generate/csv/saved-object/search:${savedSearchId}`)
      .set('kbn-xsrf', 'xxx')
      .send(body);
  };

  describe('CSV Generation from Saved Search ID', () => {
    before(async () => {
      await kibanaServer.uiSettings.update({
        'csv:quoteValues': false,
        'dateFormat:tz': 'UTC',
        defaultIndex: 'logstash-*',
      });
      await reportingAPI.initEcommerce();
    });
    after(async () => {
      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllReports();
    });

    describe('Exports CSV with all fields', () => {
      let job: any;
      let path: string;
      let csvFile: string;

      before(async () => {
        const { text, status } = await requestCsvFromSavedSearch(ECOM_SAVED_SEARCH_ID, {});
        expect(status).to.eql(200);

        const { payload } = JSON.parse(text);
        job = payload.job;
        path = payload.path;

        expect(path).to.be.a('string');
        expect(job).to.be.an('object');
        expect(job.attempts).equal(0);
        expect(job.created_by).equal('elastic');
        expect(job.jobtype).equal('csv_saved_object');
        expect(job.payload.objectType).equal('saved search');
        expect(job.payload.title).equal('Ecommerce Data');
        expect(job.payload.version).equal('7.17');

        // wait for the the pending job to complete
        await reportingAPI.waitForJobToFinish(path);
      });

      it('csv file matches', async () => {
        csvFile = (await reportingAPI.getCompletedJobOutput(path)) as string;
        expectSnapshot(csvFile).toMatch();
      });
    });

    describe('validation', () => {
      it('Return a 404', async () => {
        const { body } = await requestCsvFromSavedSearch('gobbledygook', {});
        const expectedBody = {
          error: 'Not Found',
          message: 'Saved object [search/gobbledygook] not found',
          statusCode: 404,
        };
        expect(body).to.eql(expectedBody);
      });
    });
  });
};
