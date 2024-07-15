/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

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
  const inspector = getService('inspector');
  const queryBar = getService('queryBar');

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
      await PageObjects.dashboard.navigateToApp();
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
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('Artistpreviouslyknownaslens');
      await find.clickByButtonText('Artistpreviouslyknownaslens');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.assertLegacyMetric('Maximum of bytes', '19,986');
    });

    it('should be able to add filters/timerange by clicking in XYChart', async () => {
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsXYvis');
      await find.clickByButtonText('lnsXYvis');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();
      await retry.try(async () => {
        await clickInChart(30, 5); // hardcoded position of bar, depends heavy on data and charts implementation
        await testSubjects.existOrFail('applyFiltersPopoverButton', { timeout: 2500 });
      });

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

    it('should be able to add filters by right clicking in XYChart', async () => {
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsXYvis');
      await find.clickByButtonText('lnsXYvis');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();
      await retry.try(async () => {
        // show the tooltip actions
        await rightClickInChart(30, 5); // hardcoded position of bar, depends heavy on data and charts implementation
        await (await find.allByCssSelector('.echTooltipActions__action'))[1].click();
        const hasIpFilter = await filterBar.hasFilter('ip', '97.220.3.248');
        expect(hasIpFilter).to.be(true);
        await rightClickInChart(35, 5); // hardcoded position of bar, depends heavy on data and charts implementation
        await (await find.allByCssSelector('.echTooltipActions__action'))[0].click();
        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.equal('Sep 21, 2015 @ 09:00:00.000');
        expect(time.end).to.equal('Sep 21, 2015 @ 12:00:00.000');
      });
    });

    // Requires xpack.discoverEnhanced.actions.exploreDataInContextMenu.enabled
    // setting set in kibana.yml to test (not enabled by default)
    it('should hide old "explore underlying data" action', async () => {
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsXYvis');
      await find.clickByButtonText('lnsXYvis');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();
      await PageObjects.dashboard.saveDashboard('lnsDrilldown');
      await panelActions.openContextMenu();

      expect(await testSubjects.exists('embeddablePanelAction-ACTION_EXPLORE_DATA')).not.to.be.ok();
    });

    it('should be able to add filters by clicking in pie chart', async () => {
      await PageObjects.dashboard.navigateToApp();
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
      const hasGeoDestFilter = await filterBar.hasFilter('geo.dest', 'AL');
      expect(hasGeoDestFilter).to.be(true);
      await filterBar.addFilter({ field: 'geo.src', operation: 'is', value: 'US' });
      await filterBar.toggleFilterPinned('geo.src');
    });

    it('should not carry over filters if creating a new lens visualization from within dashboard', async () => {
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await filterBar.addFilter({ field: 'geo.src', operation: 'is', value: 'US' });
      await filterBar.toggleFilterPinned('geo.src');
      await filterBar.addFilter({ field: 'geo.dest', operation: 'is', value: 'LS' });

      await dashboardAddPanel.clickCreateNewLink();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const hasGeoDestFilter = await filterBar.hasFilter('geo.dest', 'LS');
      expect(hasGeoDestFilter).to.be(false);
      const hasGeoSrcFilter = await filterBar.hasFilter('geo.src', 'US', true, true);
      expect(hasGeoSrcFilter).to.be(true);
    });

    it('CSV export action exists in panel context menu', async () => {
      const ACTION_ID = 'ACTION_EXPORT_CSV';
      const ACTION_TEST_SUBJ = `embeddablePanelAction-${ACTION_ID}`;
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsPieVis');
      await find.clickByButtonText('lnsPieVis');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await dashboardAddPanel.closeAddPanel();

      await retry.try(async () => {
        await panelActions.openContextMenu();
        await panelActions.clickContextMenuMoreItem();
        await testSubjects.existOrFail(ACTION_TEST_SUBJ);
      });
    });

    it('should show all data from all layers in the inspector', async () => {
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickCreateNewLink();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.createLayer();

      expect(await PageObjects.lens.hasChartSwitchWarning('line')).to.eql(false);

      await PageObjects.lens.switchToVisualization('line');
      await PageObjects.lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'median',
        field: 'bytes',
      });
      await PageObjects.lens.saveAndReturn();

      await panelActions.openContextMenu();
      await panelActions.clickContextMenuMoreItem();
      await testSubjects.click('embeddablePanelAction-openInspector');
      await inspector.openInspectorRequestsView();
      const requests = await inspector.getRequestNames();
      expect(requests.split(',').length).to.be(2);
    });

    it('unlink lens panel from embeddable library', async () => {
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsPieVis');
      await find.clickByButtonText('lnsPieVis');
      await dashboardAddPanel.closeAddPanel();

      const originalPanel = await testSubjects.find('embeddablePanelHeading-lnsPieVis');
      await panelActions.legacyUnlinkFromLibrary(originalPanel);
      await testSubjects.existOrFail('unlinkPanelSuccess');

      const updatedPanel = await testSubjects.find('embeddablePanelHeading-lnsPieVis');
      const libraryActionExists = await testSubjects.descendantExists(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
        updatedPanel
      );
      expect(libraryActionExists).to.be(false);
    });

    it('save lens panel to embeddable library', async () => {
      const originalPanel = await testSubjects.find('embeddablePanelHeading-lnsPieVis');
      await panelActions.legacySaveToLibrary('lnsPieVis - copy', originalPanel);

      const updatedPanel = await testSubjects.find('embeddablePanelHeading-lnsPieVis-copy');
      const libraryActionExists = await testSubjects.descendantExists(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
        updatedPanel
      );
      expect(libraryActionExists).to.be(true);

      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsPieVis');
      await find.existsByLinkText('lnsPieVis');
    });

    it('should show validation messages if any error appears', async () => {
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();

      await dashboardAddPanel.clickCreateNewLink();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'moving_average',
        keepOpen: true,
      });
      await PageObjects.lens.configureReference({
        operation: 'sum',
        field: 'bytes',
      });
      await PageObjects.lens.closeDimensionEditor();

      // remove the x dimension to trigger the validation error
      await PageObjects.lens.removeDimension('lnsXY_xDimensionPanel');
      await PageObjects.lens.expectSaveAndReturnButtonDisabled();
    });

    it('should recover lens panel in an error state when fixing search query', async () => {
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsXYvis');
      await find.clickByButtonText('lnsXYvis');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();
      // type an invalid search query, hit refresh
      await queryBar.setQuery('this is > not valid');
      await queryBar.submitQuery();
      // check the error state
      await PageObjects.header.waitUntilLoadingHasFinished();
      const errors = await testSubjects.findAll('embeddableStackError');
      expect(errors.length).to.be(1);
      // now remove the query
      await queryBar.setQuery('');
      await queryBar.submitQuery();
      await PageObjects.header.waitUntilLoadingHasFinished();
      // check the success state
      await PageObjects.dashboard.verifyNoRenderErrors();
    });

    it('should work in lens with by-value charts', async () => {
      // create a new dashboard, then a new visualization in Lens.
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();
      await testSubjects.click('dashboardEditorMenuButton');
      await testSubjects.click('visType-lens');
      // Configure it and save to return to the dashboard.
      await PageObjects.lens.waitForField('@timestamp');
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
      await PageObjects.lens.save('test', true);
      // Edit the visualization now and get back to Lens editor
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelAction-ACTION_CONFIGURE_IN_LENS');
      await testSubjects.click('navigateToLensEditorLink');
      // Click on Share, then Copy link and paste the link in a new tab.
      const url = await PageObjects.lens.getUrl();
      await browser.openNewTab();
      await browser.navigateTo(url);
      expect(await PageObjects.lens.getTitle()).to.be('test');
      // need to make sure there aren't extra tabs or it will impact future test suites
      // close any new tabs that were opened
      const windowHandlers = await browser.getAllWindowHandles();
      if (windowHandlers.length > 1) {
        await browser.closeCurrentWindow();
        await browser.switchToWindow(windowHandlers[0]);
      }
    });
  });
}
