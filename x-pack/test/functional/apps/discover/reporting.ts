/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Key } from 'selenium-webdriver';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const esVersion = getService('esVersion');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['reporting', 'common', 'discover', 'timePicker', 'share']);
  const filterBar = getService('filterBar');
  const ecommerceSOPath = 'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce.json';
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

  describe('Discover CSV Export', function () {
    before('initialize tests', async () => {
      log.debug('ReportingPage:initTests');
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce');
      await kibanaServer.importExport.load(ecommerceSOPath);
      await browser.setWindowSize(1600, 850);
    });

    after('clean up archives', async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
      await kibanaServer.importExport.unload(ecommerceSOPath);
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

    const describeIfEs7 = esVersion.matchRange('<8') ? describe : describe.skip;
    const describeIfEs8 = esVersion.matchRange('>=8') ? describe : describe.skip;

    const newSearchBeforeEach = async () => {
      await kibanaServer.importExport.load(ecommerceSOPath);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('ecommerce');
    };

    describeIfEs8('Generate: CSV: new search (8.x)', () => {
      beforeEach(newSearchBeforeEach);

      it('generates a report from a new search with data: default', async () => {
        await PageObjects.discover.clickNewSearchButton();
        await PageObjects.reporting.setTimepickerInEcommerceDataRange();

        const res = await getReport();
        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('text/csv; charset=utf-8');

        const csvFile = res.text;
        expectSnapshot(csvFile).toMatch();
      });
    });

    describeIfEs7('Generate CSV: new search (7.17)', () => {
      beforeEach(newSearchBeforeEach);

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
        expect(csvFile.length).to.be(5107481);
        expectSnapshot(csvFile.slice(0, 5000)).toMatch();
        expectSnapshot(csvFile.slice(-5000)).toMatch();
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

      afterEach(async () => {
        await PageObjects.reporting.checkForReportingToasts();
      });

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
