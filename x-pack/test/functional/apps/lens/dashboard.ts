/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'header',
    'common',
    'dashboard',
    'timePicker',
    'lens',
    'discover',
  ]);

  const find = getService('find');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const elasticChart = getService('elasticChart');
  const browser = getService('browser');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const security = getService('security');
  const panelActions = getService('dashboardPanelActions');

  async function clickInChart(x: number, y: number) {
    const el = await elasticChart.getCanvas();
    await browser.getActions().move({ x, y, origin: el._webElement }).click().perform();
  }

  describe('lens dashboard tests', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await security.testUser.setRoles(
        [
          'global_dashboard_all',
          'global_discover_all',
          'test_logstash_reader',
          'global_visualize_all',
        ],
        false
      );
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('metric should be embeddable', async () => {
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('Artistpreviouslyknownaslens');
      await find.clickByButtonText('Artistpreviouslyknownaslens');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.assertMetric('Maximum of bytes', '19,986');
    });

    it('should be able to add filters/timerange by clicking in XYChart', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsXYvis');
      await find.clickByButtonText('lnsXYvis');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();
      await clickInChart(5, 5); // hardcoded position of bar, depends heavy on data and charts implementation

      await retry.try(async () => {
        await testSubjects.click('applyFiltersPopoverButton');
        await testSubjects.missingOrFail('applyFiltersPopoverButton');
      });

      await PageObjects.lens.assertExactText(
        '[data-test-subj="embeddablePanelHeading-lnsXYvis"]',
        'lnsXYvis'
      );
      const time = await PageObjects.timePicker.getTimeConfig();
      expect(time.start).to.equal('Sep 21, 2015 @ 09:00:00.000');
      expect(time.end).to.equal('Sep 21, 2015 @ 12:00:00.000');
      const hasIpFilter = await filterBar.hasFilter('ip', '97.220.3.248');
      expect(hasIpFilter).to.be(true);
    });

    it('should be able to drill down to discover', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsXYvis');
      await find.clickByButtonText('lnsXYvis');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();
      await PageObjects.dashboard.saveDashboard('lnsDrilldown');
      await panelActions.openContextMenu();
      await testSubjects.clickWhenNotDisabled('embeddablePanelAction-ACTION_EXPLORE_DATA');
      await PageObjects.discover.waitForDiscoverAppOnScreen();

      const el = await testSubjects.find('indexPattern-switch-link');
      const text = await el.getVisibleText();

      expect(text).to.be('logstash-*');
    });

    it('should be able to add filters by clicking in pie chart', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsPieVis');
      await find.clickByButtonText('lnsPieVis');
      await dashboardAddPanel.closeAddPanel();

      await PageObjects.lens.goToTimeRange();
      await clickInChart(5, 5); // hardcoded position of the slice, depends heavy on data and charts implementation

      await PageObjects.lens.assertExactText(
        '[data-test-subj="embeddablePanelHeading-lnsPieVis"]',
        'lnsPieVis'
      );
      const hasGeoDestFilter = await filterBar.hasFilter('geo.dest', 'LS');
      expect(hasGeoDestFilter).to.be(true);
    });

    it('should carry over filters if creating a new lens visualization from within dashboard', async () => {
      await dashboardAddPanel.clickCreateNewLink();
      await dashboardAddPanel.clickVisType('lens');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const hasGeoDestFilter = await filterBar.hasFilter('geo.dest', 'LS');
      expect(hasGeoDestFilter).to.be(true);
    });
  });
}
