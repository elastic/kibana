/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const reportingAPI = getService('reporting');
  const log = getService('log');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const retry = getService('retry');
  const PageObjects = getPageObjects([
    'reporting',
    'common',
    'svlCommonPage',
    'discover',
    'timePicker',
    'share',
    'unifiedFieldList',
    'timePicker',
  ]);
  const filterBar = getService('filterBar');
  const toasts = getService('toasts');

  const setFieldsFromSource = async (setValue: boolean) => {
    await kibanaServer.uiSettings.update({ 'discover:searchFieldsFromSource': setValue });
    await browser.refresh();
  };

  const getReport = async ({ timeout } = { timeout: 60 * 1000 }) => {
    // close any open notification toasts
    await toasts.dismissAll();

    await PageObjects.reporting.openExportTab();
    await PageObjects.reporting.clickGenerateReportButton();

    const url = await PageObjects.reporting.getReportURL(timeout);
    // TODO: Fetch CSV client side in Serverless since `PageObjects.reporting.getResponse()`
    // doesn't work because it relies on `SecurityService.testUserSupertest`
    const res: { status: number; contentType: string | null; text: string } =
      await browser.executeAsync(async (downloadUrl, resolve) => {
        const response = await fetch(downloadUrl ?? '');
        resolve({
          status: response.status,
          contentType: response.headers.get('content-type'),
          text: await response.text(),
        });
      }, url);

    expect(res.status).to.equal(200);
    expect(res.contentType).to.equal('text/csv; charset=utf-8');
    return res;
  };

  describe('Discover CSV Export', function () {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsAdmin();
      // TODO: emptyKibanaIndex fails in Serverless with
      // "index_not_found_exception: no such index [.kibana_ingest]",
      // so it was switched to `savedObjects.cleanStandardList()`
      await kibanaServer.savedObjects.cleanStandardList();
      await reportingAPI.initEcommerce({
        batchSize: 5000,
        concurrency: 4,
      });
      await PageObjects.common.navigateToApp('discover');
    });

    after(async () => {
      await reportingAPI.teardownEcommerce();
      // TODO: emptyKibanaIndex fails in Serverless with
      // "index_not_found_exception: no such index [.kibana_ingest]",
      // so it was switched to `savedObjects.cleanStandardList()`
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('Check Available', () => {
      before(async () => {
        await PageObjects.discover.loadSavedSearch('Ecommerce Data');
      });

      afterEach(async () => {
        await PageObjects.share.closeShareModal();
      });

      it('is available if new', async () => {
        await PageObjects.reporting.openExportTab();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });

      it('becomes available when saved', async () => {
        await PageObjects.discover.saveSearch(
          'my search - expectEnabledGenerateReportButton',
          true
        );
        await PageObjects.reporting.openExportTab();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });
    });

    describe('Generate CSV: new search', () => {
      it('generates a report from a new search with data: default', async () => {
        await PageObjects.discover.clickNewSearchButton();
        await PageObjects.reporting.setTimepickerInEcommerceDataRange();
        await PageObjects.unifiedFieldList.clickFieldListItemAdd('order_id');
        await PageObjects.discover.clickFieldSort('order_id', 'Sort A-Z');
        await PageObjects.discover.saveSearch('my search - with data - expectReportCanBeCreated');

        const res = await getReport();
        expect(res.status).to.equal(200);
        expect(res.contentType).to.equal('text/csv; charset=utf-8');

        const csvFile = res.text;
        expectSnapshot(csvFile).toMatch();
      });

      it('generates a report with no data', async () => {
        await PageObjects.reporting.setTimepickerInEcommerceNoDataRange();
        await PageObjects.discover.clickNewSearchButton();
        await PageObjects.discover.saveSearch('my search - no data - expectReportCanBeCreated');

        const res = await getReport();
        expect(res.text).to.be(`\n`);
      });

      it('generates a large export', async () => {
        await PageObjects.discover.loadSavedSearch('Ecommerce Data');
        const fromTime = 'Apr 27, 2019 @ 23:56:51.374';
        const toTime = 'Aug 23, 2019 @ 16:18:51.821';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);

        await retry.try(async () => {
          expect(await PageObjects.discover.getHitCount()).to.equal('4,675');
        });
        await PageObjects.discover.saveSearch('large export');

        // match file length, the beginning and the end of the csv file contents
        const { text: csvFile } = await getReport({ timeout: 80 * 1000 });
        expect(csvFile.length).to.be(782100);
        expectSnapshot(csvFile.slice(0, 5000)).toMatch();
        expectSnapshot(csvFile.slice(-5000)).toMatch();
      });
    });

    describe('Generate CSV: sparse data', () => {
      const TEST_INDEX_NAME = 'sparse_data';
      const TEST_DOC_COUNT = 510;

      const reset = async () => {
        try {
          await es.indices.delete({ index: TEST_INDEX_NAME });
        } catch (err) {
          // ignore 404 error
        }
      };

      const createDocs = async () => {
        interface TestDoc {
          timestamp: string;
          name: string;
          updated_at?: string;
        }

        const docs = Array<TestDoc>(TEST_DOC_COUNT);

        for (let i = 0; i <= docs.length - 1; i++) {
          const name = `test-${i + 1}`;
          const timestamp = moment
            .utc('2006-08-14T00:00:00')
            .subtract(TEST_DOC_COUNT - i, 'days')
            .format();

          if (i === 0) {
            // only the oldest document has a value for updated_at
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
      };

      before(async () => {
        await reset();
        await createDocs();
        // TODO: Manually loading logs archive and logs SOs in Serverless
        // instead of using `reportingAPI.initLogs()` since the original
        // logs SOs include a canvas SO which is not supported in Serverless
        await esArchiver.load('x-pack/test/functional/es_archives/logstash_functional');
        await kibanaServer.importExport.load(
          'x-pack/test_serverless/functional/fixtures/kbn_archiver/reporting/logs'
        );
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.discover.loadSavedSearch('Sparse Columns');
      });

      after(async () => {
        // TODO: Manually unloading logs archive and logs SOs in Serverless
        // instead of using `reportingAPI.teardownLogs()` since the original
        // logs SOs include a canvas SO which is not supported in Serverless
        await kibanaServer.importExport.unload(
          'x-pack/test_serverless/functional/fixtures/kbn_archiver/reporting/logs'
        );
        await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
        await reset();
      });

      beforeEach(async () => {
        const fromTime = 'Jan 10, 2005 @ 00:00:00.000';
        const toTime = 'Dec 23, 2006 @ 00:00:00.000';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await retry.try(async () => {
          expect(await PageObjects.discover.getHitCount()).to.equal(TEST_DOC_COUNT.toString());
        });
      });

      it(`handles field formatting for a field that doesn't exist initially`, async () => {
        const res = await getReport();
        expect(res.status).to.equal(200);
        expect(res.contentType).to.equal('text/csv; charset=utf-8');

        const csvFile = res.text;
        expectSnapshot(csvFile).toMatch();
      });
    });

    describe('Generate CSV: archived search', () => {
      const setupPage = async () => {
        const fromTime = 'Jun 22, 2019 @ 00:00:00.000';
        const toTime = 'Jun 26, 2019 @ 23:30:00.000';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      };

      before(async () => {
        await PageObjects.discover.loadSavedSearch('Ecommerce Data');
      });

      beforeEach(async () => {
        await setupPage();
      });

      // TODO: Allow skipping the toast check if we know
      // there will be none since it will wait for 90s
      let checkForReportingToasts = true;

      afterEach(async () => {
        if (checkForReportingToasts) {
          await PageObjects.reporting.checkForReportingToasts();
        }
        checkForReportingToasts = true;
      });

      it('generates a report with data', async () => {
        await PageObjects.discover.loadSavedSearch('Ecommerce Data');
        await retry.try(async () => {
          expect(await PageObjects.discover.getHitCount()).to.equal('740');
        });

        const { text: csvFile } = await getReport();
        expectSnapshot(csvFile).toMatch();
      });

      it('generates a report with filtered data', async () => {
        await PageObjects.discover.loadSavedSearch('Ecommerce Data');
        await retry.try(async () => {
          expect(await PageObjects.discover.getHitCount()).to.equal('740');
        });

        // filter
        await filterBar.addFilter({ field: 'category', operation: 'is', value: `Men's Shoes` });
        await retry.try(async () => {
          expect(await PageObjects.discover.getHitCount()).to.equal('154');
        });

        const { text: csvFile } = await getReport();
        expectSnapshot(csvFile).toMatch();
      });

      it('generates a report with discover:searchFieldsFromSource = true', async () => {
        await PageObjects.discover.loadSavedSearch('Ecommerce Data');

        await retry.try(async () => {
          expect(await PageObjects.discover.getHitCount()).to.equal('740');
        });

        await setFieldsFromSource(true);

        const { text: csvFile } = await getReport();
        expectSnapshot(csvFile).toMatch();

        await setFieldsFromSource(false);
        // TODO: We refreshed the page in `setFieldsFromSource`,
        // so no toast will be shown
        checkForReportingToasts = false;
      });
    });
  });
}
