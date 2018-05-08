/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const remote = getService('remote');
  const log = getService('log');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects([
    'security',
    'common',
    'dashboard',
    'header',
    'settings']);
  const dashboardName = 'Dashboard View Mode Test Dashboard';

  describe('Dashboard View Mode', () => {

    before('initialize tests', async () => {
      log.debug('Dashboard View Mode:initTests');
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('dashboard_view_mode');
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'UTC',
        'defaultIndex': 'logstash-*'
      });
      await kibanaServer.uiSettings.disableToastAutohide();
      remote.setWindowSize(1600, 1000);

      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(PageObjects.dashboard.getTestVisualizationNames());
      await PageObjects.dashboard.saveDashboard(dashboardName);
    });

    describe('Dashboard viewer', () => {
      before('Create logstash data role', async () => {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickLinkText('Roles');
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
        await testSubjects.setValue('userFormEmailInput', 'my@email.com');
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
        await testSubjects.setValue('userFormEmailInput', 'my@email.com');
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
        await testSubjects.setValue('userFormEmailInput', 'my@email.com');
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

        const dashboardAppExists = await find.existsByLinkText('Dashboard');
        expect(dashboardAppExists).to.be(true);
        const accountSettingsLinkExists = await find.existsByLinkText('dashuser');
        expect(accountSettingsLinkExists).to.be(true);
        const logoutLinkExists = await find.existsByLinkText('Logout');
        expect(logoutLinkExists).to.be(true);
        const collapseLinkExists = await find.existsByLinkText('Collapse');
        expect(collapseLinkExists).to.be(true);

        const navLinks = await find.allByCssSelector('.global-nav-link');
        expect(navLinks.length).to.equal(4);
      });

      it('shows the dashboard landing page by default', async () => {
        const currentUrl = await remote.getCurrentUrl();
        console.log('url: ', currentUrl);
        expect(currentUrl).to.contain('dashboards');
      });

      it('does not show the create dashboard button', async () => {
        const createNewButtonExists = await testSubjects.exists('newDashboardLink');
        expect(createNewButtonExists).to.be(false);
      });

      it('opens a dashboard up', async () => {
        await PageObjects.dashboard.loadSavedDashboard(dashboardName);
        const onDashboardLandingPage = await PageObjects.dashboard.onDashboardLandingPage();
        expect(onDashboardLandingPage).to.be(false);
      });

      it('can filter on a visualization', async () => {
        await PageObjects.dashboard.setTimepickerInDataRange();
        await PageObjects.dashboard.filterOnPieSlice();
        const filters = await PageObjects.dashboard.getFilters();
        expect(filters.length).to.equal(1);
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

      it('does not show the sharing menu item', async () => {
        const shareMenuItemExists = await testSubjects.exists('dashboardShareButton');
        expect(shareMenuItemExists).to.be(false);
      });

      it('does not show the visualization edit icon', async () => {
        const editIconExists = await testSubjects.exists('dashboardPanelEditLink');
        expect(editIconExists).to.be(false);
      });

      it('does not show the visualization move icon', async () => {
        const moveIconExists = await testSubjects.exists('dashboardPanelMoveIcon');
        expect(moveIconExists).to.be(false);
      });

      it('does not show the visualization delete icon', async () => {
        const deleteIconExists = await testSubjects.exists('dashboardPanelRemoveIcon');
        expect(deleteIconExists).to.be(false);
      });

      it('shows the timepicker', async () => {
        const timePickerExists = await testSubjects.exists('globalTimepickerButton');
        expect(timePickerExists).to.be(true);
      });

      it('is loaded for a user who is assigned a non-dashboard mode role', async () => {
        await PageObjects.security.logout();
        await PageObjects.security.login('mixeduser', '123456');

        const managementAppExists = await find.existsByLinkText('Management');
        expect(managementAppExists).to.be(false);
      });

      it('is not loaded for a user who is assigned a superuser role', async () => {
        await PageObjects.security.logout();
        await PageObjects.security.login('mysuperuser', '123456');

        const managementAppExists = await find.existsByLinkText('Management');
        expect(managementAppExists).to.be(true);
      });
    });
  });
}
