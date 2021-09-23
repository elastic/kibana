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
  const ecommerceSOPath = 'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce.json';

  const setFieldsFromSource = async (setValue: boolean) => {
    await kibanaServer.uiSettings.update({ 'discover:searchFieldsFromSource': setValue });
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
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
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
      });

      it('generates a report from a new search with data: default', async () => {
        await PageObjects.discover.clickNewSearchButton();
        await PageObjects.reporting.setTimepickerInEcommerceDataRange();

        await PageObjects.discover.saveSearch('my search - with data - expectReportCanBeCreated');
        await PageObjects.reporting.openCsvReportingPanel();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('text/csv; charset=utf-8');

        const csvFile = res.text;
        expectSnapshot(csvFile).toMatch();
      });

      it('generates a report from a new search with data: discover:searchFieldsFromSource', async () => {
        await setFieldsFromSource(true);
        await PageObjects.discover.clickNewSearchButton();
        await PageObjects.reporting.setTimepickerInEcommerceDataRange();

        await PageObjects.discover.saveSearch(
          'my search - with fieldsFromSource data - expectReportCanBeCreated'
        );
        await PageObjects.reporting.openCsvReportingPanel();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('text/csv; charset=utf-8');

        const csvFile = res.text;
        expectSnapshot(csvFile).toMatch();

        await setFieldsFromSource(false);
      });

      it('generates a report with no data', async () => {
        await PageObjects.reporting.setTimepickerInEcommerceNoDataRange();
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
        const fromTime = 'Jun 22, 2019 @ 00:00:00.000';
        const toTime = 'Jun 26, 2019 @ 23:30:00.000';
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
        expect(await PageObjects.discover.getHitCount()).to.equal('740');

        const { text: csvFile } = await getReport();
        expectSnapshot(csvFile).toMatch();
      });

      it('generates a report with filtered data', async () => {
        await setupPage();
        await PageObjects.discover.loadSavedSearch('Ecommerce Data');
        expect(await PageObjects.discover.getHitCount()).to.equal('740');

        // filter
        await filterBar.addFilter('category', 'is', `Men's Shoes`);

        const { text: csvFile } = await getReport();
        expectSnapshot(csvFile).toMatch();
      });

      it('generates a report with discover:searchFieldsFromSource = true', async () => {
        await setupPage();
        await PageObjects.discover.loadSavedSearch('Ecommerce Data');
        expect(await PageObjects.discover.getHitCount()).to.equal('740');

        await setFieldsFromSource(true);
        await browser.refresh();

        const { text: csvFile } = await getReport();
        expectSnapshot(csvFile).toMatch();

        await setFieldsFromSource(false);
      });

      it('generates a large export', async () => {
        const fromTime = 'Apr 27, 2019 @ 23:56:51.374';
        const toTime = 'Aug 23, 2019 @ 16:18:51.821';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);

        await PageObjects.discover.loadSavedSearch('Ecommerce Data');
        expect(await PageObjects.discover.getHitCount()).to.equal('4,675');

        const { text: csvFile } = await getReport();
        expectSnapshot(csvFile.length).toMatchInline(`760798`);

        const lines = csvFile.trim().split('\n');
        expectSnapshot(lines.length).toMatchInline(`4551`);

        // match the beginning and the end of the csv file contents
        expectSnapshot(lines.slice(0, 10)).toMatchInline(`
          Array [
            "\\"order_date\\",category,currency,\\"customer_id\\",\\"order_id\\",\\"day_of_week_i\\",\\"products.created_on\\",sku",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes, Men's Clothing, Women's Accessories, Men's Accessories\\",EUR,19,716724,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0687606876, ZO0290502905, ZO0126701267, ZO0308503085\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Women's Shoes, Women's Clothing\\",EUR,45,591503,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0006400064, ZO0150601506\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Women's Clothing\\",EUR,12,591709,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0638206382, ZO0038800388\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Men's Clothing\\",EUR,52,590937,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0297602976, ZO0565605656\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Men's Clothing\\",EUR,29,590976,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0561405614, ZO0281602816\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes, Men's Clothing\\",EUR,41,591636,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0385003850, ZO0408604086\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes\\",EUR,30,591539,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0505605056, ZO0513605136\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Men's Clothing\\",EUR,41,591598,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0276702767, ZO0291702917\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Women's Clothing\\",EUR,44,590927,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0046600466, ZO0050800508\\"",
          ]
        `);
        expectSnapshot(lines.slice(-10)).toMatchInline(`
          Array [
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Women's Shoes, Women's Clothing\\",EUR,24,550580,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0144801448, ZO0219602196\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Men's Accessories, Men's Clothing\\",EUR,33,551324,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0316803168, ZO0566905669\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Men's Accessories, Men's Clothing\\",EUR,51,551355,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0313403134, ZO0561205612\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Women's Shoes, Women's Accessories\\",EUR,28,550957,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0133101331, ZO0189401894\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Men's Accessories, Men's Clothing\\",EUR,39,551154,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0466704667, ZO0617306173\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Women's Clothing, Women's Accessories\\",EUR,27,551204,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0212602126, ZO0200702007\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Women's Clothing, Women's Shoes\\",EUR,45,550466,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0260702607, ZO0363203632\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Men's Clothing\\",EUR,15,550503,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0587505875, ZO0566405664\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Women's Accessories, Women's Shoes\\",EUR,27,550538,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0699406994, ZO0246202462\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes, Men's Clothing\\",EUR,13,550568,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0388403884, ZO0447604476\\"",
          ]
        `);
      });
    });
  });
}
