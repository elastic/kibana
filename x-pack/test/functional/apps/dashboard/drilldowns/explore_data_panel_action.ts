/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const ACTION_ID = 'ACTION_EXPLORE_DATA';
const EXPLORE_RAW_DATA_ACTION_TEST_SUBJ = `embeddablePanelAction-${ACTION_ID}`;

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const drilldowns = getService('dashboardDrilldownsManage');
  const { dashboard, common } = getPageObjects(['dashboard', 'common']);
  const panelActions = getService('dashboardPanelActions');
  const panelActionsTimeRange = getService('dashboardPanelTimeRange');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');

  describe('Explore underlying data - panel action', function () {
    before(async () => {
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash*' });
      await common.navigateToApp('dashboard');
      await dashboard.preserveCrossAppState();
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
    });

    it('action exists in panel context menu', async () => {
      await dashboard.loadSavedDashboard(drilldowns.DASHBOARD_WITH_PIE_CHART_NAME);
      await panelActions.openContextMenu();
      await testSubjects.existOrFail(EXPLORE_RAW_DATA_ACTION_TEST_SUBJ);
    });

    it('is a link <a> element', async () => {
      const dataAttributeSelector = `[data-test-subj=${EXPLORE_RAW_DATA_ACTION_TEST_SUBJ}]`;
      const aTag = 'a';
      const exists = await find.existsByCssSelector(`${aTag}${dataAttributeSelector}`);

      expect(aTag).to.be('a');
      expect(exists).to.be(true);
    });

    it('navigates to Discover app on click', async () => {
      await testSubjects.clickWhenNotDisabled(EXPLORE_RAW_DATA_ACTION_TEST_SUBJ);
      const el = await testSubjects.find('breadcrumbs');
      await el.findByCssSelector('[title=Discover]');
    });

    it('navigates to index pattern of the panel', async () => {
      const el = await testSubjects.find('indexPattern-switch-link');
      const text = await el.getVisibleText();

      expect(text).to.be('logstash-*');
      expect(text).not.to.be('logstash*');
    });

    it('carries over panel time range', async () => {
      await common.navigateToApp('dashboard');

      await dashboard.gotoDashboardEditMode(drilldowns.DASHBOARD_WITH_PIE_CHART_NAME);

      await panelActions.openContextMenu();
      await panelActionsTimeRange.clickTimeRangeActionInContextMenu();
      await panelActionsTimeRange.clickToggleQuickMenuButton();
      await panelActionsTimeRange.clickCommonlyUsedTimeRange('Last_90 days');
      await panelActionsTimeRange.clickModalPrimaryButton();

      await dashboard.saveDashboard('Dashboard with Pie Chart');

      await panelActions.openContextMenu();
      await testSubjects.clickWhenNotDisabled(EXPLORE_RAW_DATA_ACTION_TEST_SUBJ);

      const button = await testSubjects.find('superDatePickerShowDatesButton');
      const text = await button.getVisibleText();
      const lowercaseText = text.toLowerCase();

      expect(lowercaseText.includes('last 90 days')).to.be(true);
    });
  });
}
