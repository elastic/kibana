/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const ACTION_ID = 'ACTION_EXPLORE_DATA';
const ACTION_TEST_SUBJ = `embeddablePanelAction-${ACTION_ID}`;

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const drilldowns = getService('dashboardDrilldownsManage');
  const { dashboard, discover, common, timePicker } = getPageObjects([
    'dashboard',
    'discover',
    'common',
    'timePicker',
  ]);
  const panelActions = getService('dashboardPanelActions');
  const panelActionsTimeRange = getService('dashboardPanelTimeRange');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');

  describe('Explore underlying data - panel action', function () {
    before(
      'change default index pattern to verify action navigates to correct index pattern',
      async () => {
        await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash*' });
      }
    );

    before('start on Dashboard landing page', async () => {
      await common.navigateToApp('dashboard');
      await dashboard.preserveCrossAppState();
    });

    after('set back default index pattern', async () => {
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
    });

    after('clean-up custom time range on panel', async () => {
      await common.navigateToApp('dashboard');
      await dashboard.gotoDashboardEditMode(drilldowns.DASHBOARD_WITH_PIE_CHART_NAME);
      await panelActions.openContextMenuMorePanel();
      await panelActionsTimeRange.clickTimeRangeActionInContextMenu();
      await panelActionsTimeRange.clickRemovePerPanelTimeRangeButton();
      await dashboard.saveDashboard('Dashboard with Pie Chart');
    });

    it('action exists in panel context menu', async () => {
      await dashboard.loadSavedDashboard(drilldowns.DASHBOARD_WITH_PIE_CHART_NAME);
      await panelActions.openContextMenu();
      await testSubjects.existOrFail(ACTION_TEST_SUBJ);
    });

    it('is a link <a> element', async () => {
      const actionElement = await testSubjects.find(ACTION_TEST_SUBJ);
      const tag = await actionElement.getTagName();

      expect(tag.toLowerCase()).to.be('a');
    });

    it('navigates to Discover app to index pattern of the panel on action click', async () => {
      await testSubjects.clickWhenNotDisabled(ACTION_TEST_SUBJ);
      await discover.waitForDiscoverAppOnScreen();

      const el = await testSubjects.find('discover-dataView-switch-link');
      const text = await el.getVisibleText();

      expect(text).to.be('logstash-*');
    });

    it('carries over panel time range', async () => {
      await common.navigateToApp('dashboard');

      await dashboard.gotoDashboardEditMode(drilldowns.DASHBOARD_WITH_PIE_CHART_NAME);

      await panelActions.openContextMenuMorePanel();
      await panelActionsTimeRange.clickTimeRangeActionInContextMenu();
      await panelActionsTimeRange.clickToggleQuickMenuButton();
      await panelActionsTimeRange.clickCommonlyUsedTimeRange('Last_90 days');
      await panelActionsTimeRange.clickModalPrimaryButton();

      await dashboard.saveDashboard('Dashboard with Pie Chart');

      await panelActions.openContextMenu();
      await testSubjects.clickWhenNotDisabled(ACTION_TEST_SUBJ);
      await discover.waitForDiscoverAppOnScreen();

      const text = await timePicker.getShowDatesButtonText();
      const lowercaseText = text.toLowerCase();

      expect(lowercaseText.includes('last 90 days')).to.be(true);
    });
  });
}
