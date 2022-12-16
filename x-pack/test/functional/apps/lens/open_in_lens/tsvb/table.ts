/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  describe('Table', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
    });

    beforeEach(async () => {
      await visualBuilder.resetPage();
      await visualBuilder.clickTable();
      await header.waitUntilLoadingHasFinished();
      await visualBuilder.checkTableTabIsPresent();
      await visualBuilder.selectGroupByField('machine.os.raw');
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

    it('should not allow converting sibling pipeline aggregations', async () => {
      await visualBuilder.createNewAgg();

      await visualBuilder.selectAggType('Overall Average', 1);
      await visualBuilder.setFieldForAggregation('Count', 1);
      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.be(false);
    });

    it('should not allow converting parent pipeline aggregations', async () => {
      await visualBuilder.clickPanelOptions('table');
      await visualBuilder.setMetricsDataTimerangeMode('Last value');
      await visualBuilder.clickDataTab('table');
      await visualBuilder.createNewAgg();

      await visualBuilder.selectAggType('Cumulative Sum', 1);
      await visualBuilder.setFieldForAggregation('Count', 1);
      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.be(false);
    });

    it('should not allow converting not valid aggregation function', async () => {
      await visualBuilder.clickSeriesOption();
      await visualBuilder.setFieldForAggregateBy('clientip');
      await visualBuilder.setFunctionForAggregateFunction('Cumulative Sum');
      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.be(false);
    });

    it('should not allow converting series with different aggregation function or aggregation by', async () => {
      await visualBuilder.createNewAggSeries();
      await visualBuilder.selectAggType('Static Value', 1);
      await visualBuilder.setStaticValue(10);
      await header.waitUntilLoadingHasFinished();
      await visualBuilder.clickSeriesOption();
      await visualBuilder.setFieldForAggregateBy('bytes');
      await visualBuilder.setFunctionForAggregateFunction('Sum');
      await header.waitUntilLoadingHasFinished();
      await visualBuilder.clickSeriesOption(1);
      await visualBuilder.setFieldForAggregateBy('bytes');
      await visualBuilder.setFunctionForAggregateFunction('Min');
      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.be(false);
    });

    it('should allow converting a count aggregation', async () => {
      expect(await visualize.hasNavigateToLensButton()).to.be(true);
    });

    it('should convert last value mode to reduced time range', async () => {
      await visualBuilder.clickPanelOptions('table');
      await visualBuilder.setMetricsDataTimerangeMode('Last value');
      await visualBuilder.setIntervalValue('1m');
      await visualBuilder.clickDataTab('table');
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('lnsDataTable');
      await lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger');
      await testSubjects.click('indexPattern-advanced-accordion');
      const reducedTimeRange = await testSubjects.find('indexPattern-dimension-reducedTimeRange');
      expect(await reducedTimeRange.getVisibleText()).to.be('1 minute (1m)');
      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(1);
        const metricDimensionText = await lens.getDimensionTriggerText('lnsDatatable_metrics', 0);
        expect(metricDimensionText).to.be('Count of records last 1m');
      });
    });

    it('should convert static value to the metric dimension', async () => {
      await visualBuilder.createNewAggSeries();
      await visualBuilder.selectAggType('Static Value', 1);
      await visualBuilder.setStaticValue(10);

      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('lnsDataTable');
      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(1);
        const metricDimensionText1 = await lens.getDimensionTriggerText('lnsDatatable_metrics', 0);
        const metricDimensionText2 = await lens.getDimensionTriggerText('lnsDatatable_metrics', 1);
        expect(metricDimensionText1).to.be('Count of records');
        expect(metricDimensionText2).to.be('10');
      });
    });

    it('should convert aggregate by to split row dimension', async () => {
      await visualBuilder.clickSeriesOption();
      await visualBuilder.setFieldForAggregateBy('clientip');
      await visualBuilder.setFunctionForAggregateFunction('Sum');
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('lnsDataTable');
      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(1);
        const splitRowsText1 = await lens.getDimensionTriggerText('lnsDatatable_rows', 0);
        const splitRowsText2 = await lens.getDimensionTriggerText('lnsDatatable_rows', 1);
        expect(splitRowsText1).to.be('Top 10 values of machine.os.raw');
        expect(splitRowsText2).to.be('Top 10 values of clientip');
      });

      await lens.openDimensionEditor('lnsDatatable_rows > lns-dimensionTrigger', 0, 1);
      const collapseBy = await testSubjects.find('indexPattern-collapse-by');
      expect(await collapseBy.getAttribute('value')).to.be('sum');
    });

    it('should convert group by field with custom label', async () => {
      await visualBuilder.setColumnLabelValue('test');
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('lnsDataTable');
      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(1);
        const splitRowsText = await lens.getDimensionTriggerText('lnsDatatable_rows', 0);
        expect(splitRowsText).to.be('test');
      });
    });

    it('should convert color ranges', async () => {
      await visualBuilder.clickSeriesOption();

      await visualBuilder.setColorRuleOperator('>= greater than or equal');
      await visualBuilder.setColorRuleValue(10);
      await visualBuilder.setColorPickerValue('#54B399');

      await visualBuilder.createColorRule(1);

      await visualBuilder.setColorRuleOperator('>= greater than or equal');
      await visualBuilder.setColorRuleValue(100, 1);
      await visualBuilder.setColorPickerValue('#54A000', 1);

      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisulization();

      await lens.waitForVisualization('lnsDataTable');
      await retry.try(async () => {
        const closePalettePanels = await testSubjects.findAll(
          'lns-indexPattern-PalettePanelContainerBack'
        );
        if (closePalettePanels.length) {
          await lens.closePalettePanel();
          await lens.closeDimensionEditor();
        }

        await lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger');

        await lens.openPalettePanel('lnsDatatable');
        const colorStops = await lens.getPaletteColorStops();

        expect(colorStops).to.eql([
          { stop: '10', color: 'rgba(84, 179, 153, 1)' },
          { stop: '100', color: 'rgba(84, 160, 0, 1)' },
          { stop: '', color: undefined },
        ]);
      });
    });
  });
}
