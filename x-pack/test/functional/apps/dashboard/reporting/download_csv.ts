/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPO_ROOT } from '@kbn/utils';
import expect from '@kbn/expect';
import fs from 'fs';
import path from 'path';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const find = getService('find');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['reporting', 'common', 'dashboard', 'timePicker']);
  const ecommerceSOPath = 'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce.json';

  const getCsvPath = (name: string) =>
    path.resolve(REPO_ROOT, `target/functional-tests/downloads/${name}.csv`);

  // checks every 100ms for the file to exist in the download dir
  // just wait up to 5 seconds
  const getDownload = (filePath: string) => {
    return retry.tryForTime(5000, async () => {
      expect(fs.existsSync(filePath)).to.be(true);
      return fs.readFileSync(filePath).toString();
    });
  };

  const clickActionsMenu = async (headingTestSubj: string) => {
    const savedSearchPanel = await testSubjects.find('embeddablePanelHeading-' + headingTestSubj);
    await dashboardPanelActions.toggleContextMenu(savedSearchPanel);
  };

  const clickDownloadCsv = async () => {
    log.debug('click "More"');
    await dashboardPanelActions.clickContextMenuMoreItem();

    const actionItemTestSubj = 'embeddablePanelAction-downloadCsvReport';
    await testSubjects.existOrFail(actionItemTestSubj); // wait for the full panel to display or else the test runner could click the wrong option!
    log.debug('click "Download CSV"');
    await testSubjects.click(actionItemTestSubj);
    await testSubjects.existOrFail('csvDownloadStarted'); // validate toast panel
  };

  describe('Download CSV', () => {
    before('initialize tests', async () => {
      log.debug('ReportingPage:initTests');
      await browser.setWindowSize(1600, 850);
    });

    afterEach('remove download', () => {
      try {
        fs.unlinkSync(getCsvPath('Ecommerce Data'));
      } catch (e) {
        // it might not have been there to begin with
      }
    });

    describe('E-Commerce Data', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce');
        await kibanaServer.importExport.load(ecommerceSOPath);
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
        await kibanaServer.importExport.unload(ecommerceSOPath);
      });

      it('Download CSV export of a saved search panel', async function () {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
        await clickActionsMenu('EcommerceData');
        await clickDownloadCsv();

        const csvFile = await getDownload(getCsvPath('Ecommerce Data'));
        const lines = csvFile.trim().split('\n');
        expectSnapshot(csvFile.length).toMatchInline(`782100`);
        expectSnapshot(lines.length).toMatchInline(`4676`);

        // instead of matching all 4676 lines of CSV text, this verifies the first 10 and last 10 lines
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

      it('Downloads a filtered CSV export of a saved search panel', async function () {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');

        // add a filter
        await filterBar.addFilter('category', 'is', `Men's Shoes`);

        await clickActionsMenu('EcommerceData');
        await clickDownloadCsv();

        const csvFile = await getDownload(getCsvPath('Ecommerce Data'));
        const lines = csvFile.trim().split('\n');
        expectSnapshot(csvFile.length).toMatchInline(`165557`);
        expectSnapshot(lines.length).toMatchInline(`945`);

        // instead of matching all 4676 lines of CSV text, this verifies the first 10 and last 10 lines
        expectSnapshot(lines.slice(0, 10)).toMatchInline(`
          Array [
            "\\"order_date\\",category,currency,\\"customer_id\\",\\"order_id\\",\\"day_of_week_i\\",\\"products.created_on\\",sku",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes, Men's Clothing, Women's Accessories, Men's Accessories\\",EUR,19,716724,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0687606876, ZO0290502905, ZO0126701267, ZO0308503085\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes, Men's Clothing\\",EUR,41,591636,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0385003850, ZO0408604086\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes\\",EUR,30,591539,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0505605056, ZO0513605136\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Men's Clothing, Men's Shoes\\",EUR,48,590970,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0455604556, ZO0680806808\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes, Men's Clothing\\",EUR,21,591297,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0257502575, ZO0451704517\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Men's Clothing, Men's Shoes\\",EUR,4,591148,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0290302903, ZO0513705137\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Men's Clothing, Men's Shoes\\",EUR,14,591562,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0544305443, ZO0108001080\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes, Men's Clothing\\",EUR,30,591411,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0693506935, ZO0532405324\\"",
            "\\"Jul 12, 2019 @ 00:00:00.000\\",\\"Men's Clothing, Men's Shoes\\",EUR,38,722629,5,\\"Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000, Dec 31, 2016 @ 00:00:00.000\\",\\"ZO0424204242, ZO0403504035, ZO0506705067, ZO0395603956\\"",
          ]
        `);
        expectSnapshot(lines.slice(-10)).toMatchInline(`
          Array [
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes\\",EUR,37,550425,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0256602566, ZO0516305163\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Men's Clothing, Men's Shoes\\",EUR,52,719265,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0619506195, ZO0297802978, ZO0125001250, ZO0693306933\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes, Men's Clothing\\",EUR,34,550990,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0404404044, ZO0570605706\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes, Men's Clothing\\",EUR,7,550663,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0399703997, ZO0560905609\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes\\",EUR,34,551697,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0387903879, ZO0693206932\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes\\",EUR,9,550784,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0683206832, ZO0687706877\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes\\",EUR,15,550412,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0508905089, ZO0681206812\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes, Men's Clothing\\",EUR,23,551556,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0512405124, ZO0551405514\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes, Men's Clothing\\",EUR,21,550473,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0688006880, ZO0450504505\\"",
            "\\"Jun 12, 2019 @ 00:00:00.000\\",\\"Men's Shoes, Men's Clothing\\",EUR,13,550568,3,\\"Dec 1, 2016 @ 00:00:00.000, Dec 1, 2016 @ 00:00:00.000\\",\\"ZO0388403884, ZO0447604476\\"",
          ]
        `);
      });

      it('Gets the correct filename if panel titles are hidden', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard Hidden Panel Titles');
        const savedSearchPanel = await find.byCssSelector(
          '[data-test-embeddable-id="94eab06f-60ac-4a85-b771-3a8ed475c9bb"]'
        ); // panel title is hidden
        await dashboardPanelActions.toggleContextMenu(savedSearchPanel);

        await clickDownloadCsv();
        await testSubjects.existOrFail('csvDownloadStarted');

        const csvFile = await getDownload(getCsvPath('Ecommerce Data')); // file exists with proper name
        expect(csvFile).to.not.be(null);
      });
    });

    describe('Field Formatters and Scripted Fields', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/hugedata');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/hugedata');
      });

      it('Download CSV export of a saved search panel', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('names dashboard');
        await PageObjects.timePicker.setAbsoluteRange(
          'Nov 26, 1981 @ 21:54:15.526',
          'Mar 5, 1982 @ 18:17:44.821'
        );

        await PageObjects.common.sleep(1000);

        await filterBar.addFilter('name.keyword', 'is', 'Fethany');

        await PageObjects.common.sleep(1000);

        await clickActionsMenu('namessearch');
        await clickDownloadCsv();

        const csvFile = await getDownload(getCsvPath('namessearch'));
        expectSnapshot(csvFile).toMatch();
      });
    });
  });
}
