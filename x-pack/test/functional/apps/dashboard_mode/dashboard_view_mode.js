/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const log = getService('log');
  const pieChart = getService('pieChart');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
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
  const savedSearchName = 'Saved search for dashboard';

  describe('Dashboard View Mode', function () {
    this.tags(['skipFirefox']);

    before('initialize tests', async () => {
      log.debug('Dashboard View Mode:initTests');
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('dashboard_view_mode');
      await kibanaServer.uiSettings.replace({
        'defaultIndex': 'logstash-*'
      });
      browser.setWindowSize(1600, 1000);

      await PageObjects.common.navigateToApp('discover');
      await PageObjects.dashboard.setTimepickerInHistoricalDataRange();
      await PageObjects.discover.saveSearch(savedSearchName);

      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(PageObjects.dashboard.getTestVisualizationNames());
      await dashboardAddPanel.addSavedSearch(savedSearchName);
      await PageObjects.dashboard.saveDashboard(dashboardName);
    });

    describe('Dashboard viewer', () => {
      before('Create logstash data role', async () => {
        await PageObjects.settings.navigateTo();
        await testSubjects.click('roles');
        await PageObjects.security.clickCreateNewRole();

        await testSubjects.setValue('roleFormNameInput', 'logstash-data');
        await PageObjects.security.addIndexToRole('logstash-*');
        await PageObjects.security.addPrivilegeToRole('read');
        await PageObjects.security.clickSaveEditRole();
      });

      before('Create dashboard only mode user', async () => {
        await PageObjects.settings.navigateTo();
        await PageObjects.security.clickUsersSection();
        await PageObjects.security.clickCreateNewUser();
        await testSubjects.setValue('userFormUserNameInput', 'dashuser');
        await testSubjects.setValue('passwordInput', '123456');
        await testSubjects.setValue('passwordConfirmationInput', '123456');
        await testSubjects.setValue('userFormFullNameInput', 'dashuser');
        await testSubjects.setValue('userFormEmailInput', 'example@example.com');
        await PageObjects.security.assignRoleToUser('kibana_dashboard_only_user');
        await PageObjects.security.assignRoleToUser('logstash-data');

        await PageObjects.security.clickSaveEditUser();
      });

      before('Create user with mixes roles', async () => {
        await PageObjects.security.clickCreateNewUser();

        await testSubjects.setValue('userFormUserNameInput', 'mixeduser');
        await testSubjects.setValue('passwordInput', '123456');
        await testSubjects.setValue('passwordConfirmationInput', '123456');
        await testSubjects.setValue('userFormFullNameInput', 'mixeduser');
        await testSubjects.setValue('userFormEmailInput', 'example@example.com');
        await PageObjects.security.assignRoleToUser('kibana_dashboard_only_user');
        await PageObjects.security.assignRoleToUser('kibana_user');
        await PageObjects.security.assignRoleToUser('logstash-data');

        await PageObjects.security.clickSaveEditUser();
      });

      before('Create user with dashboard and superuser role', async () => {
        await PageObjects.security.clickCreateNewUser();

        await testSubjects.setValue('userFormUserNameInput', 'mysuperuser');
        await testSubjects.setValue('passwordInput', '123456');
        await testSubjects.setValue('passwordConfirmationInput', '123456');
        await testSubjects.setValue('userFormFullNameInput', 'mixeduser');
        await testSubjects.setValue('userFormEmailInput', 'example@example.com');
        await PageObjects.security.assignRoleToUser('kibana_dashboard_only_user');
        await PageObjects.security.assignRoleToUser('superuser');

        await PageObjects.security.clickSaveEditUser();
      });

      after('logout', async () => {
        await PageObjects.security.logout();
      });

      it('shows only the dashboard app link', async () => {
        await PageObjects.security.logout();
        await PageObjects.security.login('dashuser', '123456');

        const appLinks = await appsMenu.readLinks();
        expect(appLinks).to.have.length(1);
        expect(appLinks[0]).to.have.property('text', 'Dashboard');
      });

      it('shows the dashboard landing page by default', async () => {
        const currentUrl = await browser.getCurrentUrl();
        console.log('url: ', currentUrl);
        expect(currentUrl).to.contain('dashboards');
      });

      it('does not show the create dashboard button', async () => {
        const createNewButtonExists = await testSubjects.exists('newItemButton');
        expect(createNewButtonExists).to.be(false);
      });

      it('opens a dashboard up', async () => {
        await PageObjects.dashboard.loadSavedDashboard(dashboardName);
        const onDashboardLandingPage = await PageObjects.dashboard.onDashboardLandingPage();
        expect(onDashboardLandingPage).to.be(false);
      });

      it('can filter on a visualization', async () => {
        await PageObjects.dashboard.setTimepickerInHistoricalDataRange();
        await pieChart.filterOnPieSlice();
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(1);
      });

      it('shows the full screen menu item', async () => {
        const fullScreenMenuItemExists = await testSubjects.exists('dashboardFullScreenMode');
        expect(fullScreenMenuItemExists).to.be(true);
      });

      it('does not show the edit menu item', async () => {
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

      it(`Permalinks doesn't show create short-url button`, async () => {
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
        await PageObjects.security.logout();
        await PageObjects.security.login('mixeduser', '123456');

        if (await appsMenu.linkExists('Management')) {
          throw new Error('Expected management nav link to not be shown');
        }
      });

      it('is not loaded for a user who is assigned a superuser role', async () => {
        await PageObjects.security.logout();
        await PageObjects.security.login('mysuperuser', '123456');

        if (!await appsMenu.linkExists('Management')) {
          throw new Error('Expected management nav link to be shown');
        }
      });

    });
  });
}
