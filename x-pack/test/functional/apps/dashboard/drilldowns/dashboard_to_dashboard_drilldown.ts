/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const DRILLDOWN_TO_PIE_CHART_NAME = 'Go to pie chart dashboard';
const DRILLDOWN_TO_AREA_CHART_NAME = 'Go to area chart dashboard';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardDrilldownPanelActions = getService('dashboardDrilldownPanelActions');
  const dashboardDrilldownsManage = getService('dashboardDrilldownsManage');
  const PageObjects = getPageObjects([
    'dashboard',
    'common',
    'header',
    'timePicker',
    'settings',
    'copySavedObjectsToSpace',
  ]);
  const queryBar = getService('queryBar');
  const pieChart = getService('pieChart');
  const log = getService('log');
  const browser = getService('browser');
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const security = getService('security');
  const spaces = getService('spaces');
  const elasticChart = getService('elasticChart');

  describe('Dashboard to dashboard drilldown', function () {
    describe('Create & use drilldowns', () => {
      before(async () => {
        log.debug('Dashboard Drilldowns:initTests');
        await security.testUser.setRoles(['test_logstash_reader', 'global_dashboard_all']);
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.preserveCrossAppState();
      });

      after(async () => {
        await security.testUser.restoreDefaults();
        await clearFilters(dashboardDrilldownsManage.DASHBOARD_WITH_PIE_CHART_NAME);
        await clearFilters(dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME);
      });

      const clearFilters = async (dashboardName: string) => {
        await PageObjects.dashboard.gotoDashboardEditMode(dashboardName);
        await filterBar.removeAllFilters();
        await PageObjects.dashboard.clearUnsavedChanges();
      };

      it('create dashboard to dashboard drilldown', async () => {
        await PageObjects.dashboard.gotoDashboardEditMode(
          dashboardDrilldownsManage.DASHBOARD_WITH_PIE_CHART_NAME
        );
        // create drilldown
        await dashboardPanelActions.openContextMenu();
        await dashboardDrilldownPanelActions.expectExistsCreateDrilldownAction();
        await dashboardDrilldownPanelActions.clickCreateDrilldown();
        await dashboardDrilldownsManage.expectsCreateDrilldownFlyoutOpen();
        await testSubjects.click('actionFactoryItem-DASHBOARD_TO_DASHBOARD_DRILLDOWN');
        await dashboardDrilldownsManage.fillInDashboardToDashboardDrilldownWizard({
          drilldownName: DRILLDOWN_TO_AREA_CHART_NAME,
          destinationDashboardTitle: dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME,
        });
        await dashboardDrilldownsManage.saveChanges();
        await dashboardDrilldownsManage.closeFlyout();

        // check that drilldown notification badge is shown
        expect(await PageObjects.dashboard.getPanelDrilldownCount()).to.be(1);

        // save dashboard, navigate to view mode
        await testSubjects.existOrFail('dashboardUnsavedChangesBadge');
        await PageObjects.dashboard.saveDashboard(
          dashboardDrilldownsManage.DASHBOARD_WITH_PIE_CHART_NAME,
          {
            saveAsNew: false,
            waitDialogIsClosed: true,
            exitFromEditMode: true,
          }
        );
        await testSubjects.missingOrFail('dashboardUnsavedChangesBadge');
      });

      it('use dashboard to dashboard drilldown via onClick action', async () => {
        await testDashboardDrilldown(
          dashboardDrilldownPanelActions.clickActionByText.bind(dashboardDrilldownPanelActions) // preserve 'this'
        );
      });

      it('use dashboard to dashboard drilldown via getHref action', async () => {
        await testDashboardDrilldown(
          dashboardDrilldownPanelActions.openHrefByText.bind(dashboardDrilldownPanelActions) // preserve 'this'
        );
      });

      it('delete dashboard to dashboard drilldown', async () => {
        // delete drilldown
        await PageObjects.dashboard.switchToEditMode();
        await dashboardPanelActions.openContextMenu();
        await dashboardDrilldownPanelActions.expectExistsManageDrilldownsAction();
        await dashboardDrilldownPanelActions.clickManageDrilldowns();
        await dashboardDrilldownsManage.expectsManageDrilldownsFlyoutOpen();

        await dashboardDrilldownsManage.deleteDrilldownsByTitles([DRILLDOWN_TO_AREA_CHART_NAME]);
        await dashboardDrilldownsManage.closeFlyout();

        // check that drilldown notification badge is not shown
        expect(await PageObjects.dashboard.getPanelDrilldownCount()).to.be(0);
      });

      it('browser back/forward navigation works after drilldown navigation', async () => {
        await PageObjects.dashboard.loadSavedDashboard(
          dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME
        );
        const originalTimeRangeDurationHours =
          await PageObjects.timePicker.getTimeDurationInHours();
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

      const testDashboardDrilldown = async (drilldownAction: (text: string) => Promise<void>) => {
        // trigger drilldown action by clicking on a pie and picking drilldown action by it's name
        await pieChart.clickOnPieSlice('40,000');
        await dashboardDrilldownPanelActions.expectMultipleActionsMenuOpened();

        const href = await dashboardDrilldownPanelActions.getActionHrefByText(
          DRILLDOWN_TO_AREA_CHART_NAME
        );
        expect(typeof href).to.be('string'); // checking that action has a href
        const dashboardIdFromHref = PageObjects.dashboard.getDashboardIdFromUrl(href);

        await navigateWithinDashboard(async () => {
          await drilldownAction(DRILLDOWN_TO_AREA_CHART_NAME);
        });
        // checking that href is at least pointing to the same dashboard that we are navigated to by regular click
        expect(dashboardIdFromHref).to.be(
          await PageObjects.dashboard.getDashboardIdFromCurrentUrl()
        );

        // check that we drilled-down with filter from pie chart
        expect(await filterBar.getFilterCount()).to.be(1);
        const originalTimeRangeDurationHours =
          await PageObjects.timePicker.getTimeDurationInHours();
        await PageObjects.dashboard.clearUnsavedChanges();

        // brush area chart and drilldown back to pie chat dashboard
        await brushAreaChart();
        await dashboardDrilldownPanelActions.expectMultipleActionsMenuOpened();
        await navigateWithinDashboard(async () => {
          await drilldownAction(DRILLDOWN_TO_PIE_CHART_NAME);
        });

        // because filters are preserved during navigation, we expect that only one slice is displayed (filter is still applied)
        expect(await filterBar.getFilterCount()).to.be(1);
        await pieChart.expectPieSliceCount(1);
        // check that new time range duration was applied
        const newTimeRangeDurationHours = await PageObjects.timePicker.getTimeDurationInHours();
        expect(newTimeRangeDurationHours).to.be.lessThan(originalTimeRangeDurationHours);
        await PageObjects.dashboard.clearUnsavedChanges();
      };
    });

    describe('Copy to space', () => {
      const destinationSpaceId = 'custom_space';
      before(async () => {
        await spaces.create({
          id: destinationSpaceId,
          name: 'custom_space',
          disabledFeatures: [],
        });
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSavedObjects();
      });

      after(async () => {
        await spaces.delete(destinationSpaceId);
      });

      it('Dashboards linked by a drilldown are both copied to a space', async () => {
        await PageObjects.copySavedObjectsToSpace.openCopyToSpaceFlyoutForObject(
          dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME
        );
        await PageObjects.copySavedObjectsToSpace.setupForm({
          destinationSpaceId,
        });
        await PageObjects.copySavedObjectsToSpace.startCopy();

        // Wait for successful copy
        await testSubjects.waitForDeleted(`cts-summary-indicator-loading-${destinationSpaceId}`);
        await testSubjects.existOrFail(`cts-summary-indicator-success-${destinationSpaceId}`);

        const summaryCounts = await PageObjects.copySavedObjectsToSpace.getSummaryCounts();

        expect(summaryCounts).to.eql({
          success: 5, // 2 dashboards (linked by a drilldown) + 2 visualizations + 1 index pattern
          pending: 0,
          skipped: 0,
          errors: 0,
        });

        await PageObjects.copySavedObjectsToSpace.finishCopy();

        // Actually use copied dashboards in a new space:

        await PageObjects.common.navigateToApp('dashboard', {
          basePath: `/s/${destinationSpaceId}`,
        });
        await PageObjects.dashboard.preserveCrossAppState();
        await PageObjects.dashboard.loadSavedDashboard(
          dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();

        // brush area chart and drilldown back to pie chat dashboard
        await brushAreaChart();
        await dashboardDrilldownPanelActions.expectMultipleActionsMenuOpened();

        await navigateWithinDashboard(async () => {
          await dashboardDrilldownPanelActions.clickActionByText(DRILLDOWN_TO_PIE_CHART_NAME);
        });
        await elasticChart.setNewChartUiDebugFlag();
        await queryBar.submitQuery();
        await pieChart.expectPieSliceCountEsCharts(10);
      });
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
