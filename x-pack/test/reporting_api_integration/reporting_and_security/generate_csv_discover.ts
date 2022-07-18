/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { ReportApiJSON } from '@kbn/reporting-plugin/common/types';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const reportingAPI = getService('reportingAPI');

  describe('Generate CSV from SearchSource', () => {
    it(`exported CSV file matches snapshot`, async () => {
      await reportingAPI.initEcommerce();

      const fromTime = '2019-06-20T00:00:00.000Z';
      const toTime = '2019-06-24T00:00:00.000Z';

      const { text: reportApiJson, status } = await reportingAPI.generateCsv({
        title: 'CSV Report',
        browserTimezone: 'UTC',
        objectType: 'search',
        version: '7.15.0',
        searchSource: {
          version: true,
          query: { query: '', language: 'kuery' },
          index: '5193f870-d861-11e9-a311-0fa548c5f953',
          sort: [{ order_date: 'desc' }],
          fields: ['*'],
          filter: [],
          parent: {
            query: { language: 'kuery', query: '' },
            filter: [],
            parent: {
              filter: [
                {
                  meta: { index: '5193f870-d861-11e9-a311-0fa548c5f953', params: {} },
                  range: {
                    order_date: {
                      gte: fromTime,
                      lte: toTime,
                      format: 'strict_date_optional_time',
                    },
                  },
                },
              ],
            },
          },
        } as unknown as SerializedSearchSourceFields,
      });
      expect(status).to.be(200);

      const { job: report, path: downloadPath } = JSON.parse(reportApiJson) as {
        job: ReportApiJSON;
        path: string;
      };
      expect(report.created_by).to.be('elastic');
      expect(report.jobtype).to.be('csv_searchsource');

      // wait for the the pending job to complete
      await reportingAPI.waitForJobToFinish(downloadPath);

      const csvFile = await reportingAPI.getCompletedJobOutput(downloadPath);
      expectSnapshot(csvFile).toMatch();

      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllReports();
    });

    describe('with unmapped fields', () => {
      before(async () => {
        await esArchiver.loadIfNeeded(
          'x-pack/test/functional/es_archives/reporting/unmapped_fields'
        );
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/reporting/unmapped_fields.json'
        );
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/unmapped_fields');
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/reporting/unmapped_fields.json'
        );
      });

      async function generateCsvReport(fields: string[]) {
        const { text } = await reportingAPI.generateCsv({
          title: 'CSV Report',
          browserTimezone: 'UTC',
          objectType: 'search',
          version: '7.15.0',
          searchSource: {
            version: true,
            query: { query: '', language: 'kuery' },
            index: '5c620ea0-dc4f-11ec-972a-bf98ce1eebd7',
            sort: [{ order_date: 'desc' }],
            fields: fields.map((field) => ({ field, include_unmapped: 'true' })),
            filter: [],
          } as SerializedSearchSourceFields,
        });

        const { path } = JSON.parse(text) as { path: string };
        await reportingAPI.waitForJobToFinish(path);

        return reportingAPI.getCompletedJobOutput(path);
      }

      it('includes an unmapped field to the report', async () => {
        const csvFile = await generateCsvReport(['text', 'unmapped']);

        expectSnapshot(csvFile).toMatch();
      });

      it('includes an unmapped nested field to the report', async () => {
        const csvFile = await generateCsvReport(['text', 'nested.unmapped']);

        expectSnapshot(csvFile).toMatch();
      });

      it('includes all unmapped fields to the report', async () => {
        const csvFile = await generateCsvReport(['*']);

        expectSnapshot(csvFile).toMatch();
      });
    });
  });
}
