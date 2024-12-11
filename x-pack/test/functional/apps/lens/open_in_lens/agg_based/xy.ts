/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, visEditor, lens, timePicker, header, visChart } = getPageObjects([
    'visualize',
    'lens',
    'visEditor',
    'timePicker',
    'header',
    'visChart',
  ]);

  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('XY', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
    });

    beforeEach(async () => {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickLineChart();
      await visualize.clickNewSearch();
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should show the "Edit Visualization in Lens" menu item', async () => {
      expect(await visualize.hasNavigateToLensButton()).to.eql(true);
    });

    it('should not allow converting if dot size aggregation is defined', async () => {
      await visEditor.clickBucket('Dot size', 'metrics');
      await visEditor.selectAggregation('Max', 'metrics');
      await visEditor.selectField('memory', 'metrics');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.eql(false);
    });

    it('should not allow converting if split chart is defined', async () => {
      await visEditor.clickBucket('Split chart');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.eql(false);
    });

    it('should not allow converting if more than one axis left/right/top/bottom are defined', async () => {
      await visEditor.clickBucket('Y-axis', 'metrics');
      await visEditor.selectAggregation('Max', 'metrics');
      await visEditor.selectField('memory', 'metrics');
      await visEditor.clickMetricsAndAxes();
      await visEditor.clickAddAxis();
      await visEditor.toggleAccordion('visEditorSeriesAccordion2');
      await visEditor.setSeriesAxis(1, 'ValueAxis-2');
      await visEditor.clickYAxisOptions('ValueAxis-1');
      await visEditor.selectYAxisPosition('ValueAxis-1', 'left');
      await visEditor.clickYAxisOptions('ValueAxis-2');
      await visEditor.selectYAxisPosition('ValueAxis-2', 'left');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.eql(false);
    });

    it('should not allow converting if several split series are defined', async () => {
      await visEditor.clickBucket('Split series');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await visEditor.clickBucket('Split series');
      await visEditor.selectAggregation('Date histogram', 'buckets', false, 1);
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.eql(false);
    });

    it('should not allow converting if sibling pipeline agg and split series are defined', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Max Bucket', 'metrics');
      await visEditor.clickBucket('Split series');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.eql(false);
    });

    it('should not allow converting of unsupported aggregation', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Serial diff', 'metrics');
      await visEditor.clickBucket('Split series');
      await visEditor.selectAggregation('Date histogram');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();
      const button = await testSubjects.exists('visualizeEditInLensButton');
      expect(button).to.eql(false);
    });

    it('should convert in different layers if metrics have differents chart types', async () => {
      await visEditor.clickBucket('Y-axis', 'metrics');
      await visEditor.selectAggregation('Max', 'metrics');
      await visEditor.selectField('memory', 'metrics');
      await visEditor.clickMetricsAndAxes();
      await visEditor.toggleAccordion('visEditorSeriesAccordion1');
      await visEditor.setSeriesType(0, 'area');
      await visEditor.toggleAccordion('visEditorSeriesAccordion2');
      await visEditor.setSeriesType(1, 'histogram');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(2);
        const layerChartSwitches = await testSubjects.findAll('lnsChartSwitchPopover');
        expect(layerChartSwitches.length).to.be(2);
        expect(await layerChartSwitches[0].getVisibleText()).to.be('Area');
        expect(await layerChartSwitches[1].getVisibleText()).to.be('Bar');
        const yDimensionText1 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        const yDimensionText2 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 1);
        expect(yDimensionText1).to.be('Count');
        expect(yDimensionText2).to.be('Max memory');
      });
    });

    it('should convert in one layer if metrics have the same chart type', async () => {
      await visEditor.clickBucket('Y-axis', 'metrics');
      await visEditor.selectAggregation('Max', 'metrics');
      await visEditor.selectField('memory', 'metrics');
      await visEditor.clickMetricsAndAxes();
      await visEditor.toggleAccordion('visEditorSeriesAccordion1');
      await visEditor.setSeriesType(0, 'histogram');
      await visEditor.toggleAccordion('visEditorSeriesAccordion2');
      await visEditor.setSeriesType(1, 'histogram');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);
        const layerChartSwitches = await testSubjects.findAll('lnsChartSwitchPopover');
        expect(layerChartSwitches.length).to.be(1);
        expect(await layerChartSwitches[0].getVisibleText()).to.be('Bar');
        const yDimensionText1 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        const yDimensionText2 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 1);
        expect(yDimensionText1).to.be('Count');
        expect(yDimensionText2).to.be('Max memory');
      });
    });

    it('should convert parent pipeline aggregation', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Cumulative sum', 'metrics');
      await visEditor.clickBucket('Split series');
      await visEditor.selectAggregation('Date histogram');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);
        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        const splitText = await lens.getDimensionTriggerText('lnsXY_splitDimensionPanel', 0);
        expect(yDimensionText).to.be('Cumulative Sum of Count');
        expect(splitText).to.be('@timestamp');
      });
    });

    it('should convert sibling pipeline aggregation', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Max Bucket', 'metrics');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');

      expect(await lens.getLayerCount()).to.be(1);

      const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
      const splitText = await lens.getDimensionTriggerText('lnsXY_splitDimensionPanel', 0);

      expect(yDimensionText).to.be('Overall Max of Count');
      expect(splitText).to.be('@timestamp');

      await lens.openDimensionEditor('lnsXY_splitDimensionPanel > lns-dimensionTrigger');
      const collapseBy = await testSubjects.find('indexPattern-collapse-by');
      expect(await collapseBy.getAttribute('value')).to.be('max');
    });

    it('should draw a reference line', async () => {
      await visEditor.clickOptionsTab();
      await visEditor.toggleShowThresholdLine();
      await visEditor.clickGo();
      const line = await visChart.getReferenceLine('xyVisChart');
      expect(line?.length).to.be(1);
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(2);
        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        expect(yDimensionText).to.be('Count');
        const referenceLineDimensionText = await lens.getDimensionTriggerText(
          'lnsXY_yReferenceLineLeftPanel',
          0
        );

        expect(referenceLineDimensionText).to.be('Static value: 10');
      });
    });

    it('should convert line stacked to area stacked chart', async () => {
      await visEditor.clickMetricsAndAxes();
      await visEditor.toggleAccordion('visEditorSeriesAccordion1');
      await visEditor.setSeriesType(0, 'line');
      await visEditor.selectChartMode('stacked');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);
        const layerChartSwitches = await testSubjects.findAll('lnsChartSwitchPopover');
        expect(layerChartSwitches.length).to.be(1);
        expect(await layerChartSwitches[0].getVisibleText()).to.be('Area');
      });
    });

    it('should convert percentage charts', async () => {
      await visEditor.clickMetricsAndAxes();
      await visEditor.toggleAccordion('visEditorSeriesAccordion1');
      await visEditor.setSeriesType(0, 'area');
      await visEditor.selectChartMode('normal');
      await visEditor.clickYAxisOptions('ValueAxis-1');
      await visEditor.selectYAxisMode('percentage');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);
        const layerChartSwitches = await testSubjects.findAll('lnsChartSwitchPopover');
        expect(layerChartSwitches.length).to.be(1);
        expect(await layerChartSwitches[0].getVisibleText()).to.be('Area');
      });
    });

    it('should convert horizontal bar', async () => {
      await visEditor.clickMetricsAndAxes();
      await visEditor.toggleAccordion('visEditorSeriesAccordion1');
      await visEditor.setSeriesType(0, 'histogram');
      await visEditor.clickYAxisOptions('ValueAxis-1');
      await visEditor.selectYAxisPosition('ValueAxis-1', 'top');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);
        const layerChartSwitches = await testSubjects.findAll('lnsChartSwitchPopover');
        expect(layerChartSwitches.length).to.be(1);
        expect(await layerChartSwitches[0].getVisibleText()).to.be('Bar');
        expect(await lens.getSelectedBarOrientationSetting()).to.be('Horizontal');
      });
    });

    it('should convert y-axis positions', async () => {
      await visEditor.clickBucket('Y-axis', 'metrics');
      await visEditor.selectAggregation('Max', 'metrics');
      await visEditor.selectField('memory', 'metrics');
      await visEditor.clickMetricsAndAxes();
      await visEditor.clickAddAxis();
      await visEditor.toggleAccordion('visEditorSeriesAccordion2');
      await visEditor.setSeriesAxis(1, 'ValueAxis-2');
      await visEditor.clickYAxisOptions('ValueAxis-1');
      await visEditor.selectYAxisPosition('ValueAxis-1', 'left');
      await visEditor.clickYAxisOptions('ValueAxis-2');
      await visEditor.selectYAxisPosition('ValueAxis-2', 'right');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');

      expect(await lens.getLayerCount()).to.be(1);

      const yDimensionText1 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
      const yDimensionText2 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 1);
      expect(yDimensionText1).to.be('Count');
      expect(yDimensionText2).to.be('Max memory');

      await lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      let axisPosition = await lens.getSelectedAxisSide();
      expect(axisPosition).to.be('Left');
      await lens.closeDimensionEditor();

      await lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger', 0, 1);
      axisPosition = await lens.getSelectedAxisSide();
      expect(axisPosition).to.be('Right');
    });

    it('should convert split series', async () => {
      await visEditor.clickBucket('Split series');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await header.waitUntilLoadingHasFinished();
      await visEditor.clickGo();
      const expectedData = await visChart.getLegendEntriesXYCharts('xyVisChart');

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      const data = await lens.getCurrentChartDebugState('xyVisChart');
      await retry.try(async () => {
        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        expect(yDimensionText).to.be('Count');
        const splitDimensionText = await lens.getDimensionTriggerText(
          'lnsXY_splitDimensionPanel',
          0
        );
        expect(splitDimensionText).to.be('machine.os.raw: Descending');
      });
      expect(data?.legend?.items.map((item) => item.name)).to.eql(expectedData);
    });

    it('should convert x-axis', async () => {
      await visEditor.clickBucket('X-axis');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();
      const expectedData = await visChart.getLegendEntriesXYCharts('xyVisChart');
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      const data = await lens.getCurrentChartDebugState('xyVisChart');
      await retry.try(async () => {
        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        expect(yDimensionText).to.be('Count');
        const xDimensionText = await lens.getDimensionTriggerText('lnsXY_xDimensionPanel', 0);
        expect(xDimensionText).to.be('machine.os.raw: Descending');
      });
      expect(data?.legend?.items.map((item) => item.name)).to.eql(expectedData);
    });

    it('should convert correctly percentiles with decimals', async () => {
      await visEditor.clickBucket('Y-axis', 'metrics');
      await visEditor.selectAggregation('Percentiles', 'metrics');
      await visEditor.selectField('memory', 'metrics');
      await visEditor.setPercentileValue('99.99', 6);
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      expect(await lens.getWorkspaceErrorCount()).to.eql(0);
    });
  });
}
