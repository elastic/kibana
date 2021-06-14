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
  const filterBar = getService('filterBar');
  const find = getService('find');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['reporting', 'common', 'dashboard', 'timePicker']);

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
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce_kibana');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce_kibana');
      });

      it('Download CSV export of a saved search panel', async function () {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
        await clickActionsMenu('EcommerceData');
        await clickDownloadCsv();

        const csvFile = await getDownload(getCsvPath('Ecommerce Data'));
        expectSnapshot(csvFile).toMatch();
      });

      it('Downloads a filtered CSV export of a saved search panel', async function () {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');

        // add a filter
        await filterBar.addFilter('currency', 'is', 'EUR');

        await clickActionsMenu('EcommerceData');
        await clickDownloadCsv();

        const csvFile = await getDownload(getCsvPath('Ecommerce Data'));
        expectSnapshot(csvFile).toMatch();
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
          'Jan 01, 1980 @ 00:00:00.000',
          'Dec 31, 1984 @ 23:59:59.000'
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
