/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const log = getService('log');
  const pieChart = getService('pieChart');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const appsMenu = getService('appsMenu');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects([
    'security',
    'common',
    'discover',
    'dashboard',
    'header',
    'settings',
    'timePicker',
    'share',
  ]);
  const dashboardName = 'Dashboard View Mode Test Dashboard';

  describe('Dashboard View Mode', function () {
    this.tags(['skipFirefox']);

    before('initialize tests', async () => {
      log.debug('Dashboard View Mode:initTests');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/dashboard_view_mode'
      );
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await browser.setWindowSize(1600, 1000);

      await PageObjects.common.navigateToApp('dashboard');
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/dashboard_view_mode'
      );
      const types = [
        'search',
        'dashboard',
        'visualization',
        'search-session',
        'core-usage-stats',
        'event_loop_delays_daily',
        'search-telemetry',
        'core-usage-stats',
      ];
      await kibanaServer.savedObjects.clean({ types });
    });

    describe('Dashboard viewer', () => {
      after(async () => {
        await security.testUser.restoreDefaults();
      });

      it.skip('shows only the dashboard app link', async () => {
        await security.testUser.setRoles(['test_logstash_reader', 'kibana_dashboard_only_user']);
        await PageObjects.header.waitUntilLoadingHasFinished();
        const appLinks = await appsMenu.readLinks();
        expect(appLinks).to.have.length(1);
        expect(appLinks[0]).to.have.property('text', 'Dashboard');
      });

      it('shows the dashboard landing page by default', async () => {
        const currentUrl = await browser.getCurrentUrl();
        console.log('url: ', currentUrl);
        expect(currentUrl).to.contain('dashboards');
      });

      it.skip('does not show the create dashboard button', async () => {
        const createNewButtonExists = await testSubjects.exists('newItemButton');
        expect(createNewButtonExists).to.be(false);
      });

      it('opens a dashboard up', async () => {
        await PageObjects.dashboard.loadSavedDashboard(dashboardName);
        const onDashboardLandingPage = await PageObjects.dashboard.onDashboardLandingPage();
        expect(onDashboardLandingPage).to.be(false);
      });

      it('can filter on a visualization', async () => {
        await PageObjects.timePicker.setHistoricalDataRange();
        await pieChart.filterOnPieSlice();
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(1);
      });

      it('shows the full screen menu item', async () => {
        const fullScreenMenuItemExists = await testSubjects.exists('dashboardFullScreenMode');
        expect(fullScreenMenuItemExists).to.be(true);
      });

      it.skip('does not show the edit menu item', async () => {
        const editMenuItemExists = await testSubjects.exists('dashboardEditMode');
        expect(editMenuItemExists).to.be(false);
      });

      it('does not show the view menu item', async () => {
        const viewMenuItemExists = await testSubjects.exists('dashboardViewOnlyMode');
        expect(viewMenuItemExists).to.be(false);
      });

      it('does not show the reporting menu item', async () => {
        const reportingMenuItemExists = await testSubjects.exists('topNavReportingLink');
        expect(reportingMenuItemExists).to.be(false);
      });

      it('shows the sharing menu item', async () => {
        const shareMenuItemExists = await testSubjects.exists('shareTopNavButton');
        expect(shareMenuItemExists).to.be(true);
      });

      it.skip(`Permalinks doesn't show create short-url button`, async () => {
        await PageObjects.share.openShareMenuItem('Permalinks');
        await PageObjects.share.createShortUrlMissingOrFail();
      });

      it('does not show the visualization edit icon', async () => {
        await dashboardPanelActions.expectMissingEditPanelAction();
      });

      it('does not show the visualization delete icon', async () => {
        await dashboardPanelActions.expectMissingRemovePanelAction();
      });

      it('shows the timepicker', async () => {
        const timePickerExists = await PageObjects.timePicker.timePickerExists();
        expect(timePickerExists).to.be(true);
      });

      it('can paginate on a saved search', async () => {
        await PageObjects.dashboard.expectToolbarPaginationDisplayed({ displayed: true });
      });

      it('is loaded for a user who is assigned a non-dashboard mode role', async () => {
        await security.testUser.setRoles([
          'test_logstash_reader',
          'kibana_dashboard_only_user',
          'kibana_admin',
        ]);
        await PageObjects.header.waitUntilLoadingHasFinished();

        if (await appsMenu.linkExists('Stack Management')) {
          throw new Error('Expected management nav link to not be shown');
        }
      });

      it('is not loaded for a user who is assigned a superuser role', async () => {
        await security.testUser.setRoles(['kibana_dashboard_only_user', 'superuser']);
        await PageObjects.header.waitUntilLoadingHasFinished();

        if (!(await appsMenu.linkExists('Stack Management'))) {
          throw new Error('Expected management nav link to be shown');
        }
      });
    });
  });
}
