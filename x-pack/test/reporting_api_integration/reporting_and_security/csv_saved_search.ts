/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DeepPartial } from 'utility-types';
import type { ReportApiJSON } from '../../../../x-pack/plugins/reporting/common/types';
import type { CsvSavedSearchExportBodyType } from '../../../../x-pack/plugins/reporting/server/export_types/csv_saved_object/types';
import { FtrProviderContext } from '../ftr_provider_context';

const LOGSTASH_DATA_ARCHIVE = 'test/functional/fixtures/es_archiver/logstash_functional';
const LOGSTASH_SAVED_OBJECTS = 'x-pack/test/functional/fixtures/kbn_archiver/reporting/logs';
const LOGS_SAVED_SEARCH_ID = '9747bd90-8581-11ed-97c5-596122858f69';
const LOGS_SAVED_SEARCH_DATE_FILTER_ID = 'd7a79750-3edd-11e9-99cc-4d80163ee9e7';
const LOGS_SAVED_SEARCH_TERMS_FILTER_ID = '53193950-8649-11ed-9cfd-b9cddf37f461';
const ECOM_SAVED_SEARCH_ID = '6091ead0-1c6d-11ea-a100-8589bb9d7c6b';

const getMockRequestBody = (
  obj: Partial<CsvSavedSearchExportBodyType>
): CsvSavedSearchExportBodyType => {
  return {
    timerange: { ...obj?.timerange },
  };
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const reportingAPI = getService('reportingAPI');
  const log = getService('log');

  const requestCsvFromSavedSearch = async (
    savedSearchId: string,
    obj: DeepPartial<CsvSavedSearchExportBodyType> = {}
  ) => {
    log.info(`sending request for saved search: ${savedSearchId}`);
    const body = getMockRequestBody(obj);
    return await supertest
      .post(`/api/reporting/v1/generate/csv/saved-object/search:${savedSearchId}`)
      .set('kbn-xsrf', 'xxx')
      .send(body);
  };

  const cleanupLogstash = async () => {
    const logstashIndices = await es.indices.get({
      index: 'logstash-*',
      allow_no_indices: true,
      expand_wildcards: 'all',
      ignore_unavailable: true,
    });
    await Promise.all(
      Object.keys(logstashIndices.body).map(async (logstashIndex) => {
        log.info(`deleting ${logstashIndex}`);
        await es.indices.delete({
          index: logstashIndex,
        });
      })
    );
  };

  describe('CSV Generation from Saved Search ID', () => {
    before(async () => {
      // explicitly delete all pre-existing logstash indices, since we have exports with no time filter
      log.info(`deleting logstash indices`);
      await cleanupLogstash();

      log.info(`updating Advanced Settings`);
      await kibanaServer.uiSettings.update({
        'csv:quoteValues': false,
        'dateFormat:tz': 'UTC',
        dateFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
      });

      log.info(`loading archives and fixtures`);
      await esArchiver.load(LOGSTASH_DATA_ARCHIVE);
      await kibanaServer.importExport.load(LOGSTASH_SAVED_OBJECTS);
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({});
      await esArchiver.unload(LOGSTASH_DATA_ARCHIVE);
      await kibanaServer.importExport.unload(LOGSTASH_SAVED_OBJECTS);
    });

    describe('export with no saved filters and no job post params', () => {
      let job: ReportApiJSON;
      let path: string;
      let csvFile: string;

      before(async () => {
        const { text, status } = await requestCsvFromSavedSearch(LOGS_SAVED_SEARCH_ID);
        expect(status).to.eql(200);
        const { payload } = JSON.parse(text);
        job = payload.job;
        path = payload.path;
        await reportingAPI.waitForJobToFinish(path);
      });

      it('job response data is correct', () => {
        expect(path).to.be.a('string');
        expect(job).to.be.an('object');
        expect(job.attempts).equal(0);
        expect(job.created_by).equal('elastic');
        expect(job.jobtype).equal('csv_saved_object');
        expect(job.payload.objectType).equal('saved search');
        expect(job.payload.title).equal('A Saved Search');
        expect(job.payload.version).equal('7.17');
      });

      it('csv file matches', async () => {
        csvFile = (await reportingAPI.getCompletedJobOutput(path)) as string;
        expectSnapshot(csvFile).toMatch();
      });
    });

    describe('export with saved date filter and no job post params', () => {
      let job: ReportApiJSON;
      let path: string;
      let csvFile: string;

      before(async () => {
        const { text, status } = await requestCsvFromSavedSearch(LOGS_SAVED_SEARCH_DATE_FILTER_ID);
        expect(status).to.eql(200);
        const { payload } = JSON.parse(text);
        job = payload.job;
        path = payload.path;
        await reportingAPI.waitForJobToFinish(path);
      });

      it('job response data is correct', () => {
        expect(path).to.be.a('string');
        expect(job).to.be.an('object');
        expect(job.attempts).equal(0);
        expect(job.created_by).equal('elastic');
        expect(job.jobtype).equal('csv_saved_object');
        expect(job.payload.objectType).equal('saved search');
        expect(job.payload.title).equal('A Saved Search with date filter');
        expect(job.payload.version).equal('7.17');
      });

      it('csv file matches', async () => {
        csvFile = (await reportingAPI.getCompletedJobOutput(path)) as string;
        expectSnapshot(csvFile).toMatch();
      });
    });

    describe('export with saved date and terms filters and no job post params', () => {
      let job: ReportApiJSON;
      let path: string;
      let csvFile: string;

      before(async () => {
        const { text, status } = await requestCsvFromSavedSearch(LOGS_SAVED_SEARCH_TERMS_FILTER_ID);
        expect(status).to.eql(200);
        const { payload } = JSON.parse(text);
        job = payload.job;
        path = payload.path;
        await reportingAPI.waitForJobToFinish(path);
      });

      it('job response data is correct', () => {
        expect(path).to.be.a('string');
        expect(job).to.be.an('object');
        expect(job.attempts).equal(0);
        expect(job.created_by).equal('elastic');
        expect(job.jobtype).equal('csv_saved_object');
        expect(job.payload.objectType).equal('saved search');
        expect(job.payload.title).equal('A Saved Search with date and terms filters');
        expect(job.payload.version).equal('7.17');
      });

      it('csv file matches', async () => {
        csvFile = (await reportingAPI.getCompletedJobOutput(path)) as string;
        expectSnapshot(csvFile).toMatch();
      });
    });

    describe('export with saved filters and job post params', () => {
      let job: ReportApiJSON;
      let path: string;
      let csvFile: string;

      before(async () => {
        const { text, status } = await requestCsvFromSavedSearch(LOGS_SAVED_SEARCH_DATE_FILTER_ID, {
          timerange: {
            min: '2015-09-20 10:23:36.052',
            max: '2015-09-20 10:25:55.744',
          },
        });
        expect(status).to.eql(200);
        const { payload } = JSON.parse(text);
        job = payload.job;
        path = payload.path;
        await reportingAPI.waitForJobToFinish(path);
      });

      it('job response data is correct', () => {
        expect(path).to.be.a('string');
        expect(job).to.be.an('object');
        expect(job.attempts).equal(0);
        expect(job.created_by).equal('elastic');
        expect(job.jobtype).equal('csv_saved_object');
        expect(job.payload.objectType).equal('saved search');
        expect(job.payload.title).equal('A Saved Search with date filter');
        expect(job.payload.version).equal('7.17');
      });

      it('csv file matches', async () => {
        csvFile = (await reportingAPI.getCompletedJobOutput(path)) as string;
        expectSnapshot(csvFile).toMatch();
      });
    });

    describe('export with no saved filters and job post params', () => {
      let job: ReportApiJSON;
      let path: string;
      let csvFile: string;

      before(async () => {
        const { text, status } = await requestCsvFromSavedSearch(LOGS_SAVED_SEARCH_ID, {
          timerange: {
            min: '2015-09-20 10:23:07.001',
            max: '2015-09-20 10:25:44.979',
          },
        });
        expect(status).to.eql(200);
        const { payload } = JSON.parse(text);
        job = payload.job;
        path = payload.path;
        await reportingAPI.waitForJobToFinish(path);
      });

      it('job response data is correct', () => {
        expect(path).to.be.a('string');
        expect(job).to.be.an('object');
        expect(job.attempts).equal(0);
        expect(job.created_by).equal('elastic');
        expect(job.jobtype).equal('csv_saved_object');
        expect(job.payload.objectType).equal('saved search');
        expect(job.payload.title).equal('A Saved Search');
        expect(job.payload.version).equal('7.17');
      });

      it('csv file matches', async () => {
        csvFile = (await reportingAPI.getCompletedJobOutput(path)) as string;
        expectSnapshot(csvFile).toMatch();
      });
    });

    describe('export with no saved filters and job post params with custom time zone', () => {
      let job: ReportApiJSON;
      let path: string;
      let csvFile: string;

      before(async () => {
        await reportingAPI.initEcommerce();
        const { text, status } = await requestCsvFromSavedSearch(ECOM_SAVED_SEARCH_ID, {
          timerange: {
            timezone: 'US/Alaska',
            min: '2019-07-11 00:00:00.000',
            max: '2019-07-12 00:00:00.000',
          },
        });
        expect(status).to.eql(200);
        const { payload } = JSON.parse(text);
        job = payload.job;
        path = payload.path;
        await reportingAPI.waitForJobToFinish(path);
      });

      after(async () => {
        await reportingAPI.teardownEcommerce();
      });

      it('job response data is correct', () => {
        expect(path).to.be.a('string');
        expect(job).to.be.an('object');
        expect(job.attempts).equal(0);
        expect(job.created_by).equal('elastic');
        expect(job.jobtype).equal('csv_saved_object');
        expect(job.payload.objectType).equal('saved search');
        expect(job.payload.title).equal('Ecommerce Data');
        expect(job.payload.version).equal('7.17');
      });

      it('csv file matches', async () => {
        csvFile = (await reportingAPI.getCompletedJobOutput(path)) as string;
        expectSnapshot(csvFile).toMatch();
      });
    });

    describe('validation', () => {
      it('with saved search 404', async () => {
        const { body } = await requestCsvFromSavedSearch('gobbledygook', {});
        const expectedBody = {
          error: 'Not Found',
          message: 'Saved object [search/gobbledygook] not found',
          statusCode: 404,
        };
        expect(body).to.eql(expectedBody);
      });

      it('with invalid min time range', async () => {
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

      it('with invalid max time range', async () => {
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
