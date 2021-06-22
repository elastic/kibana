/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['reporting', 'common', 'discover', 'timePicker']);
  const filterBar = getService('filterBar');

  const setFieldsFromSource = async (setValue: boolean) => {
    await kibanaServer.uiSettings.update({ 'discover:searchFieldsFromSource': setValue });
  };

  describe('Discover CSV Export', () => {
    before('initialize tests', async () => {
      log.debug('ReportingPage:initTests');
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce');
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce_kibana');
      await browser.setWindowSize(1600, 850);
    });
    after('clean up archives', async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce_kibana');
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
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

      it('remains available regardless of the saved search state', async () => {
        // create new search, csv export is not available
        await PageObjects.discover.clickNewSearchButton();
        await PageObjects.reporting.openCsvReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
        // save search, csv export is available
        await PageObjects.discover.saveSearch('my search - expectEnabledGenerateReportButton 2');
        await PageObjects.reporting.openCsvReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
        // add filter, csv export is not available
        await filterBar.addFilter('currency', 'is', 'EUR');
        await PageObjects.reporting.openCsvReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
        // save search again, csv export is available
        await PageObjects.discover.saveSearch('my search - expectEnabledGenerateReportButton 2');
        await PageObjects.reporting.openCsvReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });
    });

    describe('Generate CSV: new search', () => {
      beforeEach(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce_kibana'); // reload the archive to wipe out changes made by each test
        await PageObjects.common.navigateToApp('discover');
      });

      it('generates a report from a new search with data: default', async () => {
        await PageObjects.discover.clickNewSearchButton();
        await PageObjects.reporting.setTimepickerInDataRange();
        await PageObjects.discover.saveSearch('my search - with data - expectReportCanBeCreated');
        await PageObjects.reporting.openCsvReportingPanel();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('text/csv; charset=utf-8');
        expectSnapshot(res.text).toMatch();
      });

      it('generates a report from a new search with data: discover:searchFieldsFromSource', async () => {
        await setFieldsFromSource(true);
        await PageObjects.discover.clickNewSearchButton();
        await PageObjects.reporting.setTimepickerInDataRange();
        await PageObjects.discover.saveSearch(
          'my search - with fieldsFromSource data - expectReportCanBeCreated'
        );
        await PageObjects.reporting.openCsvReportingPanel();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('text/csv; charset=utf-8');
        expectSnapshot(res.text).toMatch();
        await setFieldsFromSource(false);
      });

      it('generates a report with no data', async () => {
        await PageObjects.reporting.setTimepickerInNoDataRange();
        await PageObjects.discover.saveSearch('my search - no data - expectReportCanBeCreated');
        await PageObjects.reporting.openCsvReportingPanel();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('text/csv; charset=utf-8');
        expectSnapshot(res.text).toMatchInline(`
          "
          "
        `);
      });
    });

    describe('Generate CSV: archived search', () => {
      const setupPage = async () => {
        const fromTime = 'Apr 27, 2019 @ 23:56:51.374';
        const toTime = 'Aug 23, 2019 @ 16:18:51.821';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
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

      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce');
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce_kibana');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce_kibana');
      });

      beforeEach(() => PageObjects.common.navigateToApp('discover'));

      it('generates a report with data', async () => {
        await setupPage();
        await PageObjects.discover.loadSavedSearch('Ecommerce Data');

        const { text } = await getReport();
        expectSnapshot(text).toMatch();
      });

      it('generates a report with filtered data', async () => {
        await setupPage();
        await PageObjects.discover.loadSavedSearch('Ecommerce Data');

        // filter and re-save
        await filterBar.addFilter('currency', 'is', 'EUR');
        await PageObjects.discover.saveSearch(`Ecommerce Data: EUR Filtered`); // renamed the search

        const { text } = await getReport();
        expectSnapshot(text).toMatch();
        await PageObjects.discover.saveSearch(`Ecommerce Data`); // rename the search back for the next test
      });

      it('generates a report with discover:searchFieldsFromSource = true', async () => {
        await setupPage();
        await PageObjects.discover.loadSavedSearch('Ecommerce Data');

        await setFieldsFromSource(true);
        await browser.refresh();

        const { text } = await getReport();
        expectSnapshot(text).toMatch();
        await setFieldsFromSource(false);
      });
    });
  });
}
