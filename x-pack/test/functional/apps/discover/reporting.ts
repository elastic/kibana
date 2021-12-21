/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterMeta } from '@kbn/es-query';
import expect from '@kbn/expect';
import moment from 'moment';
import { EsQuerySortValue } from 'src/plugins/data/common';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const reportingAPI = getService('reporting');
  const log = getService('log');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['reporting', 'common', 'discover', 'timePicker']);
  const filterBar = getService('filterBar');
  const ecommerceSOPath = 'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce.json';

  const setFieldsFromSource = async (setValue: boolean) => {
    await kibanaServer.uiSettings.update({ 'discover:searchFieldsFromSource': setValue });
    await browser.refresh();
  };

  const getReport = async () => {
    await PageObjects.reporting.openCsvReportingPanel();
    await PageObjects.reporting.clickGenerateReportButton();

    const url = await PageObjects.reporting.getReportURL(60000);
    const res = await PageObjects.reporting.getResponse(url);

    expect(res.status).to.equal(200);
    expect(res.get('content-type')).to.equal('text/csv; charset=utf-8');
    return res;
  };

  describe('Discover CSV Export', () => {
    before('initialize tests', async () => {
      log.debug('ReportingPage:initTests');
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce');
      await kibanaServer.importExport.load(ecommerceSOPath);
      await browser.setWindowSize(1600, 850);
    });

    after('clean up archives', async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
      await kibanaServer.importExport.unload(ecommerceSOPath);
      await reportingAPI.deleteAllReports();
      await esArchiver.emptyKibanaIndex();
    });

    describe('Check Available', () => {
      beforeEach(() => PageObjects.common.navigateToApp('discover'));

      it('is available if new', async () => {
        await PageObjects.reporting.openCsvReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });

      it('becomes available when saved', async () => {
        await PageObjects.discover.saveSearch('my search - expectEnabledGenerateReportButton');
        await PageObjects.reporting.openCsvReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });
    });

    describe('Generate CSV: new search', () => {
      beforeEach(async () => {
        await kibanaServer.importExport.load(ecommerceSOPath);
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.discover.selectIndexPattern('ecommerce');
      });

      it('generates a report from a new search with data: default', async () => {
        await PageObjects.discover.clickNewSearchButton();
        await PageObjects.reporting.setTimepickerInEcommerceDataRange();

        await PageObjects.discover.saveSearch('my search - with data - expectReportCanBeCreated');

        const res = await getReport();
        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('text/csv; charset=utf-8');

        const csvFile = res.text;
        expectSnapshot(csvFile).toMatch();
      });

      it('generates a report with no data', async () => {
        await PageObjects.reporting.setTimepickerInEcommerceNoDataRange();
        await PageObjects.discover.saveSearch('my search - no data - expectReportCanBeCreated');

        const res = await getReport();
        expect(res.text).to.be(`\n`);
      });

      it('generates a large export', async () => {
        const fromTime = 'Apr 27, 2019 @ 23:56:51.374';
        const toTime = 'Aug 23, 2019 @ 16:18:51.821';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.discover.clickNewSearchButton();
        await retry.try(async () => {
          expect(await PageObjects.discover.getHitCount()).to.equal('4,675');
        });
        await PageObjects.discover.saveSearch('large export');

        // match file length, the beginning and the end of the csv file contents
        const { text: csvFile } = await getReport();
        expect(csvFile.length).to.be(5093456);
        expectSnapshot(csvFile.slice(0, 5000)).toMatch();
        expectSnapshot(csvFile.slice(-5000)).toMatch();
      });
    });

    describe('Generate CSV: sparse data', () => {
      const TEST_INDEX_NAME = 'sparse_data';

      const reset = async () => {
        try {
          await esArchiver.emptyKibanaIndex();
          await es.indices.delete({ index: TEST_INDEX_NAME });
        } catch (err) {
          // ignore 404 error
        }
      };

      let indexPatternId: string;
      before(async () => {
        await reset();

        interface TestDoc {
          timestamp: string;
          name: string;
          updated_at?: string;
        }

        // setup: add 510 test documents
        // conditionally set a value for a date field in the last 5 rows of data
        const docs = Array<TestDoc>(510);
        for (let i = 0; i <= docs.length - 1; i++) {
          const name = `test-${i + 1}`;
          const timestamp = moment
            .utc('2006-08-14T00:00:00')
            .subtract(510 - i, 'days')
            .format();

          if (i >= 500) {
            docs[i] = {
              timestamp,
              name,
              updated_at: moment.utc('2006-08-14T00:00:00').format(),
            };
          } else {
            // updated_at field does not exist in first 500 documents
            docs[i] = { timestamp, name };
          }
        }

        const res = await es.bulk({
          index: TEST_INDEX_NAME,
          body: docs.map((d) => `{"index": {}}\n${JSON.stringify(d)}\n`),
        });

        log.info(`Indexed ${res.items.length} test data docs.`);

        // setup: create index pattern
        const indexPatternCreateResponse = await kibanaServer.savedObjects.create({
          type: 'index-pattern',
          overwrite: true,
          attributes: { title: TEST_INDEX_NAME, timeFieldName: 'timestamp' },
        });

        indexPatternId = indexPatternCreateResponse.id;
        log.info(`Created data view ${indexPatternId}`);
      });

      after(reset);

      it('uses correct formats for fields that did not exist in previous pages of data', async () => {
        await kibanaServer.uiSettings.update({ 'csv:quoteValues': true });

        // 1. check the data
        const { text: reportApiJson, status } = await reportingAPI.generateCsv({
          browserTimezone: 'UTC',
          columns: ['timestamp', 'name', 'updated_at'],
          objectType: 'search',
          searchSource: {
            fields: [{ field: '*', include_unmapped: 'true' }],
            filter: [
              {
                meta: {
                  field: 'timestamp',
                  index: indexPatternId,
                  params: {},
                } as FilterMeta,
                query: {
                  range: {
                    timestamp: {
                      format: 'strict_date_optional_time',
                      gte: '2005-01-01T00:00:00.000Z',
                      lte: '2006-12-01T00:00:00.000Z',
                    },
                  },
                },
              },
              {
                meta: {
                  field: 'timestamp',
                  index: indexPatternId,
                  params: {},
                } as FilterMeta,
                query: {
                  range: {
                    timestamp: {
                      format: 'strict_date_optional_time',
                      gte: '2005-01-01T00:00:00.000Z',
                      lte: '2006-12-01T00:00:00.000Z',
                    },
                  },
                },
              },
            ],
            index: indexPatternId,
            parent: {
              filter: [],
              index: indexPatternId,
              query: { language: 'kuery', query: '' },
            },
            sort: [{ timestamp: 'asc' }] as EsQuerySortValue[],
            trackTotalHits: true,
          },
          title: 'Sparse data search',
          version: '8.1.0',
        });
        expect(status).to.be(200);

        const { path } = JSON.parse(reportApiJson) as { path: string };

        // wait for the the pending job to complete
        await reportingAPI.waitForJobToFinish(path);

        const csvFile = await reportingAPI.getCompletedJobOutput(path);
        expectSnapshot(csvFile).toMatch();

        await reportingAPI.deleteAllReports();
      });
    });

    describe('Generate CSV: archived search', () => {
      const setupPage = async () => {
        const fromTime = 'Jun 22, 2019 @ 00:00:00.000';
        const toTime = 'Jun 26, 2019 @ 23:30:00.000';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      };

      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce');
        await kibanaServer.importExport.load(ecommerceSOPath);
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
        await kibanaServer.importExport.unload(ecommerceSOPath);
      });

      beforeEach(() => PageObjects.common.navigateToApp('discover'));

      it('generates a report with data', async () => {
        await setupPage();
        await PageObjects.discover.loadSavedSearch('Ecommerce Data');
        await retry.try(async () => {
          expect(await PageObjects.discover.getHitCount()).to.equal('740');
        });

        const { text: csvFile } = await getReport();
        expectSnapshot(csvFile).toMatch();
      });

      it('generates a report with filtered data', async () => {
        await setupPage();
        await PageObjects.discover.loadSavedSearch('Ecommerce Data');
        await retry.try(async () => {
          expect(await PageObjects.discover.getHitCount()).to.equal('740');
        });

        // filter
        await filterBar.addFilter('category', 'is', `Men's Shoes`);
        await retry.try(async () => {
          expect(await PageObjects.discover.getHitCount()).to.equal('154');
        });

        const { text: csvFile } = await getReport();
        expectSnapshot(csvFile).toMatch();
      });

      it('generates a report with discover:searchFieldsFromSource = true', async () => {
        await setupPage();
        await PageObjects.discover.loadSavedSearch('Ecommerce Data');

        await retry.try(async () => {
          expect(await PageObjects.discover.getHitCount()).to.equal('740');
        });

        await setFieldsFromSource(true);

        const { text: csvFile } = await getReport();
        expectSnapshot(csvFile).toMatch();

        await setFieldsFromSource(false);
      });
    });
  });
}
