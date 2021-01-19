/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const DRILLDOWN_TO_DISCOVER_URL = 'Go to discover';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardDrilldownPanelActions = getService('dashboardDrilldownPanelActions');
  const dashboardDrilldownsManage = getService('dashboardDrilldownsManage');
  const PageObjects = getPageObjects(['dashboard', 'common', 'header', 'timePicker', 'discover']);
  const log = getService('log');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');

  describe('Dashboard to URL drilldown', function () {
    before(async () => {
      log.debug('Dashboard to URL:initTests');
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
    });

    it('should create dashboard to URL drilldown and use it to navigate to discover', async () => {
      await PageObjects.dashboard.gotoDashboardEditMode(
        dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME
      );

      // create drilldown
      await dashboardPanelActions.openContextMenu();
      await dashboardDrilldownPanelActions.expectExistsCreateDrilldownAction();
      await dashboardDrilldownPanelActions.clickCreateDrilldown();
      await dashboardDrilldownsManage.expectsCreateDrilldownFlyoutOpen();

      const urlTemplate = `{{kibanaUrl}}/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'{{event.from}}',to:'{{event.to}}'))&_a=(columns:!(_source),filters:{{rison context.panel.filters}},index:'{{context.panel.indexPatternId}}',interval:auto,query:(language:{{context.panel.query.language}},query:'{{context.panel.query.query}}'),sort:!())`;

      await dashboardDrilldownsManage.fillInDashboardToURLDrilldownWizard({
        drilldownName: DRILLDOWN_TO_DISCOVER_URL,
        destinationURLTemplate: urlTemplate,
        trigger: 'SELECT_RANGE_TRIGGER',
      });

      await testSubjects.click('urlDrilldownAdditionalOptions');
      await testSubjects.click('urlDrilldownOpenInNewTab');

      await dashboardDrilldownsManage.saveChanges();
      await dashboardDrilldownsManage.expectsCreateDrilldownFlyoutClose();

      // check that drilldown notification badge is shown
      expect(await PageObjects.dashboard.getPanelDrilldownCount()).to.be(2);

      // save dashboard, navigate to view mode
      await PageObjects.dashboard.saveDashboard(
        dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME,
        {
          saveAsNew: false,
          waitDialogIsClosed: true,
        }
      );

      const originalTimeRangeDurationHours = await PageObjects.timePicker.getTimeDurationInHours();

      await brushAreaChart();
      await dashboardDrilldownPanelActions.expectMultipleActionsMenuOpened();
      await dashboardDrilldownPanelActions.clickActionByText(DRILLDOWN_TO_DISCOVER_URL);

      await PageObjects.discover.waitForDiscoverAppOnScreen();

      // check that new time range duration was applied
      const newTimeRangeDurationHours = await PageObjects.timePicker.getTimeDurationInHours();
      expect(newTimeRangeDurationHours).to.be.lessThan(originalTimeRangeDurationHours);
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
}
