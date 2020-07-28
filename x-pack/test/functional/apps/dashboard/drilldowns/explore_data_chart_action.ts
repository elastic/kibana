/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const ACTION_ID = 'ACTION_EXPLORE_DATA_CHART';
const ACTION_TEST_SUBJ = `embeddablePanelAction-${ACTION_ID}`;

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const drilldowns = getService('dashboardDrilldownsManage');
  const { dashboard, discover, common, timePicker } = getPageObjects([
    'dashboard',
    'discover',
    'common',
    'timePicker',
  ]);
  const testSubjects = getService('testSubjects');
  const pieChart = getService('pieChart');
  const dashboardDrilldownPanelActions = getService('dashboardDrilldownPanelActions');
  const filterBar = getService('filterBar');
  const browser = getService('browser');

  describe('Explore underlying data - chart action', () => {
    describe('value click action', () => {
      it('action exists in chart click popup menu', async () => {
        await common.navigateToApp('dashboard');
        await dashboard.preserveCrossAppState();
        await dashboard.loadSavedDashboard(drilldowns.DASHBOARD_WITH_PIE_CHART_NAME);
        await pieChart.clickOnPieSlice('160,000');
        await dashboardDrilldownPanelActions.expectMultipleActionsMenuOpened();
        await testSubjects.existOrFail(ACTION_TEST_SUBJ);
      });

      it('action is a link <a> element', async () => {
        const actionElement = await testSubjects.find(ACTION_TEST_SUBJ);
        const tag = await actionElement.getTagName();
        const href = await actionElement.getAttribute('href');

        expect(tag.toLowerCase()).to.be('a');
        expect(typeof href).to.be('string');
        expect(href.length > 5).to.be(true);
      });

      it('navigates to Discover app on action click carrying over pie slice filter', async () => {
        await testSubjects.clickWhenNotDisabled(ACTION_TEST_SUBJ);
        await discover.waitForDiscoverAppOnScreen();
        await filterBar.hasFilter('memory', '160,000 to 200,000');
        const filterCount = await filterBar.getFilterCount();

        expect(filterCount).to.be(1);
      });
    });

    describe('brush action', () => {
      let originalTimeRangeDurationHours: number | undefined;

      it('action exists in chart brush popup menu', async () => {
        await common.navigateToApp('dashboard');
        await dashboard.preserveCrossAppState();
        await dashboard.loadSavedDashboard(drilldowns.DASHBOARD_WITH_AREA_CHART_NAME);

        originalTimeRangeDurationHours = await timePicker.getTimeDurationInHours();
        const areaChart = await testSubjects.find('visualizationLoader');
        await browser.dragAndDrop(
          {
            location: areaChart,
            offset: {
              x: -100,
              y: 0,
            },
          },
          {
            location: areaChart,
            offset: {
              x: 100,
              y: 0,
            },
          }
        );

        await dashboardDrilldownPanelActions.expectMultipleActionsMenuOpened();
        await testSubjects.existOrFail(ACTION_TEST_SUBJ);
      });

      it('navigates to Discover on click carrying over brushed time range', async () => {
        await testSubjects.clickWhenNotDisabled(ACTION_TEST_SUBJ);
        await discover.waitForDiscoverAppOnScreen();
        const newTimeRangeDurationHours = await timePicker.getTimeDurationInHours();

        expect(newTimeRangeDurationHours).to.be.lessThan(originalTimeRangeDurationHours as number);
      });
    });
  });
}
