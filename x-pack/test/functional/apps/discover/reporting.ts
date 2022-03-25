/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Key } from 'selenium-webdriver';
import moment from 'moment';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const reportingAPI = getService('reporting');
  const log = getService('log');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['reporting', 'common', 'discover', 'timePicker', 'share']);
  const filterBar = getService('filterBar');
  const find = getService('find');
  const testSubjects = getService('testSubjects');

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
    describe('Check Available', () => {
      before(async () => {
        await esArchiver.emptyKibanaIndex();
        await reportingAPI.initEcommerce();
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.discover.selectIndexPattern('ecommerce');
      });

      after(async () => {
        await reportingAPI.teardownEcommerce();
      });

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
      before(async () => {
        await reportingAPI.initEcommerce();
      });

      after(async () => {
        await reportingAPI.teardownEcommerce();
      });

      beforeEach(async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.discover.selectIndexPattern('ecommerce');
      });

      it('generates a report with single timefilter', async () => {
        await PageObjects.discover.clickNewSearchButton();
        await PageObjects.timePicker.setCommonlyUsedTime('Last_24 hours');
        await PageObjects.discover.saveSearch('single-timefilter-search');

        // get shared URL value
        await PageObjects.share.clickShareTopNavButton();
        const sharedURL = await PageObjects.share.getSharedUrl();

        // click 'Copy POST URL'
        await PageObjects.share.clickShareTopNavButton();
        await PageObjects.reporting.openCsvReportingPanel();
        const advOpt = await find.byXPath(`//button[descendant::*[text()='Advanced options']]`);
        await advOpt.click();
        const postUrl = await find.byXPath(`//button[descendant::*[text()='Copy POST URL']]`);
        await postUrl.click();

        // get clipboard value using field search input, since
        // 'browser.getClipboardValue()' doesn't work, due to permissions
        const textInput = await testSubjects.find('fieldFilterSearchInput');
        await textInput.click();
        await browser.getActions().keyDown(Key.CONTROL).perform();
        await browser.getActions().keyDown('v').perform();

        const reportURL = decodeURIComponent(await textInput.getAttribute('value'));

        // get number of filters in URLs
        const timeFiltersNumberInReportURL =
          reportURL.split('query:(range:(order_date:(format:strict_date_optional_time').length - 1;
        const timeFiltersNumberInSharedURL = sharedURL.split('time:').length - 1;

        expect(timeFiltersNumberInSharedURL).to.be(1);
        expect(sharedURL.includes('time:(from:now-24h%2Fh,to:now))')).to.be(true);

        expect(timeFiltersNumberInReportURL).to.be(1);
        expect(
          reportURL.includes(
            'query:(range:(order_date:(format:strict_date_optional_time,gte:now-24h/h,lte:now))))'
          )
        ).to.be(true);

        // return keyboard state
        await browser.getActions().keyUp(Key.CONTROL).perform();
        await browser.getActions().keyUp('v').perform();

        //  return field search input state
        await textInput.clearValue();
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
        expect(csvFile.length).to.be(4826973);
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
        await reportingAPI.initLogs();
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.discover.loadSavedSearch('Sparse Columns');
      });

      after(async () => {
        await reportingAPI.teardownLogs();
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
        expect(res.get('content-type')).to.equal('text/csv; charset=utf-8');

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
        await reportingAPI.initEcommerce();
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.discover.selectIndexPattern('ecommerce');
      });

      after(async () => {
        await reportingAPI.teardownEcommerce();
      });

      beforeEach(async () => {
        await setupPage();
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
        await filterBar.addFilter('category', 'is', `Men's Shoes`);
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
      });
    });
  });
}
