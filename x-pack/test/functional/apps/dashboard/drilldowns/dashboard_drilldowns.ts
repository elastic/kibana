/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const DRILLDOWN_TO_PIE_CHART_NAME = 'Go to pie chart dashboard';
const DRILLDOWN_TO_AREA_CHART_NAME = 'Go to area chart dashboard';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardDrilldownPanelActions = getService('dashboardDrilldownPanelActions');
  const dashboardDrilldownsManage = getService('dashboardDrilldownsManage');
  const PageObjects = getPageObjects(['dashboard', 'common', 'header', 'timePicker']);
  const pieChart = getService('pieChart');
  const log = getService('log');
  const browser = getService('browser');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');

  describe('Dashboard Drilldowns', function () {
    before(async () => {
      log.debug('Dashboard Drilldowns:initTests');
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
    });

    it('should create dashboard to dashboard drilldown, use it, and then delete it', async () => {
      await PageObjects.dashboard.gotoDashboardEditMode(
        dashboardDrilldownsManage.DASHBOARD_WITH_PIE_CHART_NAME
      );

      // create drilldown
      await dashboardPanelActions.openContextMenu();
      await dashboardDrilldownPanelActions.expectExistsCreateDrilldownAction();
      await dashboardDrilldownPanelActions.clickCreateDrilldown();
      await dashboardDrilldownsManage.expectsCreateDrilldownFlyoutOpen();
      await dashboardDrilldownsManage.fillInDashboardToDashboardDrilldownWizard({
        drilldownName: DRILLDOWN_TO_AREA_CHART_NAME,
        destinationDashboardTitle: dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME,
      });
      await dashboardDrilldownsManage.saveChanges();
      await dashboardDrilldownsManage.expectsCreateDrilldownFlyoutClose();

      // check that drilldown notification badge is shown
      expect(await PageObjects.dashboard.getPanelDrilldownCount()).to.be(1);

      // save dashboard, navigate to view mode
      await PageObjects.dashboard.saveDashboard(
        dashboardDrilldownsManage.DASHBOARD_WITH_PIE_CHART_NAME,
        {
          saveAsNew: false,
          waitDialogIsClosed: true,
        }
      );

      // trigger drilldown action by clicking on a pie and picking drilldown action by it's name
      await pieChart.clickOnPieSlice('40,000');
      await dashboardDrilldownPanelActions.expectMultipleActionsMenuOpened();

      const href = await dashboardDrilldownPanelActions.getActionHrefByText(
        DRILLDOWN_TO_AREA_CHART_NAME
      );
      expect(typeof href).to.be('string'); // checking that action has a href
      const dashboardIdFromHref = PageObjects.dashboard.getDashboardIdFromUrl(href);

      await navigateWithinDashboard(async () => {
        await dashboardDrilldownPanelActions.clickActionByText(DRILLDOWN_TO_AREA_CHART_NAME);
      });
      // checking that href is at least pointing to the same dashboard that we are navigated to by regular click
      expect(dashboardIdFromHref).to.be(await PageObjects.dashboard.getDashboardIdFromCurrentUrl());

      // check that we drilled-down with filter from pie chart
      expect(await filterBar.getFilterCount()).to.be(1);

      const originalTimeRangeDurationHours = await PageObjects.timePicker.getTimeDurationInHours();

      // brush area chart and drilldown back to pie chat dashboard
      await brushAreaChart();
      await dashboardDrilldownPanelActions.expectMultipleActionsMenuOpened();

      await navigateWithinDashboard(async () => {
        await dashboardDrilldownPanelActions.clickActionByText(DRILLDOWN_TO_PIE_CHART_NAME);
      });

      // because filters are preserved during navigation, we expect that only one slice is displayed (filter is still applied)
      expect(await filterBar.getFilterCount()).to.be(1);
      await pieChart.expectPieSliceCount(1);

      // check that new time range duration was applied
      const newTimeRangeDurationHours = await PageObjects.timePicker.getTimeDurationInHours();
      expect(newTimeRangeDurationHours).to.be.lessThan(originalTimeRangeDurationHours);

      // delete drilldown
      await PageObjects.dashboard.switchToEditMode();
      await dashboardPanelActions.openContextMenu();
      await dashboardDrilldownPanelActions.expectExistsManageDrilldownsAction();
      await dashboardDrilldownPanelActions.clickManageDrilldowns();
      await dashboardDrilldownsManage.expectsManageDrilldownsFlyoutOpen();

      await dashboardDrilldownsManage.deleteDrilldownsByTitles([DRILLDOWN_TO_AREA_CHART_NAME]);
      await dashboardDrilldownsManage.closeFlyout();

      // check that drilldown notification badge is shown
      expect(await PageObjects.dashboard.getPanelDrilldownCount()).to.be(0);
    });

    it('browser back/forward navigation works after drilldown navigation', async () => {
      await PageObjects.dashboard.loadSavedDashboard(
        dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME
      );
      const originalTimeRangeDurationHours = await PageObjects.timePicker.getTimeDurationInHours();
      await brushAreaChart();
      await dashboardDrilldownPanelActions.expectMultipleActionsMenuOpened();
      await navigateWithinDashboard(async () => {
        await dashboardDrilldownPanelActions.clickActionByText(DRILLDOWN_TO_PIE_CHART_NAME);
      });
      // check that new time range duration was applied
      const newTimeRangeDurationHours = await PageObjects.timePicker.getTimeDurationInHours();
      expect(newTimeRangeDurationHours).to.be.lessThan(originalTimeRangeDurationHours);

      await navigateWithinDashboard(async () => {
        await browser.goBack();
      });

      expect(await PageObjects.timePicker.getTimeDurationInHours()).to.be(
        originalTimeRangeDurationHours
      );
    });
  });

  // utils which shouldn't be a part of test flow, but also too specific to be moved to pageobject or service
  async function brushAreaChart() {
    const areaChart = await testSubjects.find('visualizationLoader');
    expect(await areaChart.getAttribute('data-title')).to.be('Visualization漢字 AreaChart');
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
  }

  async function navigateWithinDashboard(navigationTrigger: () => Promise<void>) {
    // before executing action which would trigger navigation: remember current dashboard id in url
    const oldDashboardId = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();
    // execute navigation action
    await navigationTrigger();
    // wait until dashboard navigates to a new dashboard with area chart
    await retry.waitFor('navigate to different dashboard', async () => {
      const newDashboardId = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();
      return typeof newDashboardId === 'string' && oldDashboardId !== newDashboardId;
    });
    await PageObjects.header.waitUntilLoadingHasFinished();
    await PageObjects.dashboard.waitForRenderComplete();
  }
}
