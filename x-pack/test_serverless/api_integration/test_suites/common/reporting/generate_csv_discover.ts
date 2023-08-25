/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const ELASTIC_USERNAME = 'elastic';
const ELASTIC_PASSWORD = 'changeme';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const reportingAPI = getService('svlReportingAPI');

  describe.skip('Generate CSV from SearchSource: Discover', () => {
    const archives = {
      data: 'x-pack/test/functional/es_archives/reporting/ecommerce',
      savedObjects: 'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce',
    };

    beforeEach(async () => {
      await esArchiver.load(archives.data);
      await kibanaServer.importExport.load(archives.savedObjects);
    });

    after(async () => {
      await esArchiver.unload(archives.data);
      await kibanaServer.importExport.unload(archives.savedObjects);
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
        ELASTIC_USERNAME,
        ELASTIC_PASSWORD
      );

      expect(job.created_by).to.be(ELASTIC_USERNAME);
      expect(job.jobtype).to.be('csv_searchsource');

      // wait for the the pending job to complete
      await reportingAPI.waitForJobToFinish(path, ELASTIC_USERNAME, ELASTIC_PASSWORD);

      const csvFile = await reportingAPI.getCompletedJobOutput(
        path,
        ELASTIC_USERNAME,
        ELASTIC_PASSWORD
      );
      expectSnapshot(csvFile).toMatch();
    });

    describe('with unmapped fields', () => {
      const unmappedFieldsArchives = {
        data: 'x-pack/test/functional/es_archives/reporting/unmapped_fields',
        savedObjects: 'x-pack/test/functional/fixtures/kbn_archiver/reporting/unmapped_fields.json',
      };

      before(async () => {
        await esArchiver.loadIfNeeded(unmappedFieldsArchives.data);
        await kibanaServer.importExport.load(unmappedFieldsArchives.savedObjects);
      });

      after(async () => {
        await esArchiver.unload(unmappedFieldsArchives.data);
        await kibanaServer.importExport.unload(unmappedFieldsArchives.savedObjects);
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
          ELASTIC_USERNAME,
          ELASTIC_PASSWORD
        );

        await reportingAPI.waitForJobToFinish(path, ELASTIC_USERNAME, ELASTIC_PASSWORD);
        return reportingAPI.getCompletedJobOutput(path, ELASTIC_USERNAME, ELASTIC_PASSWORD);
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
