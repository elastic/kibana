/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const a11y = getService('a11y');
  const deployment = getService('deployment');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const { common, dashboard, home, dashboardLinks } = getPageObjects([
    'common',
    'dashboard',
    'home',
    'dashboardLinks',
  ]);

  const DASHBOARD_NAME = 'Test Links Panel A11y';

  describe('Dashboard links a11y tests', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await home.addSampleDataSet('flights');
      await common.navigateToApp('dashboard');
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await dashboard.saveDashboard(DASHBOARD_NAME, {
        exitFromEditMode: false,
        saveAsNew: true,
      });
    });

    after(async () => {
      await dashboard.clickQuickSave();
      await common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await home.removeSampleDataSet('flights');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('Empty links editor flyout', async () => {
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAddNewPanelFromUIActionLink('Links');
      await a11y.testAppSnapshot();
    });

    it('Add dashboard link flyout', async () => {
      await testSubjects.click('links--panelEditor--addLinkBtn');
      await testSubjects.exists('links--linkEditor--flyout');
      await a11y.testAppSnapshot();
    });

    it('Add external link flyout', async () => {
      const radioOption = await testSubjects.find('links--linkEditor--externalLink--radioBtn');
      const label = await radioOption.findByCssSelector('label[for="externalLink"]');
      await label.click();
      await a11y.testAppSnapshot();
      await dashboardLinks.clickLinkEditorCloseButton();
    });

    it('Non-empty links editor flyout', async () => {
      await dashboardLinks.addDashboardLink('[Flights] Global Flight Dashboard');
      await dashboardLinks.addDashboardLink(DASHBOARD_NAME);
      await dashboardLinks.addExternalLink(`${deployment.getHostPort()}/app/bar`);
      await a11y.testAppSnapshot();
    });

    it('Links panel', async () => {
      await dashboardLinks.toggleSaveByReference(false);
      await dashboardLinks.clickPanelEditorSaveButton();
      await testSubjects.existOrFail('links--component');
      await a11y.testAppSnapshot();
    });
  });
}
