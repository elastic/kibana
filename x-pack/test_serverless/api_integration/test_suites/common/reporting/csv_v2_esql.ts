/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import request from 'supertest';

import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { CookieCredentials, InternalRequestHeader } from '@kbn/ftr-common-functional-services';
import type { ReportApiJSON } from '@kbn/reporting-common/types';
import type { JobParamsCsvFromSavedObject } from '@kbn/reporting-export-types-csv-common';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const reportingAPI = getService('svlReportingApi');
  const svlCommonApi = getService('svlCommonApi');
  const samlAuth = getService('samlAuth');
  let cookieCredentials: CookieCredentials;
  let internalReqHeader: InternalRequestHeader;

  // Helper function
  const requestCsv = async (
    params: Omit<JobParamsCsvFromSavedObject, 'objectType' | 'browserTimezone' | 'version'>
  ) => {
    const job: JobParamsCsvFromSavedObject = {
      browserTimezone: (params as JobParamsCsvFromSavedObject).browserTimezone ?? 'UTC',
      objectType: 'search',
      version: '8.13.0',
      title: 'CSV Report',
      ...params,
    };
    log.info(`sending request for query: ${JSON.stringify(job.locatorParams[0].params.query)}`);

    return await reportingAPI.createReportJobInternal(
      'csv_v2',
      job,
      cookieCredentials,
      internalReqHeader
    );
  };

  describe('CSV Generation from ES|QL', () => {
    describe('export from non-timebased data view', () => {
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
            { index: { _index: timelessIndexName } },
            { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Neogene', epoch: ' Pliocene' },
            { index: { _index: timelessIndexName } },
            { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Quaternary', epoch: ' Holocene' },
            { index: { _index: timelessIndexName } },
            { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Cretaceous' },
            { index: { _index: timelessIndexName } },
            { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Jurassic' },
            { index: { _index: timelessIndexName } },
            { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Cambrian' },
            { index: { _index: timelessIndexName } },
            { eon: 'Proterozoic', era: 'Paleozoic', period: 'Permian' },
            { index: { _index: timelessIndexName } },
            { eon: 'Archean' },
            { index: { _index: timelessIndexName } },
            { eon: 'Hadean' },
          ],
        });
      };
      before(async () => {
        await loadTimelessData();
        cookieCredentials = await samlAuth.getM2MApiCookieCredentialsWithRoleScope('admin');
        internalReqHeader = svlCommonApi.getInternalRequestHeader();
      });

      after(async () => {
        await es.indices.delete({
          index: timelessIndexName,
        });
      });

      describe('csv from es|ql', () => {
        let response: request.Response;
        let job: ReportApiJSON;
        let path: string;
        let csvFile: string;

        before(async () => {
          ({ job, path } = await requestCsv({
            locatorParams: [
              {
                id: DISCOVER_APP_LOCATOR,
                version: 'reporting',
                params: {
                  query: { esql: `from ${timelessIndexName} | limit 10` },
                },
              },
            ],
          }));
          await reportingAPI.waitForJobToFinish(path, cookieCredentials, internalReqHeader);
          response = await supertestWithoutAuth.get(path).set(cookieCredentials);
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
      const LOGSTASH_DATA_ARCHIVE = 'test/functional/fixtures/es_archiver/logstash_functional';
      before(async () => {
        log.info(`loading archives and fixtures`);
        await esArchiver.load(LOGSTASH_DATA_ARCHIVE);
      });

      after(async () => {
        log.info(`unloading archives and fixtures`);
        await esArchiver.unload(LOGSTASH_DATA_ARCHIVE);
      });

      describe('csv from es|ql', () => {
        describe('export with time filter', () => {
          let response: request.Response;
          let job: ReportApiJSON;
          let path: string;
          let csvFile: string;

          before(async () => {
            ({ job, path } = await requestCsv({
              locatorParams: [
                {
                  id: 'DISCOVER_APP_LOCATOR',
                  version: '8.13.0',
                  params: {
                    columns: ['@message'],
                    dataViewSpec: {
                      allowHidden: false,
                      allowNoIndex: false,
                      fieldFormats: {},
                      id: '0ed8b65f-ec8f-4061-9d2e-542cd6ff10a6',
                      name: 'logstash-*',
                      runtimeFieldMap: {},
                      sourceFilters: [],
                      timeFieldName: '@timestamp',
                      title: 'logstash-*',
                    },
                    filters: [],
                    index: '0ed8b65f-ec8f-4061-9d2e-542cd6ff10a6',
                    interval: 'auto',
                    query: { esql: 'from logstash-* | sort @timestamp | limit 5' },
                    refreshInterval: { pause: true, value: 60000 },
                    sort: [['@timestamp', 'desc']],
                    timeRange: { from: '2015-09-18T22:00:00.000Z', to: '2015-09-23T22:00:00.000Z' },
                  },
                },
              ],
              title: 'Untitled discover search',
            }));
            await reportingAPI.waitForJobToFinish(path, cookieCredentials, internalReqHeader);
            response = await supertestWithoutAuth.get(path).set(cookieCredentials);
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
    });
  });
};
