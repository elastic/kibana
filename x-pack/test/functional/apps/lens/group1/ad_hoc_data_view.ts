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
  const PageObjects = getPageObjects([
    'visualize',
    'lens',
    'header',
    'unifiedSearch',
    'dashboard',
    'timeToVisualize',
    'common',
    'discover',
    'unifiedFieldList',
  ]);
  const elasticChart = getService('elasticChart');
  const fieldEditor = getService('fieldEditor');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const dataViews = getService('dataViews');

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
    await PageObjects.visualize.navigateToNewVisualization();
    await PageObjects.visualize.clickVisType('lens');
    await elasticChart.setNewChartUiDebugFlag(true);
    await dataViews.createFromSearchBar({ name: '*stash*', adHoc: true });
    await dataViews.waitForSwitcherToBe('*stash*');
  }

  const checkDiscoverNavigationResult = async () => {
    await testSubjects.click('embeddablePanelToggleMenuIcon');
    await testSubjects.click('embeddablePanelMore-mainMenu');
    await testSubjects.click('embeddablePanelAction-ACTION_OPEN_IN_DISCOVER');

    const [, discoverHandle] = await browser.getAllWindowHandles();
    await browser.switchToWindow(discoverHandle);
    await PageObjects.header.waitUntilLoadingHasFinished();

    const actualIndexPattern = await (
      await testSubjects.find('discover-dataView-switch-link')
    ).getVisibleText();
    expect(actualIndexPattern).to.be('*stash*');

    const actualDiscoverQueryHits = await testSubjects.getVisibleText('discoverQueryHits');
    expect(actualDiscoverQueryHits).to.be('14,005');
    expect(await dataViews.isAdHoc()).to.be(true);
  };

  describe('lens ad hoc data view tests', () => {
    it('should allow building a chart based on ad hoc data view', async () => {
      await setupAdHocDataView();
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
      const data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
      assertMatchesExpectedData(data!);
      await PageObjects.lens.removeLayer();
    });

    it('should allow adding and using a field', async () => {
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      await retry.try(async () => {
        await dataViews.clickAddFieldFromSearchBar();
        await fieldEditor.setName('runtimefield');
        await fieldEditor.enableValue();
        await fieldEditor.typeScript("emit('abc')");
        await fieldEditor.save();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.lens.searchField('runtime');
        await PageObjects.lens.waitForField('runtimefield');
        await PageObjects.lens.dragFieldToWorkspace('runtimefield');
      });
      await PageObjects.lens.waitForVisualization();
      expect(await PageObjects.lens.getDatatableHeaderText(0)).to.equal(
        'Top 5 values of runtimefield'
      );
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('abc');
      await PageObjects.lens.removeLayer();
    });

    it('should allow switching to another data view and back', async () => {
      await dataViews.switchTo('logstash-*');
      await dataViews.waitForSwitcherToBe('logstash-*');
      await PageObjects.lens.waitForFieldMissing('runtimefield');
      await dataViews.switchTo('*stash*');
      await dataViews.waitForSwitcherToBe('*stash*');
      await PageObjects.lens.waitForField('runtimefield');
    });

    it('should allow removing a field', async () => {
      await PageObjects.lens.clickField('runtimefield');
      await PageObjects.lens.removeField('runtimefield');
      await fieldEditor.confirmDelete();
      await PageObjects.lens.waitForFieldMissing('runtimefield');
    });

    it('should allow adding an ad-hoc chart to a dashboard', async () => {
      await PageObjects.lens.switchToVisualization('lnsMetric');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsMetric_primaryMetricDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.waitForVisualization('mtrVis');
      const metricData = await PageObjects.lens.getMetricVisualizationData();
      expect(metricData[0].value).to.eql('5,727.322');
      expect(metricData[0].title).to.eql('Average of bytes');
      await PageObjects.lens.save('New Lens from Modal', false, false, false, 'new');

      await PageObjects.dashboard.waitForRenderComplete();
      expect(metricData[0].value).to.eql('5,727.322');

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('should allow saving the ad-hoc chart into a saved object', async () => {
      await setupAdHocDataView();
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.switchToVisualization('lnsMetric');

      await PageObjects.lens.waitForVisualization('mtrVis');
      await PageObjects.lens.save('Lens with adhoc data view');
      await PageObjects.lens.waitForVisualization('mtrVis');
      const metricData = await PageObjects.lens.getMetricVisualizationData();
      expect(metricData[0].value).to.eql('5,727.322');
      expect(metricData[0].title).to.eql('Average of bytes');
    });

    it('should be possible to share a URL of a visualization with adhoc dataViews', async () => {
      const url = await PageObjects.lens.getUrl('snapshot');
      await browser.openNewTab();

      const [lensWindowHandler] = await browser.getAllWindowHandles();

      await browser.navigateTo(url);
      // check that it's the same configuration in the new URL when ready
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(
        await PageObjects.lens.getDimensionTriggerText('lnsMetric_primaryMetricDimensionPanel')
      ).to.eql('Average of bytes');
      await browser.closeCurrentWindow();
      await browser.switchToWindow(lensWindowHandler);
    });

    it('should be possible to download a visualization with adhoc dataViews', async () => {
      await PageObjects.lens.setCSVDownloadDebugFlag(true);
      await PageObjects.lens.openCSVDownloadShare();

      const csv = await PageObjects.lens.getCSVContent();
      expect(csv).to.be.ok();
      expect(Object.keys(csv!)).to.have.length(1);
      await PageObjects.lens.setCSVDownloadDebugFlag(false);
    });

    it('should navigate to discover correctly', async () => {
      await testSubjects.clickWhenNotDisabledWithoutRetry(`lnsApp_openInDiscover`);

      const [, discoverWindowHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(discoverWindowHandle);
      await PageObjects.header.waitUntilLoadingHasFinished();

      const actualIndexPattern = await (
        await testSubjects.find('discover-dataView-switch-link')
      ).getVisibleText();
      expect(actualIndexPattern).to.be('*stash*');

      const actualDiscoverQueryHits = await testSubjects.getVisibleText('discoverQueryHits');
      expect(actualDiscoverQueryHits).to.be('14,005');

      const prevDataViewId = await PageObjects.discover.getCurrentDataViewId();

      await PageObjects.discover.addRuntimeField(
        '_bytes-runtimefield',
        `emit(doc["bytes"].value.toString())`
      );
      await PageObjects.unifiedFieldList.clickFieldListItemToggle('_bytes-runtimefield');
      const newDataViewId = await PageObjects.discover.getCurrentDataViewId();
      expect(newDataViewId).not.to.equal(prevDataViewId);
      expect(await dataViews.isAdHoc()).to.be(true);

      await browser.closeCurrentWindow();
    });

    it('should navigate to discover from embeddable correctly', async () => {
      const [lensHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(lensHandle);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await setupAdHocDataView();
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.save(
        'embeddable-test-with-adhoc-data-view',
        false,
        false,
        false,
        'new'
      );

      await checkDiscoverNavigationResult();

      await browser.closeCurrentWindow();
      const [daashboardHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(daashboardHandle);
      await PageObjects.header.waitUntilLoadingHasFinished();

      // adhoc data view should be persisted after refresh
      await browser.refresh();
      await checkDiscoverNavigationResult();

      await browser.closeCurrentWindow();
      await browser.switchToWindow(daashboardHandle);
    });
  });
}
