/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import request from 'supertest';

import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import type { JobParamsCsvFromSavedObject } from '@kbn/reporting-export-types-csv-common';
import type { ReportApiJSON } from '@kbn/reporting-common/types';
import rison from '@kbn/rison';
import { FtrProviderContext } from '../ftr_provider_context';

const LOGSTASH_DATA_ARCHIVE = 'test/functional/fixtures/es_archiver/logstash_functional';
const LOGSTASH_SAVED_OBJECTS = 'x-pack/test/functional/fixtures/kbn_archiver/reporting/logs';
const ECOM_SAVED_SEARCH_ID = '6091ead0-1c6d-11ea-a100-8589bb9d7c6b';
const TIMELESS_SAVED_OBJECTS = 'x-pack/test/functional/fixtures/kbn_archiver/reporting/timeless';
const TIMELESS_SAVED_SEARCH_WITH_QUERY = 'fc3e8ff0-9844-11ed-8e25-6b737289a7c8';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const reportingAPI = getService('reportingAPI');
  const log = getService('log');

  const requestCsvFromSavedSearch = async (
    params: Omit<JobParamsCsvFromSavedObject, 'objectType' | 'browserTimezone' | 'version'>
  ) => {
    const job: JobParamsCsvFromSavedObject = {
      browserTimezone: (params as JobParamsCsvFromSavedObject).browserTimezone ?? 'UTC',
      objectType: 'search',
      version: '8.7.0',
      ...params,
    };
    log.info(`sending request for saved search: ${job.locatorParams[0].params.savedSearchId}`);
    const jobParams = rison.encode(job);
    return await supertest
      .post(`/api/reporting/generate/csv_v2`)
      .set('kbn-xsrf', 'xxx')
      .send({ jobParams });
  };

  const cleanupLogstash = async () => {
    const logstashIndices = await es.indices.get({
      index: 'logstash-*',
      allow_no_indices: true,
      expand_wildcards: 'all',
      ignore_unavailable: true,
    });
    await Promise.all(
      Object.keys(logstashIndices.body ?? {}).map(async (logstashIndex) => {
        log.info(`deleting ${logstashIndex}`);
        await es.indices.delete({
          index: logstashIndex,
        });
      })
    );
  };

  const timelessIndexName = 'timeless-test';
  const loadTimelessData = async () => {
    log.info(`loading test data`);
    await es.indices.create({
      index: timelessIndexName,
      body: {
        settings: { number_of_shards: 1 },
        mappings: {
          properties: {
            eon: { type: 'keyword' },
            era: { type: 'keyword' },
            period: { type: 'keyword' },
            epoch: { type: 'keyword' },
          },
        },
      },
    });
    await es.bulk({
      refresh: 'wait_for',
      body: [
        { index: { _index: timelessIndexName, _id: 'tvJJX4UBvD7uFsw9L2x4' } },
        { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Neogene', epoch: ' Pliocene' },
        { index: { _index: timelessIndexName, _id: 't_JJX4UBvD7uFsw9L2x4' } },
        { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Quaternary', epoch: ' Holocene' },
        { index: { _index: timelessIndexName, _id: 'uPJJX4UBvD7uFsw9L2x4' } },
        { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Cretaceous' },
        { index: { _index: timelessIndexName, _id: 'ufJJX4UBvD7uFsw9L2x4' } },
        { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Jurassic' },
        { index: { _index: timelessIndexName, _id: 'uvJJX4UBvD7uFsw9L2x4' } },
        { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Cambrian' },
        { index: { _index: timelessIndexName, _id: 'u_JJX4UBvD7uFsw9L2x4' } },
        { eon: 'Proterozoic', era: 'Paleozoic', period: 'Permian' },
        { index: { _index: timelessIndexName, _id: 'vPJJX4UBvD7uFsw9L2x4' } },
        { eon: 'Archean' },
        { index: { _index: timelessIndexName, _id: 'vfJJX4UBvD7uFsw9L2x4' } },
        { eon: 'Hadean' },
      ],
    });
  };

  describe('CSV Generation from Saved Search ID', () => {
    before(async () => {
      // clear any previous UI Settings
      await kibanaServer.uiSettings.replace({});

      // explicitly delete all pre-existing logstash indices, since we have exports with no time filter
      log.info(`deleting logstash indices`);
      await cleanupLogstash();

      log.info(`updating Advanced Settings`);
      await kibanaServer.uiSettings.update({
        'csv:quoteValues': false,
        'dateFormat:tz': 'UTC',
        dateFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
      });
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({});
    });

    describe('export from non-timebased data view', () => {
      before(async () => {
        await kibanaServer.importExport.load(TIMELESS_SAVED_OBJECTS);
        await loadTimelessData();
      });

      after(async () => {
        await kibanaServer.importExport.unload(TIMELESS_SAVED_OBJECTS);

        log.info(`loading test data`);
        await es.indices.delete({
          index: timelessIndexName,
        });
      });

      describe('query stored in the saved search', () => {
        let response: request.Response;
        let job: ReportApiJSON;
        let path: string;
        let csvFile: string;

        before(async () => {
          const { text, status } = await requestCsvFromSavedSearch({
            locatorParams: [
              {
                id: DISCOVER_APP_LOCATOR,
                version: 'reporting',
                params: {
                  savedSearchId: TIMELESS_SAVED_SEARCH_WITH_QUERY,
                },
              },
            ],
          });
          expect(status).to.eql(200);
          ({ job, path } = JSON.parse(text));
          await reportingAPI.waitForJobToFinish(path);
          response = await supertest.get(path);
          csvFile = response.text;
        });

        it('job response data is correct', () => {
          expect(path).to.be.a('string');
          expect(job).to.be.an('object');
          expect(job.attempts).equal(0);
          expectSnapshot({
            contentType: response.header['content-type'],
            contentDisposition: response.header['content-disposition'],
            title: job.payload.title,
          }).toMatch();
        });

        it('csv file matches', () => {
          expectSnapshot(csvFile).toMatch();
        });
      });
    });

    describe('export from timebased data view', () => {
      before(async () => {
        log.info(`loading archives and fixtures`);
        await esArchiver.load(LOGSTASH_DATA_ARCHIVE);
        await kibanaServer.importExport.load(LOGSTASH_SAVED_OBJECTS);
      });

      after(async () => {
        await esArchiver.unload(LOGSTASH_DATA_ARCHIVE);
        await kibanaServer.importExport.unload(LOGSTASH_SAVED_OBJECTS);
      });

      describe('timezone formatting', () => {
        const savedSearchId = ECOM_SAVED_SEARCH_ID;
        const timeRange = { from: '2019-07-11T00:00:00.000Z', to: '2019-07-12T00:00:00.000Z' };

        describe('export with custom timezone and timeRange from locator params', () => {
          let response: request.Response;
          let job: ReportApiJSON;
          let path: string;
          let csvFile: string;

          before(async () => {
            await reportingAPI.initEcommerce();
            const { text, status } = await requestCsvFromSavedSearch({
              locatorParams: [
                {
                  id: DISCOVER_APP_LOCATOR,
                  version: 'reporting',
                  params: { savedSearchId, timeRange },
                },
              ],
              browserTimezone: 'US/Alaska',
              objectType: 'search',
              version: 'reporting',
            } as JobParamsCsvFromSavedObject);
            expect(status).to.eql(200);
            ({ job, path } = JSON.parse(text));
            await reportingAPI.waitForJobToFinish(path);
            response = await supertest.get(path);
            csvFile = response.text;
          });

          after(async () => {
            await reportingAPI.teardownEcommerce();
          });

          it('job response data is correct', () => {
            expect(path).to.be.a('string');
            expect(job).to.be.an('object');
            expect(job.attempts).equal(0);
            expectSnapshot({
              contentType: response.header['content-type'],
              contentDisposition: response.header['content-disposition'],
              title: job.payload.title,
            }).toMatch();
          });

          it('csv file matches', () => {
            expectSnapshot(csvFile).toMatch();
          });
        });
      });
    });
  });
};
