/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { header, dashboard, timePicker, lens } = getPageObjects([
    'header',
    'dashboard',
    'timePicker',
    'lens',
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
  const inspector = getService('inspector');
  const queryBar = getService('queryBar');
  const dashboardDrilldownsManage = getService('dashboardDrilldownsManage');
  const dashboardDrilldownPanelActions = getService('dashboardDrilldownPanelActions');

  async function clickInChart(x: number, y: number) {
    const el = await elasticChart.getCanvas();
    await browser.getActions().move({ x, y, origin: el._webElement }).click().perform();
  }

  async function rightClickInChart(x: number, y: number) {
    const el = await elasticChart.getCanvas();
    await browser.getActions().move({ x, y, origin: el._webElement }).contextClick().perform();
  }

  describe('lens dashboard tests', () => {
    before(async () => {
      await dashboard.navigateToApp();
      await security.testUser.setRoles(
        [
          'global_dashboard_all',
          'global_discover_all',
          'test_logstash_reader',
          'global_visualize_all',
        ],
        { skipBrowserRefresh: true }
      );
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('metric should be embeddable', async () => {
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('Artistpreviouslyknownaslens');
      await find.clickByButtonText('Artistpreviouslyknownaslens');
      await dashboardAddPanel.closeAddPanel();
      await lens.assertLegacyMetric('Maximum of bytes', '19,986');
    });

    it('should be able to add filters/timerange by clicking in XYChart', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsXYvis');
      await find.clickByButtonText('lnsXYvis');
      await dashboardAddPanel.closeAddPanel();
      await retry.try(async () => {
        await clickInChart(30, 5); // hardcoded position of bar, depends heavy on data and charts implementation
        await testSubjects.existOrFail('applyFiltersPopoverButton', { timeout: 2500 });
      });

      await retry.try(async () => {
        await testSubjects.click('applyFiltersPopoverButton');
        await testSubjects.missingOrFail('applyFiltersPopoverButton');
      });

      await lens.assertExactText('[data-test-subj="embeddablePanelHeading-lnsXYvis"]', 'lnsXYvis');
      const time = await timePicker.getTimeConfig();
      expect(time.start).to.equal('Sep 21, 2015 @ 09:00:00.000');
      expect(time.end).to.equal('Sep 21, 2015 @ 12:00:00.000');
      const hasIpFilter = await filterBar.hasFilter('ip', '97.220.3.248');
      expect(hasIpFilter).to.be(true);
    });

    it('should be able to add filters by right clicking in XYChart', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsXYvis');
      await find.clickByButtonText('lnsXYvis');
      await dashboardAddPanel.closeAddPanel();
      await retry.try(async () => {
        // show the tooltip actions
        await rightClickInChart(30, 5); // hardcoded position of bar, depends heavy on data and charts implementation
        await (await find.allByCssSelector('.echTooltipActions__action'))[1].click();
        const hasIpFilter = await filterBar.hasFilter('ip', '97.220.3.248');
        expect(hasIpFilter).to.be(true);
        await rightClickInChart(35, 5); // hardcoded position of bar, depends heavy on data and charts implementation
        await (await find.allByCssSelector('.echTooltipActions__action'))[0].click();
        const time = await timePicker.getTimeConfig();
        expect(time.start).to.equal('Sep 21, 2015 @ 09:00:00.000');
        expect(time.end).to.equal('Sep 21, 2015 @ 12:00:00.000');
      });
    });

    // Requires xpack.discoverEnhanced.actions.exploreDataInContextMenu.enabled
    // setting set in kibana.yml to test (not enabled by default)
    it('should hide old "explore underlying data" action', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsXYvis');
      await find.clickByButtonText('lnsXYvis');
      await dashboardAddPanel.closeAddPanel();
      await dashboard.saveDashboard('lnsDrilldown');

      await panelActions.expectMissingPanelAction(
        'embeddablePanelAction-ACTION_EXPLORE_DATA',
        'lnsXYvis'
      );
    });

    it('should be able to add filters by clicking in pie chart', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsPieVis');
      await find.clickByButtonText('lnsPieVis');
      await dashboardAddPanel.closeAddPanel();

      await clickInChart(5, 5); // hardcoded position of the slice, depends heavy on data and charts implementation

      await lens.assertExactText(
        '[data-test-subj="embeddablePanelHeading-lnsPieVis"]',
        'lnsPieVis'
      );
      const hasGeoDestFilter = await filterBar.hasFilter('geo.dest', 'AL');
      expect(hasGeoDestFilter).to.be(true);
      await filterBar.addFilter({ field: 'geo.src', operation: 'is', value: 'US' });
      await filterBar.toggleFilterPinned('geo.src');
    });

    it('should not carry over filters if creating a new lens visualization from within dashboard', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultAbsoluteRange();
      await filterBar.addFilter({ field: 'geo.src', operation: 'is', value: 'US' });
      await filterBar.toggleFilterPinned('geo.src');
      await filterBar.addFilter({ field: 'geo.dest', operation: 'is', value: 'LS' });

      await dashboardAddPanel.clickCreateNewLink();
      await header.waitUntilLoadingHasFinished();
      const hasGeoDestFilter = await filterBar.hasFilter('geo.dest', 'LS');
      expect(hasGeoDestFilter).to.be(false);
      const hasGeoSrcFilter = await filterBar.hasFilter('geo.src', 'US', true, true);
      expect(hasGeoSrcFilter).to.be(true);
    });

    it('CSV export action exists in panel context menu', async () => {
      const ACTION_ID = 'ACTION_EXPORT_CSV';
      const ACTION_TEST_SUBJ = `embeddablePanelAction-${ACTION_ID}`;
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsPieVis');
      await find.clickByButtonText('lnsPieVis');
      await header.waitUntilLoadingHasFinished();
      await dashboardAddPanel.closeAddPanel();

      await retry.try(async () => {
        await panelActions.expectExistsPanelAction(ACTION_TEST_SUBJ);
      });
    });

    it('should show all data from all layers in the inspector', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickCreateNewLink();
      await header.waitUntilLoadingHasFinished();
      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.createLayer();

      expect(await lens.hasChartSwitchWarning('line')).to.eql(false);

      await lens.switchToVisualization('line');
      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'median',
        field: 'bytes',
      });
      await lens.saveAndReturn();

      await panelActions.openInspector();
      await inspector.openInspectorRequestsView();
      const requests = await inspector.getRequestNames();
      expect(requests.split(',').length).to.be(2);
    });

    it('unlink lens panel from embeddable library', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsPieVis');
      await find.clickByButtonText('lnsPieVis');
      await dashboardAddPanel.closeAddPanel();

      await panelActions.unlinkFromLibrary('lnsPieVis');
    });

    it('save lens panel to embeddable library', async () => {
      await panelActions.saveToLibrary('lnsPieVis - copy', 'lnsPieVis');

      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsPieVis');
      await find.existsByLinkText('lnsPieVis');
    });

    it('should show validation messages if any error appears', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();

      await dashboardAddPanel.clickCreateNewLink();
      await header.waitUntilLoadingHasFinished();

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'moving_average',
        keepOpen: true,
      });
      await lens.configureReference({
        operation: 'sum',
        field: 'bytes',
      });
      await lens.closeDimensionEditor();

      // remove the x dimension to trigger the validation error
      await lens.removeDimension('lnsXY_xDimensionPanel');
      await lens.expectSaveAndReturnButtonDisabled();
    });

    it('should recover lens panel in an error state when fixing search query', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsXYvis');
      await find.clickByButtonText('lnsXYvis');
      await dashboardAddPanel.closeAddPanel();
      // type an invalid search query, hit refresh
      await queryBar.setQuery('this is > not valid');
      await queryBar.submitQuery();
      // check the error state
      await header.waitUntilLoadingHasFinished();
      const errors = await testSubjects.findAll('embeddableStackError');
      expect(errors.length).to.be(1);
      // now remove the query
      await queryBar.setQuery('');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();
      // check the success state
      await dashboard.verifyNoRenderErrors();
    });

    it('should work in lens with by-value charts', async () => {
      // create a new dashboard, then a new visualization in Lens.
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickAddLensPanel();
      // Configure it and save to return to the dashboard.
      await lens.waitForField('@timestamp');
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
      await lens.save('test', true);
      // Edit the visualization now and get back to Lens editor
      await panelActions.clickInlineEdit();
      await testSubjects.click('navigateToLensEditorLink');
      // Click on Share, then Copy link and paste the link in a new tab.
      const url = await lens.getUrl();
      await browser.openNewTab();
      await browser.navigateTo(url);
      expect(await lens.getTitle()).to.be('test');
      // need to make sure there aren't extra tabs or it will impact future test suites
      // close any new tabs that were opened
      const windowHandlers = await browser.getAllWindowHandles();
      if (windowHandlers.length > 1) {
        await browser.closeCurrentWindow();
        await browser.switchToWindow(windowHandlers[0]);
      }
    });

    it('should add a drilldown to a Lens by-value chart', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsPieVis');
      await find.clickByButtonText('lnsPieVis');
      await dashboardAddPanel.closeAddPanel();

      // add a drilldown to the pie chart
      await dashboardDrilldownPanelActions.clickCreateDrilldown();
      await testSubjects.click('actionFactoryItem-OPEN_IN_DISCOVER_DRILLDOWN');
      await dashboardDrilldownsManage.saveChanges();
      await dashboardDrilldownsManage.closeFlyout();
      await header.waitUntilLoadingHasFinished();

      // check that the drilldown is working now
      await clickInChart(5, 5); // hardcoded position of the slice, depends heavy on data and charts implementation
      expect(
        await find.existsByCssSelector('[data-test-subj^="embeddablePanelAction-D_ACTION"]')
      ).to.be(true);

      // save the dashboard
      await dashboard.saveDashboard('dashboardWithDrilldown');

      // re-open the dashboard and check the drilldown is still there
      await dashboard.navigateToApp();
      await dashboard.loadSavedDashboard('dashboardWithDrilldown');
      await header.waitUntilLoadingHasFinished();

      await clickInChart(5, 5); // hardcoded position of the slice, depends heavy on data and charts implementation
      expect(
        await find.existsByCssSelector('[data-test-subj^="embeddablePanelAction-D_ACTION"]')
      ).to.be(true);
    });
  });
}
