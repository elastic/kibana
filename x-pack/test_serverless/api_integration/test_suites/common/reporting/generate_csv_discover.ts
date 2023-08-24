/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

// the archived data holds a report created by test_user
const TEST_USERNAME = 'test_user';
const TEST_USER_PASSWORD = 'changeme';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const reportingAPI = getService('svlReportingAPI');

  describe('Generate CSV from SearchSource Discover', () => {
    before(async () => {
      await reportingAPI.createReportingRole();
      await reportingAPI.createReportingUser();
      await reportingAPI.createReportingUser(TEST_USERNAME, TEST_USER_PASSWORD);
    });

    beforeEach(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/es_archives/reporting/ecommerce_search'
      );
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/es_archives/reporting/ecommerce_search'
      );
    });

    it(`exported CSV file matches snapshot`, async () => {
      const fromTime = '2019-06-20T00:00:00.000Z';
      const toTime = '2019-06-24T00:00:00.000Z';

      const { job, path } = await reportingAPI.createReportJobInternal(
        'csv_searchsource',
        {
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
          },
        },
        'elastic',
        'changeme'
      );

      expect(job.created_by).to.be('test_user');
      expect(job.jobtype).to.be('csv_searchsource');

      // wait for the the pending job to complete
      await reportingAPI.waitForJobToFinish(path, 'elastic', 'changeme');

      const csvFile = await reportingAPI.getCompletedJobOutput(path, 'elastic', 'changeme');
      expectSnapshot(csvFile).toMatch();
    });

    describe('with unmapped fields', () => {
      const dataArchive = 'x-pack/test/functional/es_archives/reporting/unmapped_fields';
      const savedObjectsArchive =
        'x-pack/test/functional/fixtures/kbn_archiver/reporting/unmapped_fields.json';

      before(async () => {
        await esArchiver.loadIfNeeded(dataArchive);
        await kibanaServer.importExport.load(savedObjectsArchive);
      });

      after(async () => {
        await esArchiver.unload(dataArchive);
        await kibanaServer.importExport.unload(savedObjectsArchive);
      });

      async function generateCsvReport(fields: string[]) {
        const { path } = await reportingAPI.createReportJobInternal(
          'csv_searchsource',
          {
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
          },
          'elastic',
          'changeme'
        );

        await reportingAPI.waitForJobToFinish(path, 'elastic', 'changeme');
        return reportingAPI.getCompletedJobOutput(path, 'elastic', 'changeme');
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
};
