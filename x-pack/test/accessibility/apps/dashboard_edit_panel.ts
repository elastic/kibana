/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard, discover, common, timePicker } = getPageObjects([
    'dashboard',
    'discover',
    'common',
    'timePicker',
  ]);
  const a11y = getService('a11y');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const inspector = getService('inspector');
  const esArchiver = getService('esArchiver');
  const drilldowns = getService('dashboardDrilldownsManage');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'security']);

  describe('Dashboard Panel', () => {
    before(async () => {
      await esArchiver.load('dashboard/drilldowns');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await PageObjects.common.navigateToApp('dashboard');
      await dashboard.loadSavedDashboard(drilldowns.DASHBOARD_WITH_PIE_CHART_NAME);
    });

    after(async () => {
      await esArchiver.unload('dashboard/drilldowns');
    });

    it('dashboard panel main edit ', async () => {
      await testSubjects.click('dashboardEditMode');
      await a11y.testAppSnapshot();
    });

    it('dashboard -visualization edit panel', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await a11y.testAppSnapshot();
    });

    // it('dashboard embeddable custom time range', async () => {
    //   await testSubjects.click('embeddablePanelAction-CUSTOM_TIME_RANGE');
    //   await a11y.testAppSnapshot();
    // });

    // it('dashboard embeddable open inspector', async () => {
    //   await testSubjects.click('embeddablePanelAction-openInspector');
    //   await a11y.testAppSnapshot();
    // });
    it('dashboard embeddable open flyout and drilldown', async () => {
      await testSubjects.click('embeddablePanelAction-OPEN_FLYOUT_ADD_DRILLDOWN');
      await a11y.testAppSnapshot();
    });

    it('dashboard embeddable open flyout and drilldown', async () => {
      await testSubjects.click('embeddablePanelAction-OPEN_FLYOUT_ADD_DRILLDOWN');
      await a11y.testAppSnapshot();
    });

    // it('dashboard panel inspect', async () => {
    //   await dashboardPanelActions.openInspectorByTitle('[Flights] Airline Carrier');
    //   await a11y.testAppSnapshot();
    // });
  });
}
