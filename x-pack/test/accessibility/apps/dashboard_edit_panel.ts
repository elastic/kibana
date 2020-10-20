/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard } = getPageObjects(['dashboard']);
  const a11y = getService('a11y');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const drilldowns = getService('dashboardDrilldownsManage');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['security', 'common']);
  const toasts = getService('toasts');

  describe('Dashboard Edit Panel', () => {
    before(async () => {
      await esArchiver.load('dashboard/drilldowns');
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await PageObjects.common.navigateToApp('dashboard');
      await dashboard.loadSavedDashboard(drilldowns.DASHBOARD_WITH_PIE_CHART_NAME);
      await testSubjects.click('dashboardEditMode');
    });

    after(async () => {
      await esArchiver.unload('dashboard/drilldowns');
    });

    // embeddable edit panel
    it(' A11y test on dashboard edit panel menu options', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await a11y.testAppSnapshot();
    });

    // https://github.com/elastic/kibana/issues/77931
    it.skip('A11y test for edit visualization and save', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelAction-editPanel');
      await testSubjects.click('visualizesaveAndReturnButton');
      await a11y.testAppSnapshot();
    });

    // clone panel
    it(' A11y test on dashboard embeddable clone panel', async () => {
      await testSubjects.click('embeddablePanelAction-clonePanel');
      await a11y.testAppSnapshot();
      await toasts.dismissAllToasts();
      await dashboardPanelActions.removePanelByTitle('Visualization PieChart (copy)');
    });

    // edit panel title
    it(' A11y test on dashboard embeddable edit dashboard title', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelAction-ACTION_CUSTOMIZE_PANEL');
      await a11y.testAppSnapshot();
      await testSubjects.click('customizePanelHideTitle');
      await a11y.testAppSnapshot();
      await testSubjects.click('saveNewTitleButton');
    });

    // create drilldown
    it('A11y test on dashboard embeddable open flyout and drilldown', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelAction-OPEN_FLYOUT_ADD_DRILLDOWN');
      await a11y.testAppSnapshot();
      await testSubjects.click('flyoutCloseButton');
    });

    // clicking on more button
    it('A11y test on dashboard embeddable more button', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelMore-mainMenu');
      await a11y.testAppSnapshot();
    });

    // https://github.com/elastic/kibana/issues/77422
    it.skip('A11y test on dashboard embeddable custom time range', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelAction-CUSTOM_TIME_RANGE');
      await a11y.testAppSnapshot();
    });

    // flow will change whenever the custom time range a11y issue gets fixed.
    // Will need to click on gear icon and then click on more.

    // inspector panel
    it('A11y test on dashboard embeddable open inspector', async () => {
      await testSubjects.click('embeddablePanelAction-openInspector');
      await a11y.testAppSnapshot();
      await testSubjects.click('euiFlyoutCloseButton');
    });

    // fullscreen
    it('A11y test on dashboard embeddable fullscreen', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelMore-mainMenu');
      await testSubjects.click('embeddablePanelAction-togglePanel');
      await a11y.testAppSnapshot();
    });

    // minimize fullscreen panel
    it('A11y test on dashboard embeddable fullscreen minimize ', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelMore-mainMenu');
      await testSubjects.click('embeddablePanelAction-togglePanel');
      await a11y.testAppSnapshot();
    });

    // replace panel
    it('A11y test on dashboard embeddable replace panel', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelMore-mainMenu');
      await testSubjects.click('embeddablePanelAction-replacePanel');
      await a11y.testAppSnapshot();
      await testSubjects.click('euiFlyoutCloseButton');
    });

    // delete from dashboard
    it('A11y test on dashboard embeddable delete panel', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelMore-mainMenu');
      await testSubjects.click('embeddablePanelAction-deletePanel');
      await a11y.testAppSnapshot();
    });
  });
}
