/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

  const PANEL_TITLE = 'Visualization PieChart';

  describe('Dashboard Edit Panel', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/dashboard/drilldowns');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await PageObjects.common.navigateToApp('dashboard');
      await dashboard.loadSavedDashboard(drilldowns.DASHBOARD_WITH_PIE_CHART_NAME);
      await testSubjects.click('dashboardEditMode');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/dashboard/drilldowns');
    });

    it('can open menu', async () => {
      await dashboardPanelActions.openContextMenu();
      await a11y.testAppSnapshot();
    });

    it('can clone panel', async () => {
      await dashboardPanelActions.clonePanelByTitle(PANEL_TITLE);
      await a11y.testAppSnapshot();
      await toasts.dismissAllToasts();
      await dashboardPanelActions.removePanelByTitle(`${PANEL_TITLE} (copy)`);
    });

    it('can customize panel', async () => {
      await dashboardPanelActions.customizePanel();
      await a11y.testAppSnapshot();
    });

    it('can hide panel title', async () => {
      await dashboardPanelActions.clickHidePanelTitleToggle();
      await a11y.testAppSnapshot();
      await testSubjects.click('saveNewTitleButton');
    });

    it('can drilldown', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelAction-OPEN_FLYOUT_ADD_DRILLDOWN');
      await a11y.testAppSnapshot();
      await testSubjects.click('flyoutCloseButton');
    });

    it('can view more actions', async () => {
      await dashboardPanelActions.openContextMenuMorePanel();
      await a11y.testAppSnapshot();
    });

    it('can create a custom time range', async () => {
      await dashboardPanelActions.openContextMenuMorePanel();
      await testSubjects.click('embeddablePanelAction-CUSTOM_TIME_RANGE');
      await a11y.testAppSnapshot();
      await testSubjects.click('addPerPanelTimeRangeButton');
    });

    it('can open inspector', async () => {
      await dashboardPanelActions.openInspector();
      await a11y.testAppSnapshot();
      await testSubjects.click('euiFlyoutCloseButton');
    });

    it('can go fullscreen', async () => {
      await dashboardPanelActions.clickExpandPanelToggle();
      await a11y.testAppSnapshot();
      await dashboardPanelActions.clickExpandPanelToggle();
    });

    it('can replace panel', async () => {
      await dashboardPanelActions.replacePanelByTitle();
      await a11y.testAppSnapshot();
      await testSubjects.click('euiFlyoutCloseButton');
    });

    it('can delete panel', async () => {
      await dashboardPanelActions.removePanel();
      await a11y.testAppSnapshot();
    });
  });
}
