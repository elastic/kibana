/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const reportingService = getService('reporting');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const filterBar = getService('filterBar');
  const find = getService('find');
  const retry = getService('retry');
  const toasts = getService('toasts');
  const { reporting, common, dashboard, timePicker } = getPageObjects([
    'reporting',
    'common',
    'dashboard',
    'timePicker',
  ]);

  const navigateToDashboardApp = async () => {
    log.debug('in navigateToDashboardApp');
    await dashboard.navigateToApp();
    await retry.tryForTime(10000, async () => {
      expect(await dashboard.onDashboardLandingPage()).to.be(true);
    });
  };

  const getCsvReportData = async () => {
    await toasts.dismissAll();
    const url = await reporting.getReportURL(60000);
    const res = await reporting.getResponse(url ?? '');

    expect(res.status).to.equal(200);
    expect(res.get('content-type')).to.equal('text/csv; charset=utf-8');
    return res.text;
  };

  const clickDownloadCsv = async (wrapper?: WebElementWrapper) => {
    log.debug('click "Generate CSV"');
    await dashboardPanelActions.clickPanelAction(
      'embeddablePanelAction-generateCsvReport',
      wrapper
    );
    await testSubjects.existOrFail('csvReportStarted'); // validate toast panel
  };

  const clickDownloadCsvByTitle = async (title?: string) => {
    log.debug(`click "Generate CSV" on "${title}"`);
    await dashboardPanelActions.clickPanelActionByTitle(
      'embeddablePanelAction-generateCsvReport',
      title
    );
    await testSubjects.existOrFail('csvReportStarted'); // validate toast panel
  };

  const createPartialCsv = (csvFile: unknown) => {
    const partialCsvFile = (csvFile as string).split('\n').slice(0, 4);
    return partialCsvFile.join('\n');
  };

  /*
   * Tests
   */
  describe('Dashboard Generate CSV', () => {
    describe('Default Saved Search Data', () => {
      before(async () => {
        await esArchiver.emptyKibanaIndex();
        await reportingService.initEcommerce();
        await kibanaServer.uiSettings.update({ 'dateFormat:tz': 'UTC' });
      });

      beforeEach(async () => {
        await navigateToDashboardApp();
      });

      after(async () => {
        await reportingService.teardownEcommerce();
      });

      it('Generate CSV export of a saved search panel', async function () {
        await dashboard.loadSavedDashboard('Ecom Dashboard - 3 Day Period');
        await clickDownloadCsvByTitle('EcommerceData');

        const csvFile = await getCsvReportData();
        expect(csvFile.length).to.be(76137);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });

      it.skip('Downloads a filtered CSV export of a saved search panel', async function () {
        await dashboard.loadSavedDashboard('Ecom Dashboard - 3 Day Period');

        // add a filter
        await filterBar.addFilter({ field: 'category', operation: 'is', value: `Men's Shoes` });
        await clickDownloadCsvByTitle('EcommerceData');

        const csvFile = await getCsvReportData();
        expect(csvFile.length).to.be(17106);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });

      it('Downloads a saved search panel with a custom time range that does not intersect with dashboard time range', async function () {
        await dashboard.loadSavedDashboard('Ecom Dashboard - 3 Day Period - custom time range');
        await clickDownloadCsvByTitle('EcommerceData');

        const csvFile = await getCsvReportData();
        expect(csvFile.length).to.be(23277);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });

      it('Gets the correct filename if panel titles are hidden', async () => {
        await dashboard.loadSavedDashboard('Ecom Dashboard Hidden Panel Titles');
        const savedSearchPanel = await dashboardPanelActions.getPanelWrapperById(
          '94eab06f-60ac-4a85-b771-3a8ed475c9bb'
        ); // panel title is hidden

        await clickDownloadCsv(savedSearchPanel);
        await testSubjects.existOrFail('csvReportStarted');

        const csvFile = await getCsvReportData();
        expect(csvFile).to.not.be(null);
      });
    });

    describe('Filtered Saved Search', () => {
      const TEST_SEARCH_TITLE = 'Customer Betty';
      const TEST_DASHBOARD_TITLE = 'Filtered Search Data';
      const from = 'Jun 20, 2019 @ 23:56:51.374';
      const to = 'Jun 25, 2019 @ 16:18:51.821';

      before(async () => {
        await esArchiver.emptyKibanaIndex();
        await reportingService.initEcommerce();
        await kibanaServer.uiSettings.update({ 'dateFormat:tz': 'UTC' });
      });

      beforeEach(async () => {
        await navigateToDashboardApp();
        log.info(`Creating empty dashboard`);
        await dashboard.clickNewDashboard();
        await timePicker.setAbsoluteRange(from, to);
        log.info(`Adding "${TEST_SEARCH_TITLE}" to dashboard`);
        await dashboardAddPanel.addSavedSearch(TEST_SEARCH_TITLE);
        await dashboard.saveDashboard(TEST_DASHBOARD_TITLE);
      });

      after(async () => {
        await reportingService.teardownEcommerce();
        await common.unsetTime();
      });

      it('Downloads filtered Discover saved search report', async () => {
        await clickDownloadCsvByTitle(TEST_SEARCH_TITLE);

        const csvFile = await getCsvReportData();
        expect(csvFile.length).to.be(2446);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });

    describe('Field Formatters and Scripted Fields', () => {
      const dashboardWithScriptedFieldsSearch = 'names dashboard';

      before(async () => {
        await esArchiver.emptyKibanaIndex();
        await reportingService.initLogs();
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/hugedata');
        await kibanaServer.uiSettings.update({ 'dateFormat:tz': 'UTC' });
      });

      beforeEach(async () => {
        await navigateToDashboardApp();
        await dashboard.loadSavedDashboard(dashboardWithScriptedFieldsSearch);
        await timePicker.setAbsoluteRange(
          'Nov 26, 1981 @ 21:54:15.526',
          'Mar 5, 1982 @ 18:17:44.821'
        );

        await common.sleep(1000);
        await filterBar.addFilter({ field: 'name.keyword', operation: 'is', value: 'Fethany' });
        await common.sleep(1000);
      });

      after(async () => {
        await reportingService.teardownLogs();
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/hugedata');
      });

      it('Generate CSV export of a saved search panel', async () => {
        await clickDownloadCsvByTitle('namessearch');

        const csvFile = await getCsvReportData();
        expect(csvFile.length).to.be(166);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });
  });
}
