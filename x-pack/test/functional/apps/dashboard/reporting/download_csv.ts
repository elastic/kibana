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
  const reporting = getService('reporting');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const filterBar = getService('filterBar');
  const find = getService('find');
  const retry = getService('retry');
  const PageObjects = getPageObjects([
    'reporting',
    'common',
    'dashboard',
    'timePicker',
    'discover',
  ]);

  const navigateToDashboardApp = async () => {
    log.debug('in navigateToDashboardApp');
    await PageObjects.common.navigateToApp('dashboard');
    await retry.tryForTime(10000, async () => {
      expect(await PageObjects.dashboard.onDashboardLandingPage()).to.be(true);
    });
  };

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

    describe('Default Saved Search Data', () => {
      const dashboardAllDataHiddenTitles = 'Ecom Dashboard Hidden Panel Titles';
      const dashboardPeriodOf2DaysData = 'Ecom Dashboard - 3 Day Period';

      before(async () => {
        await reporting.initEcommerce();
        await navigateToDashboardApp();
      });

      after(async () => {
        await reporting.teardownEcommerce();
      });

      it('Download CSV export of a saved search panel', async function () {
        await PageObjects.dashboard.loadSavedDashboard(dashboardPeriodOf2DaysData);
        await clickActionsMenu('EcommerceData');
        await clickDownloadCsv();

        const csvFile = await getDownload(getCsvPath('Ecommerce Data'));
        expectSnapshot(csvFile).toMatch();
      });

      it('Downloads a filtered CSV export of a saved search panel', async function () {
        await PageObjects.dashboard.loadSavedDashboard(dashboardPeriodOf2DaysData);

        // add a filter
        await filterBar.addFilter('category', 'is', `Men's Shoes`);

        await clickActionsMenu('EcommerceData');
        await clickDownloadCsv();

        const csvFile = await getDownload(getCsvPath('Ecommerce Data'));
        expectSnapshot(csvFile).toMatch();
      });

      it('Gets the correct filename if panel titles are hidden', async () => {
        await PageObjects.dashboard.loadSavedDashboard(dashboardAllDataHiddenTitles);
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

    describe('Filtered Saved Search', () => {
      const TEST_SEARCH_TITLE = 'Customer Betty';
      const TEST_DASHBOARD_TITLE = 'Filtered Search Data';
      const setTimeRange = async () => {
        const fromTime = 'Jun 20, 2019 @ 23:56:51.374';
        const toTime = 'Jun 25, 2019 @ 16:18:51.821';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      };

      before(async () => {
        await reporting.initEcommerce();
        await navigateToDashboardApp();
        log.info(`Creating empty dashboard`);
        await PageObjects.dashboard.clickNewDashboard();
        await setTimeRange();
        log.info(`Adding "${TEST_SEARCH_TITLE}" to dashboard`);
        await dashboardAddPanel.addSavedSearch(TEST_SEARCH_TITLE);
        await PageObjects.dashboard.saveDashboard(TEST_DASHBOARD_TITLE);
      });

      after(async () => {
        await reporting.teardownEcommerce();
        await esArchiver.emptyKibanaIndex();
      });

      it('Downloads filtered Discover saved search report', async () => {
        await clickActionsMenu(TEST_SEARCH_TITLE.replace(/ /g, ''));
        await clickDownloadCsv();

        const csvFile = await getDownload(getCsvPath(TEST_SEARCH_TITLE));
        expectSnapshot(csvFile).toMatch();
      });
    });

    describe('Field Formatters and Scripted Fields', () => {
      const dashboardWithScriptedFieldsSearch = 'names dashboard';

      before(async () => {
        await reporting.initLogs();
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/hugedata');

        await navigateToDashboardApp();
        await PageObjects.dashboard.loadSavedDashboard(dashboardWithScriptedFieldsSearch);
        await PageObjects.timePicker.setAbsoluteRange(
          'Nov 26, 1981 @ 21:54:15.526',
          'Mar 5, 1982 @ 18:17:44.821'
        );

        await PageObjects.common.sleep(1000);
        await filterBar.addFilter('name.keyword', 'is', 'Fethany');
        await PageObjects.common.sleep(1000);
      });

      after(async () => {
        await reporting.teardownLogs();
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/hugedata');
      });

      it('Download CSV export of a saved search panel', async () => {
        await clickActionsMenu('namessearch');
        await clickDownloadCsv();

        const csvFile = await getDownload(getCsvPath('namessearch'));
        expectSnapshot(csvFile).toMatch();
      });
    });
  });
}
