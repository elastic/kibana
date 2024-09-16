/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DebugState } from '@elastic/charts';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens, header, dashboard, timeToVisualize, discover, unifiedFieldList } =
    getPageObjects([
      'visualize',
      'lens',
      'header',
      'dashboard',
      'timeToVisualize',
      'discover',
      'unifiedFieldList',
    ]);
  const elasticChart = getService('elasticChart');
  const fieldEditor = getService('fieldEditor');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const dataViews = getService('dataViews');
  const dashboardPanelActions = getService('dashboardPanelActions');

  const expectedData = [
    { x: '97.220.3.248', y: 19755 },
    { x: '169.228.188.120', y: 18994 },
    { x: '78.83.247.30', y: 17246 },
    { x: '226.82.228.233', y: 15687 },
    { x: '93.28.27.24', y: 15614.33 },
    { x: 'Other', y: 5722.77 },
  ];
  function assertMatchesExpectedData(state: DebugState) {
    expect(
      state.bars![0].bars.map((bar) => ({
        x: bar.x,
        y: Math.floor(bar.y * 100) / 100,
      }))
    ).to.eql(expectedData);
  }

  async function setupAdHocDataView() {
    await visualize.navigateToNewVisualization();
    await visualize.clickVisType('lens');
    await elasticChart.setNewChartUiDebugFlag(true);
    await dataViews.createFromSearchBar({ name: '*stash*', adHoc: true });
    await dataViews.waitForSwitcherToBe('*stash*');
  }

  const checkDiscoverNavigationResult = async () => {
    await dashboardPanelActions.clickContextMenuItem(
      'embeddablePanelAction-ACTION_OPEN_IN_DISCOVER'
    );

    const [, discoverHandle] = await browser.getAllWindowHandles();
    await browser.switchToWindow(discoverHandle);
    await header.waitUntilLoadingHasFinished();

    const actualIndexPattern = await (
      await testSubjects.find('discover-dataView-switch-link')
    ).getVisibleText();
    expect(actualIndexPattern).to.be('*stash*');

    const actualDiscoverQueryHits = await testSubjects.getVisibleText('discoverQueryHits');
    expect(actualDiscoverQueryHits).to.be('14,005');
    expect(await dataViews.isAdHoc()).to.be(true);
  };

  const waitForPageReady = async () => {
    await header.waitUntilLoadingHasFinished();
    await retry.waitFor('page ready after refresh', async () => {
      const queryBarVisible = await testSubjects.exists('globalQueryBar');
      return queryBarVisible;
    });
  };

  describe('lens ad hoc data view tests', () => {
    it('should allow building a chart based on ad hoc data view', async () => {
      await setupAdHocDataView();
      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
      const data = await lens.getCurrentChartDebugState('xyVisChart');
      assertMatchesExpectedData(data!);
      await lens.removeLayer();
    });

    it('should allow adding and using a field', async () => {
      await lens.switchToVisualization('lnsDatatable');
      await retry.try(async () => {
        await dataViews.clickAddFieldFromSearchBar();
        await fieldEditor.setName('runtimefield');
        await fieldEditor.enableValue();
        await fieldEditor.typeScript("emit('abc')");
        await fieldEditor.save();
        await header.waitUntilLoadingHasFinished();
        await lens.searchField('runtime');
        await lens.waitForField('runtimefield');
        await lens.dragFieldToWorkspace('runtimefield');
      });
      await lens.waitForVisualization();
      expect(await lens.getDatatableHeaderText(0)).to.equal('Top 5 values of runtimefield');
      expect(await lens.getDatatableCellText(0, 0)).to.eql('abc');
      await lens.removeLayer();
    });

    it('should allow switching to another data view and back', async () => {
      await dataViews.switchTo('logstash-*');
      await lens.waitForFieldMissing('runtimefield');
      await dataViews.switchTo('*stash*');
      await lens.waitForField('runtimefield');
    });

    it('should allow removing a field', async () => {
      await lens.clickField('runtimefield');
      await lens.removeField('runtimefield');
      await fieldEditor.confirmDelete();
      await lens.waitForFieldMissing('runtimefield');
    });

    it('should allow adding an ad-hoc chart to a dashboard', async () => {
      await lens.switchToVisualization('lnsMetric');

      await lens.configureDimension({
        dimension: 'lnsMetric_primaryMetricDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.waitForVisualization('mtrVis');
      const metricData = await lens.getMetricVisualizationData();
      expect(metricData[0].value).to.eql('5,727.322');
      expect(metricData[0].title).to.eql('Average of bytes');
      await lens.save('New Lens from Modal', false, false, false, 'new');

      await dashboard.waitForRenderComplete();
      expect(metricData[0].value).to.eql('5,727.322');

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await timeToVisualize.resetNewDashboard();
    });

    it('should allow saving the ad-hoc chart into a saved object', async () => {
      await setupAdHocDataView();
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.switchToVisualization('lnsMetric');

      await lens.waitForVisualization('mtrVis');
      await lens.save('Lens with adhoc data view');
      await lens.waitForVisualization('mtrVis');
      const metricData = await lens.getMetricVisualizationData();
      expect(metricData[0].value).to.eql('5,727.322');
      expect(metricData[0].title).to.eql('Average of bytes');
    });

    it('should be possible to share a URL of a visualization with adhoc dataViews', async () => {
      const url = await lens.getUrl();
      await browser.openNewTab();

      const [lensWindowHandler] = await browser.getAllWindowHandles();

      await browser.navigateTo(url);
      // check that it's the same configuration in the new URL when ready
      await header.waitUntilLoadingHasFinished();
      expect(await lens.getDimensionTriggerText('lnsMetric_primaryMetricDimensionPanel')).to.eql(
        'Average of bytes'
      );
      await browser.closeCurrentWindow();
      await browser.switchToWindow(lensWindowHandler);
    });

    it('should be possible to download a visualization with adhoc dataViews', async () => {
      await lens.setCSVDownloadDebugFlag(true);
      await lens.openCSVDownloadShare();

      const csv = await lens.getCSVContent();
      expect(csv).to.be.ok();
      expect(Object.keys(csv!)).to.have.length(1);
      await lens.setCSVDownloadDebugFlag(false);
    });

    it('should navigate to discover correctly', async () => {
      await testSubjects.clickWhenNotDisabledWithoutRetry(`lnsApp_openInDiscover`);

      const [, discoverWindowHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(discoverWindowHandle);
      await header.waitUntilLoadingHasFinished();

      const actualIndexPattern = await (
        await testSubjects.find('discover-dataView-switch-link')
      ).getVisibleText();
      expect(actualIndexPattern).to.be('*stash*');

      const actualDiscoverQueryHits = await testSubjects.getVisibleText('discoverQueryHits');
      expect(actualDiscoverQueryHits).to.be('14,005');

      const prevDataViewId = await discover.getCurrentDataViewId();

      await discover.addRuntimeField('_bytes-runtimefield', `emit(doc["bytes"].value.toString())`);
      await unifiedFieldList.clickFieldListItemToggle('_bytes-runtimefield');
      const newDataViewId = await discover.getCurrentDataViewId();
      expect(newDataViewId).not.to.equal(prevDataViewId);
      expect(await dataViews.isAdHoc()).to.be(true);

      await browser.closeCurrentWindow();
      const [lensHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(lensHandle);
    });
    it('should navigate to discover from embeddable correctly', async () => {
      const [lensHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(lensHandle);
      await header.waitUntilLoadingHasFinished();

      await setupAdHocDataView();
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.save('embeddable-test-with-adhoc-data-view', false, false, false, 'new');

      await header.waitUntilLoadingHasFinished();
      await checkDiscoverNavigationResult();

      await browser.closeCurrentWindow();
      const [daashboardHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(daashboardHandle);
      await header.waitUntilLoadingHasFinished();

      // adhoc data view should be persisted after refresh
      await browser.refresh();
      await waitForPageReady();
      await checkDiscoverNavigationResult();

      await browser.closeCurrentWindow();
      await browser.switchToWindow(daashboardHandle);
    });
  });
}
