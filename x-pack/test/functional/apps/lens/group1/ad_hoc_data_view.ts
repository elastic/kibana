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
  ]);
  const elasticChart = getService('elasticChart');
  const fieldEditor = getService('fieldEditor');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

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
    await PageObjects.lens.createAdHocDataView('*stash*');
    retry.try(async () => {
      const selectedPattern = await PageObjects.lens.getDataPanelIndexPattern();
      expect(selectedPattern).to.eql('*stash*');
    });
  }

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
        await PageObjects.lens.clickAddField();
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
      await PageObjects.lens.switchDataPanelIndexPattern('logstash-*');
      await PageObjects.lens.waitForFieldMissing('runtimefield');
      await PageObjects.lens.switchDataPanelIndexPattern('*stash*');
      await PageObjects.lens.waitForField('runtimefield');
    });

    it('should allow removing a field', async () => {
      await PageObjects.lens.clickField('runtimefield');
      await PageObjects.lens.removeField();
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
      expect(metricData[0].value).to.eql('5.73K');
      expect(metricData[0].title).to.eql('Average of bytes');
      await PageObjects.lens.save('New Lens from Modal', false, false, false, 'new');

      await PageObjects.dashboard.waitForRenderComplete();
      expect(metricData[0].value).to.eql('5.73K');

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
      expect(metricData[0].value).to.eql('5.73K');
      expect(metricData[0].title).to.eql('Average of bytes');
    });

    it('should navigate to discover correctly', async () => {
      await testSubjects.clickWhenNotDisabledWithoutRetry(`lnsApp_openInDiscover`);

      const [, discoverWindowHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(discoverWindowHandle);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.common.sleep(15000);

      const actualIndexPattern = await (
        await testSubjects.find('discover-dataView-switch-link')
      ).getVisibleText();
      expect(actualIndexPattern).to.be('*stash*');

      const actualDiscoverQueryHits = await testSubjects.getVisibleText('discoverQueryHits');
      expect(actualDiscoverQueryHits).to.be('14,005');
    });
  });
}
