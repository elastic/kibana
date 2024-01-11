/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, visualBuilder, lens, header } = getPageObjects([
    'visualBuilder',
    'visualize',
    'header',
    'lens',
  ]);

  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');

  describe('Top N', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
    });

    beforeEach(async () => {
      await visualBuilder.resetPage();
      await visualBuilder.clickTopN();
      await visualBuilder.checkTopNTabIsPresent();
    });

    it('should not allow converting of not valid panel', async () => {
      await visualBuilder.selectAggType('Max');
      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.be(false);
    });

    it('should not allow converting of unsupported aggregations', async () => {
      await visualBuilder.selectAggType('Sum of Squares');
      await visualBuilder.setFieldForAggregation('machine.ram');

      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.be(false);
    });

    it('should hide the "Edit Visualization in Lens" menu item for a sibling pipeline aggregations', async () => {
      await visualBuilder.createNewAgg();

      await visualBuilder.selectAggType('Overall Average', 1);
      await visualBuilder.setFieldForAggregation('Count', 1);
      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.be(false);
    });

    it('should hide the "Edit Visualization in Lens" menu item for a parent pipeline aggregations', async () => {
      await visualBuilder.clickPanelOptions('topN');
      await visualBuilder.setMetricsDataTimerangeMode('Last value');
      await visualBuilder.clickDataTab('topN');
      await visualBuilder.createNewAgg();

      await visualBuilder.selectAggType('Cumulative Sum', 1);
      await visualBuilder.setFieldForAggregation('Count', 1);
      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.be(false);
    });

    it('should show the "Edit Visualization in Lens" menu item for a count aggregation', async () => {
      expect(await visualize.hasNavigateToLensButton()).to.be(true);
    });

    it('should convert to horizontal bar', async () => {
      await visualBuilder.selectAggType('Max');
      await visualBuilder.setFieldForAggregation('memory', 0);
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      const chartSwitcher = await testSubjects.find('lnsChartSwitchPopover');
      const type = await chartSwitcher.getVisibleText();
      expect(type).to.be('Bar horizontal');
      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(1);

        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        expect(yDimensionText).to.be('Maximum of memory');
      });
    });

    it('should convert group by to vertical axis', async () => {
      await visualBuilder.setMetricsGroupByTerms('extension.raw');
      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(1);

        const xDimensionText = await lens.getDimensionTriggerText('lnsXY_xDimensionPanel', 0);
        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        expect(xDimensionText).to.be('Top 10 values of extension.raw');
        expect(yDimensionText).to.be('Count of records');
      });
    });

    it('should convert last value mode to reduced time range', async () => {
      await visualBuilder.clickPanelOptions('topN');
      await visualBuilder.setMetricsDataTimerangeMode('Last value');
      await visualBuilder.setIntervalValue('1m');
      await visualBuilder.clickDataTab('topN');
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      await lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      await testSubjects.click('indexPattern-advanced-accordion');
      const reducedTimeRange = await testSubjects.find(
        'indexPattern-dimension-reducedTimeRange > comboBoxSearchInput'
      );
      expect(await reducedTimeRange.getAttribute('value')).to.be('1 minute (1m)');
      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(1);
        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        expect(yDimensionText).to.be('Count of records last 1m');
      });
    });

    it('should convert static value to the separate layer with y dimension', async () => {
      await visualBuilder.createNewAggSeries();
      await visualBuilder.selectAggType('Static Value', 1);
      await visualBuilder.setStaticValue(10);

      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(2);
        const yDimensionText1 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        const yDimensionText2 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 1);
        expect(yDimensionText1).to.be('Count of records');
        expect(yDimensionText2).to.be('10');
      });
    });

    it('visualizes field to Lens and loads fields to the dimesion editor', async () => {
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        expect(yDimensionText).to.be('Count of records');
      });
    });

    it('navigates back to TSVB when the Back button is clicked', async () => {
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      const goBackBtn = await testSubjects.find('lnsApp_goBackToAppButton');
      await goBackBtn.click();
      await visualBuilder.checkTopNTabIsPresent();
    });

    it('should preserve app filters in lens', async () => {
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'css' });
      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');

      expect(await filterBar.hasFilter('extension', 'css')).to.be(true);
    });

    it('should preserve query in lens', async () => {
      await queryBar.setQuery('machine.os : ios');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');

      expect(await queryBar.getQueryString()).to.equal('machine.os : ios');
    });

    it('should bring the ignore global filters configured at series level over', async () => {
      await visualBuilder.clickSeriesOption();
      await visualBuilder.setIgnoreFilters(true);
      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      expect(await testSubjects.exists('lnsChangeIndexPatternIgnoringFilters')).to.be(true);
    });

    it('should bring the ignore global filters configured at panel level over', async () => {
      await visualBuilder.clickPanelOptions('topN');
      await visualBuilder.setIgnoreFilters(true);
      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      expect(await testSubjects.exists('lnsChangeIndexPatternIgnoringFilters')).to.be(true);
    });
  });
}
