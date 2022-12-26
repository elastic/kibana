/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import supertest from 'supertest';
import { DeepPartial } from 'utility-types';
import type { CsvSavedSearchExportBodyType } from '../../../../x-pack/plugins/reporting/server/export_types/csv_saved_object/types';
import { FtrProviderContext } from '../ftr_provider_context';

const LOGS_SAVED_SEARCH_ID = '9747bd90-8581-11ed-97c5-596122858f69'; // "A Saved Search"
const LOGS_SAVED_FILTERED_SEARCH_ID = 'd7a79750-3edd-11e9-99cc-4d80163ee9e7'; // "A Saved Search With a DATE FILTER"

const getMockRequestBody = (
  obj: Partial<CsvSavedSearchExportBodyType>
): CsvSavedSearchExportBodyType => {
  return {
    timerange: {
      timezone: 'UTC',
      ...obj?.timerange,
    },
  };
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const kibanaServer = getService('kibanaServer');
  const supertestSvc = getService('supertest');
  const esArchiver = getService('esArchiver');
  const reportingAPI = getService('reportingAPI');

  const requestCsvFromSavedSearch = async (
    savedSearchId: string,
    obj: DeepPartial<CsvSavedSearchExportBodyType> = {}
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
      });
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/reporting/logs'
      );
    });
    after(async () => {
      // FIXME
      // await esArchiver.unload('x-pack/test/functional/es_archives/reporting/sales');
      // await esArchiver.unload('x-pack/test/functional/es_archives/reporting/logs');
      // await reportingAPI.deleteAllReports();
    });

    describe('Exports CSV with all fields', () => {
      let job: any;
      let path: string;
      let csvFile: string;

      before(async () => {
        const { text, status } = await requestCsvFromSavedSearch(LOGS_SAVED_SEARCH_ID, {});
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
        expect(job.payload.title).equal('A Saved Search');
        expect(job.payload.version).equal('7.17');

        // wait for the the pending job to complete
        await reportingAPI.waitForJobToFinish(path);
      });

      it('csv file matches', async () => {
        csvFile = (await reportingAPI.getCompletedJobOutput(path)) as string;
        expectSnapshot(csvFile).toMatch();
      });
    });

    describe('Exports CSV with time filter saved into the search', () => {
      let job: any;
      let path: string;
      let csvFile: string;

      before(async () => {
        const { text, status } = await requestCsvFromSavedSearch(LOGS_SAVED_FILTERED_SEARCH_ID);
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
        expect(job.payload.title).equal('A Saved Search With a DATE FILTER');
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

      it('Invalid min time range', async () => {
        const { body } = await requestCsvFromSavedSearch(LOGS_SAVED_SEARCH_ID, {
          timerange: { min: `shmurble` },
        });
        const expectedBody = {
          error: 'Bad Request',
          message: 'Min time is not valid',
          statusCode: 400,
        };
        expect(body).to.eql(expectedBody);
      });

      it('Invalid max time range', async () => {
        const { body } = await requestCsvFromSavedSearch(LOGS_SAVED_SEARCH_ID, {
          timerange: { max: `shmurble` },
        });
        const expectedBody = {
          error: 'Bad Request',
          message: 'Max time is not valid',
          statusCode: 400,
        };
        expect(body).to.eql(expectedBody);
      });
    });
  });
};
