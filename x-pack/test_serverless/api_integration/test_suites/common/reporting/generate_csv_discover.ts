/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SortDirection } from '@kbn/data-plugin/common';
import type { JobParamsCSV } from '@kbn/reporting-export-types-csv-common';
import type { Filter } from '@kbn/es-query';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const reportingAPI = getService('svlReportingApi');

  /*
   * Helper function to decorate with common fields needed in the API call
   */
  const createTestCsvJobParams = (
    params: Omit<JobParamsCSV, 'title' | 'version' | 'objectType' | 'browserTimezone'> &
      Partial<JobParamsCSV>
  ) => {
    return {
      title: 'CSV Report',
      version: '8.14.0',
      browserTimezone: 'UTC',
      objectType: 'search',
      ...params,
    };
  };

  const archives: Record<string, { data: string; savedObjects: string }> = {
    ecommerce: {
      data: 'x-pack/test/functional/es_archives/reporting/ecommerce',
      savedObjects: 'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce',
    },
    unmappedFields: {
      data: 'x-pack/test/functional/es_archives/reporting/unmapped_fields',
      savedObjects: 'x-pack/test/functional/fixtures/kbn_archiver/reporting/unmapped_fields.json',
    },
    logs: {
      data: 'x-pack/test/functional/es_archives/logstash_functional',
      savedObjects: 'x-pack/test_serverless/functional/fixtures/kbn_archiver/reporting/logs',
    },
    nanos: {
      data: 'x-pack/test/functional/es_archives/reporting/nanos',
      savedObjects: 'x-pack/test_serverless/functional/fixtures/kbn_archiver/reporting/logs',
    },
    sales: {
      data: 'x-pack/test/functional/es_archives/reporting/sales',
      savedObjects: 'x-pack/test_serverless/functional/fixtures/kbn_archiver/reporting/logs',
    },
    bigIntIdField: {
      data: 'x-pack/test/functional/es_archives/reporting/big_int_id_field',
      savedObjects: 'x-pack/test/functional/fixtures/kbn_archiver/reporting/big_int_id_field',
    },
  };

  const createPartialCsv = (csvFile: unknown) => {
    const partialCsvFile = (csvFile as string).split('\n').slice(0, 4);
    return partialCsvFile.join('\n');
  };

  /*
   * Tests
   */
  describe('Generate CSV from SearchSource', function () {
    // 12 minutes timeout for each test in serverless
    // This is because it may take up to 10 minutes to generate the CSV
    // see kibanaReportCompletion config
    this.timeout(12 * 60 * 1000);

    beforeEach(async () => {
      await kibanaServer.uiSettings.update({
        'csv:quoteValues': true,
        'dateFormat:tz': 'UTC',
      });
    });

    describe('exported CSV', () => {
      before(async () => {
        await esArchiver.load(archives.ecommerce.data);
        await kibanaServer.importExport.load(archives.ecommerce.savedObjects);
      });

      after(async () => {
        await reportingAPI.deleteAllReports();
        await esArchiver.unload(archives.ecommerce.data);
        await kibanaServer.importExport.unload(archives.ecommerce.savedObjects);
      });

      it('file matches snapshot', async () => {
        const fromTime = '2019-06-20T00:00:00.000Z';
        const toTime = '2019-06-24T00:00:00.000Z';

        const res = await reportingAPI.createReportJobInternal(
          'csv_searchsource',
          createTestCsvJobParams({
            browserTimezone: 'UTC',
            columns: [
              'order_date',
              'category',
              'currency',
              'customer_id',
              'order_id',
              'day_of_week_i',
              'products.created_on',
              'sku',
            ],
            objectType: 'search',
            searchSource: {
              fields: [
                { field: 'order_date', include_unmapped: true },
                { field: 'category', include_unmapped: true },
                { field: 'currency', include_unmapped: true },
                { field: 'customer_id', include_unmapped: true },
                { field: 'order_id', include_unmapped: true },
                { field: 'day_of_week_i', include_unmapped: true },
                { field: 'products.created_on', include_unmapped: true },
                { field: 'sku', include_unmapped: true },
              ],
              filter: [
                {
                  meta: {
                    field: 'order_date',
                    index: '5193f870-d861-11e9-a311-0fa548c5f953',
                    params: {},
                  },
                  query: {
                    range: {
                      order_date: {
                        gte: fromTime,
                        lte: toTime,
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                },
              ] as unknown as Filter[],
              index: '5193f870-d861-11e9-a311-0fa548c5f953',
              query: { language: 'kuery', query: '' },
              sort: [
                {
                  order_date: {
                    format: 'strict_date_optional_time',
                    order: 'desc' as SortDirection,
                  },
                },
                { order_id: 'desc' as SortDirection },
              ],
              version: true,
            },
            title: 'Ecommerce Data',
            version: '8.14.0',
          })
        );
        await reportingAPI.waitForJobToFinish(res.path);
        const csvFile = await reportingAPI.getCompletedJobOutput(res.path);
        expect((csvFile as string).length).to.be(124183);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });

    describe('with unmapped fields', () => {
      before(async () => {
        await esArchiver.load(archives.unmappedFields.data);
        await kibanaServer.importExport.load(archives.unmappedFields.savedObjects);
      });

      after(async () => {
        await esArchiver.unload(archives.unmappedFields.data);
        await kibanaServer.importExport.unload(archives.unmappedFields.savedObjects);
      });

      // Helper function
      async function generateCsvReportWithUnmapped(fields: string[]) {
        const res = await reportingAPI.createReportJobInternal(
          'csv_searchsource',
          createTestCsvJobParams({
            browserTimezone: 'UTC',
            objectType: 'search',
            searchSource: {
              version: true,
              index: '5c620ea0-dc4f-11ec-972a-bf98ce1eebd7',
              query: { language: 'kuery', query: '' },
              fields: fields.map((field) => ({ field, include_unmapped: true })),
              filter: [],
              sort: [{ text: 'asc' as SortDirection }],
            },
            title: 'Untitled discover search',
            version: '8.14.0',
          })
        );
        await reportingAPI.waitForJobToFinish(res.path);
        return reportingAPI.getCompletedJobOutput(res.path);
      }

      it('includes an unmapped field to the report', async () => {
        const csvFile = await generateCsvReportWithUnmapped(['text', 'unmapped']);
        expect((csvFile as string).length).to.be(111);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });

      it('includes an unmapped nested field to the report', async () => {
        const csvFile = await generateCsvReportWithUnmapped(['text', 'nested.unmapped']);
        expect((csvFile as string).length).to.be(120);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });

      it('includes all unmapped fields to the report', async () => {
        const csvFile = await generateCsvReportWithUnmapped(['*']);
        expect((csvFile as string).length).to.be(143);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });

    describe('unquoted values', () => {
      const fromTime = '2019-06-20T00:00:00.000Z';
      const toTime = '2019-06-25T00:00:00.000Z';

      before(async () => {
        await esArchiver.load(archives.ecommerce.data);
        await kibanaServer.importExport.load(archives.ecommerce.savedObjects);
        await kibanaServer.uiSettings.update({
          'csv:quoteValues': false,
          'dateFormat:tz': 'UTC',
        });
      });

      after(async () => {
        await esArchiver.unload(archives.ecommerce.data);
        await kibanaServer.importExport.unload(archives.ecommerce.savedObjects);
        await kibanaServer.uiSettings.update({
          'csv:quoteValues': true,
          'dateFormat:tz': 'UTC',
        });
      });

      it('Exports CSV with almost all fields when using fieldsFromSource', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_searchsource',
          createTestCsvJobParams({
            title: 'fieldsFromSource CSV Report',
            searchSource: {
              query: { query: '', language: 'kuery' },
              index: '5193f870-d861-11e9-a311-0fa548c5f953',
              sort: [
                {
                  order_date: {
                    format: 'strict_date_optional_time',
                    order: 'desc' as SortDirection,
                  },
                },
                { order_id: 'desc' as SortDirection },
              ],
              fieldsFromSource: [
                '_id',
                '_index',
                '_score',
                '_source',
                '_type',
                'category',
                'category.keyword',
                'currency',
                'customer_birth_date',
                'customer_first_name',
                'customer_first_name.keyword',
                'customer_full_name',
                'customer_full_name.keyword',
                'customer_gender',
                'customer_id',
                'customer_last_name',
                'customer_last_name.keyword',
                'customer_phone',
                'day_of_week',
                'day_of_week_i',
                'email',
                'geoip.city_name',
                'geoip.continent_name',
                'geoip.country_iso_code',
                'geoip.location',
                'geoip.region_name',
                'manufacturer',
                'manufacturer.keyword',
                'order_date',
                'order_id',
                'products._id',
                'products._id.keyword',
                'products.base_price',
                'products.base_unit_price',
                'products.category',
                'products.category.keyword',
                'products.created_on',
                'products.discount_amount',
                'products.discount_percentage',
                'products.manufacturer',
                'products.manufacturer.keyword',
                'products.min_price',
                'products.price',
                'products.product_id',
                'products.product_name',
                'products.product_name.keyword',
                'products.quantity',
                'products.sku',
                'products.tax_amount',
                'products.taxful_price',
                'products.taxless_price',
                'products.unit_discount_amount',
                'sku',
                'taxful_total_price',
                'taxless_total_price',
                'total_quantity',
                'total_unique_products',
                'type',
                'user',
              ],
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
                    } as Filter,
                  ],
                },
              },
            },
          })
        );
        await reportingAPI.waitForJobToFinish(res.path);
        const csvFile = await reportingAPI.getCompletedJobOutput(res.path);
        expect((csvFile as string).length).to.be(1270683);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });

      it('Exports CSV with all fields when using defaults', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_searchsource',
          createTestCsvJobParams({
            title: 'All Fields CSV Report',
            searchSource: {
              query: { query: '', language: 'kuery' },
              index: '5193f870-d861-11e9-a311-0fa548c5f953',
              sort: [
                {
                  order_date: {
                    format: 'strict_date_optional_time',
                    order: 'desc' as SortDirection,
                  },
                },
                { order_id: 'desc' as SortDirection },
              ],
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
                  ] as unknown as Filter[],
                },
              },
            },
          })
        );
        await reportingAPI.waitForJobToFinish(res.path);
        const csvFile = await reportingAPI.getCompletedJobOutput(res.path);
        expect((csvFile as string).length).to.be(918298);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });

    describe('date formatting', () => {
      before(async () => {
        await esArchiver.load(archives.logs.data);
        await kibanaServer.importExport.load(archives.logs.savedObjects);
      });

      after(async () => {
        await kibanaServer.importExport.unload(archives.logs.savedObjects);
        await esArchiver.unload(archives.logs.data);
      });

      it('With filters and timebased data, default to UTC', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_searchsource',
          createTestCsvJobParams({
            browserTimezone: undefined,
            title: 'Default Timezone CSV Report',
            searchSource: {
              fields: ['@timestamp', 'clientip', 'extension'],
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: '2015-09-20T10:19:40.307Z',
                      lt: '2015-09-20T10:26:56.221Z',
                    },
                  },
                },
                {
                  range: {
                    '@timestamp': {
                      format: 'strict_date_optional_time',
                      gte: '2015-01-12T07:00:55.654Z',
                      lte: '2016-01-29T21:08:10.881Z',
                    },
                  },
                },
              ] as unknown as Filter[],
              index: 'logstash-*',
              query: { language: 'kuery', query: '' },
              sort: [{ '@timestamp': 'desc' as SortDirection }],
            },
            columns: ['@timestamp', 'clientip', 'extension'],
          })
        );
        await reportingAPI.waitForJobToFinish(res.path);
        const csvFile = await reportingAPI.getCompletedJobOutput(res.path);
        expect((csvFile as string).length).to.be(3020);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });

      it('With filters and timebased data, non-default timezone', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_searchsource',
          createTestCsvJobParams({
            title: 'CSV Report of Non-Default Timezone',
            browserTimezone: 'America/Phoenix',
            searchSource: {
              fields: ['@timestamp', 'clientip', 'extension'],
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: '2015-09-20T10:19:40.307Z',
                      lt: '2015-09-20T10:26:56.221Z',
                    },
                  },
                },
                {
                  range: {
                    '@timestamp': {
                      format: 'strict_date_optional_time',
                      gte: '2015-01-12T07:00:55.654Z',
                      lte: '2016-01-29T21:08:10.881Z',
                    },
                  },
                },
              ] as unknown as Filter[],
              index: 'logstash-*',
              query: { language: 'kuery', query: '' },
              sort: [{ '@timestamp': 'desc' as SortDirection }],
            },
            columns: ['@timestamp', 'clientip', 'extension'],
          })
        );
        await reportingAPI.waitForJobToFinish(res.path);
        const csvFile = await reportingAPI.getCompletedJobOutput(res.path);
        expect((csvFile as string).length).to.be(3020);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });

    describe('nanosecond formatting', () => {
      before(async () => {
        await esArchiver.load(archives.nanos.data);
        await kibanaServer.importExport.load(archives.nanos.savedObjects);
      });

      after(async () => {
        await esArchiver.unload(archives.nanos.data);
        await kibanaServer.importExport.unload(archives.nanos.savedObjects);
      });

      it('Formatted date_nanos data, UTC timezone', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_searchsource',
          createTestCsvJobParams({
            title: 'Date_Nanos CSV Report',
            searchSource: {
              query: { query: '', language: 'kuery' },
              version: true,
              index: '907bc200-a294-11e9-a900-ef10e0ac769e',
              sort: [{ date: 'desc' as SortDirection }],
              fields: ['date', 'message'],
              filter: [],
            },
            columns: ['date', 'message'],
          })
        );
        await reportingAPI.waitForJobToFinish(res.path);
        const csvFile = await reportingAPI.getCompletedJobOutput(res.path);
        expect((csvFile as string).length).to.be(103);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });

      it('Formatted date_nanos data, custom timezone (New York)', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_searchsource',
          createTestCsvJobParams({
            browserTimezone: 'America/New_York',
            title: 'Date_Nanos New York Timezone CSV Report',
            searchSource: {
              query: { query: '', language: 'kuery' },
              version: true,
              index: '907bc200-a294-11e9-a900-ef10e0ac769e',
              sort: [{ date: 'desc' as SortDirection }],
              fields: ['date', 'message'],
              filter: [],
            },
            columns: ['date', 'message'],
          })
        );
        await reportingAPI.waitForJobToFinish(res.path);
        const csvFile = await reportingAPI.getCompletedJobOutput(res.path);
        expect((csvFile as string).length).to.be(103);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });

    describe('non-timebased', () => {
      before(async () => {
        await esArchiver.load(archives.nanos.data);
        await kibanaServer.importExport.load(archives.nanos.savedObjects);
        await esArchiver.load(archives.sales.data);
        await kibanaServer.importExport.load(archives.sales.savedObjects);
      });

      after(async () => {
        await esArchiver.unload(archives.nanos.data);
        await kibanaServer.importExport.unload(archives.nanos.savedObjects);
        await esArchiver.unload(archives.sales.data);
        await kibanaServer.importExport.unload(archives.sales.savedObjects);
      });

      it('Handle _id and _index columns', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_searchsource',
          createTestCsvJobParams({
            title: 'Handled _id and _index columns CSV Report',
            searchSource: {
              query: { query: '', language: 'kuery' },
              version: true,
              index: '907bc200-a294-11e9-a900-ef10e0ac769e',
              sort: [{ date: 'desc' as SortDirection }],
              filter: [],
            },
            columns: ['date', 'message', '_id', '_index'],
          })
        );
        await reportingAPI.waitForJobToFinish(res.path);
        const csvFile = await reportingAPI.getCompletedJobOutput(res.path);
        expect((csvFile as string).length).to.be(134);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });

      it('With filters and non-timebased data', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_searchsource',
          createTestCsvJobParams({
            title: 'Filters and Non-Timebased Data CSV Report',
            searchSource: {
              query: { query: '', language: 'kuery' },
              version: true,
              index: 'timeless-sales',
              sort: [{ power: 'asc' as SortDirection }],
              fields: ['name', 'power'],
              filter: [
                {
                  range: { power: { gte: 1, lt: null } },
                },
              ] as unknown as Filter[],
            },
            columns: ['name', 'power'],
          })
        );
        await reportingAPI.waitForJobToFinish(res.path);
        const csvFile = await reportingAPI.getCompletedJobOutput(res.path);
        expect((csvFile as string).length).to.be(274);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });

    describe('_id field is a big integer', () => {
      before(async () => {
        await Promise.all([
          esArchiver.load(archives.bigIntIdField.data),
          kibanaServer.importExport.load(archives.bigIntIdField.savedObjects),
        ]);
      });

      after(async () => {
        await Promise.all([
          esArchiver.unload(archives.bigIntIdField.data),
          kibanaServer.importExport.unload(archives.bigIntIdField.savedObjects),
        ]);
      });

      it('passes through the value without mutation', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_searchsource',
          createTestCsvJobParams({
            title: 'A Big Integer for _id CSV Report',
            searchSource: {
              query: { query: '', language: 'kuery' },
              fields: [{ field: '*', include_unmapped: true }],
              index: 'c424ce04-f440-4f48-aa0c-534da84d06f6',
              sort: [{ timestamp: 'desc' as SortDirection }],
              filter: [
                {
                  meta: {
                    index: 'c424ce04-f440-4f48-aa0c-534da84d06f6',
                    params: {},
                    field: 'timestamp',
                  },
                  query: {
                    range: {
                      timestamp: {
                        format: 'strict_date_optional_time',
                        gte: '2007-10-25T21:18:23.905Z',
                        lte: '2022-10-30T00:00:00.000Z',
                      },
                    },
                  },
                },
              ] as unknown as Filter[],
              parent: {
                query: { query: '', language: 'kuery' },
                filter: [],
                parent: {
                  filter: [
                    {
                      meta: {
                        index: 'c424ce04-f440-4f48-aa0c-534da84d06f6',
                        params: {},
                        field: 'timestamp',
                      },
                      query: {
                        range: {
                          timestamp: {
                            format: 'strict_date_optional_time',
                            gte: '2007-10-25T21:18:23.905Z',
                            lte: '2022-10-30T00:00:00.000Z',
                          },
                        },
                      },
                    },
                  ] as unknown as Filter[],
                },
              },
            },
            columns: [],
          })
        );
        await reportingAPI.waitForJobToFinish(res.path);
        const csvFile = await reportingAPI.getCompletedJobOutput(res.path);
        expect((csvFile as string).length).to.be(356);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });

    describe('validation', () => {
      before(async () => {
        await esArchiver.load(archives.ecommerce.data);
        await kibanaServer.importExport.load(archives.ecommerce.savedObjects);
      });

      after(async () => {
        await esArchiver.unload(archives.ecommerce.data);
        await kibanaServer.importExport.unload(archives.ecommerce.savedObjects);
      });

      // NOTE: this test requires having the test server run with `xpack.reporting.csv.maxSizeBytes=6000`
      it('Searches large amount of data, stops at Max Size Reached', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_searchsource',
          createTestCsvJobParams({
            title: 'Large Data and Max Size Reached CSV Report',
            searchSource: {
              version: true,
              query: { query: '', language: 'kuery' },
              index: '5193f870-d861-11e9-a311-0fa548c5f953',
              sort: [
                {
                  order_date: {
                    format: 'strict_date_optional_time',
                    order: 'desc' as SortDirection,
                  },
                },
                { order_id: 'desc' as SortDirection },
              ],
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
                          gte: '2019-03-23T00:00:00.000Z',
                          lte: '2019-10-04T00:00:00.000Z',
                          format: 'strict_date_optional_time',
                        },
                      },
                    },
                  ] as unknown as Filter[],
                },
              },
            },
          })
        );
        await reportingAPI.waitForJobToFinish(res.path);
        const csvFile = await reportingAPI.getCompletedJobOutput(res.path);
        expect((csvFile as string).length).to.be(4845684);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });
  });
}
