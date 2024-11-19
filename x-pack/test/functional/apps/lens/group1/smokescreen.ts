/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { range } from 'lodash';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens } = getPageObjects(['visualize', 'lens']);
  const find = getService('find');
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const elasticChart = getService('elasticChart');
  const filterBar = getService('filterBar');
  const retry = getService('retry');
  const config = getService('config');

  describe('lens smokescreen tests', () => {
    it('should allow creation of lens xy chart', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

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

      await lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: '@message.raw',
      });

      await lens.switchToVisualization('lnsDatatable');
      await lens.removeDimension('lnsDatatable_rows');
      await lens.switchToVisualization('area');

      await lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await lens.save('Afancilenstest');

      // Ensure the visualization shows up in the visualize list, and takes
      // us back to the visualization as we configured it.
      await visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('Afancilenstest');
      await lens.clickVisualizeListItemTitle('Afancilenstest');

      await lens.waitForVisualization('xyVisChart');

      expect(await lens.getTitle()).to.eql('Afancilenstest');

      // .echLegendItem__title is the only viable way of getting the xy chart's
      // legend item(s), so we're using a class selector here.
      // 4th item is the other bucket
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(4);
    });

    it('should create an xy visualization with filters aggregation', async () => {
      await visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await lens.clickVisualizeListItemTitle('lnsXYvis');

      // Change the IP field to filters
      await lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
        operation: 'filters',
        keepOpen: true,
      });
      await lens.addFilterToAgg(`geo.src : CN`);
      await lens.waitForVisualization('xyVisChart');

      // Verify that the field was persisted from the transition
      expect(await lens.getFiltersAggLabels()).to.eql([`"ip" : *`, `geo.src : CN`]);
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(2);
    });

    it('should transition from metric to table to metric', async () => {
      await visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('Artistpreviouslyknownaslens');
      await lens.clickVisualizeListItemTitle('Artistpreviouslyknownaslens');

      await lens.assertLegacyMetric('Maximum of bytes', '19,986');
      await lens.switchToVisualization('lnsDatatable');
      expect(await lens.getDatatableHeaderText()).to.eql('Maximum of bytes');
      expect(await lens.getDatatableCellText(0, 0)).to.eql('19,986');
      await lens.switchToVisualization('lnsLegacyMetric');
      await lens.assertLegacyMetric('Maximum of bytes', '19,986');
    });

    it('should transition from a multi-layer stacked bar to a multi-layer line chart and correctly remove all layers', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

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

      expect(await lens.getLayerType(0)).to.eql('Line');
      // expect first layer to be line, second layer to be bar chart
      expect(await lens.getLayerType(1)).to.eql('Bar');
      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'machine.ram',
      });

      expect(await lens.getLayerCount()).to.eql(2);
      await lens.removeLayer();
      await lens.removeLayer();
      await testSubjects.existOrFail('workspace-drag-drop-prompt');
    });

    it('should transition selected layer in a multi layer bar using layer chart switch', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

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

      await lens.createLayer('data', undefined, 'bar');
      expect(await lens.getLayerType(1)).to.eql('Bar');

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'machine.ram',
      });

      // only changes one layer for compatible chart
      await lens.switchToVisualization('line', undefined, 1);
      expect(await lens.getLayerType(0)).to.eql('Bar');
      expect(await lens.getLayerType(1)).to.eql('Line');

      // generates new one layer chart based on selected layer
      await lens.switchToVisualization('pie', undefined, 1);
      expect(await lens.getLayerType(0)).to.eql('Pie');
      const sliceByText = await lens.getDimensionTriggerText('lnsPie_sliceByDimensionPanel');
      const sizeByText = await lens.getDimensionTriggerText('lnsPie_sizeByDimensionPanel');
      expect(sliceByText).to.be('Top 5 values of geo.src');
      expect(sizeByText).to.be('Average of machine.ram');
    });

    it('should edit settings of xy line chart', async () => {
      await visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await lens.clickVisualizeListItemTitle('lnsXYvis');

      await lens.removeDimension('lnsXY_splitDimensionPanel');
      await lens.switchToVisualization('line');
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'max',
        field: 'memory',
        keepOpen: true,
      });
      await lens.editDimensionLabel('Test of label');
      await lens.editDimensionFormat('Percent');
      await lens.editDimensionColor('#ff0000');
      await lens.openVisualOptions();

      await lens.setCurvedLines('CURVE_MONOTONE_X');
      await lens.editMissingValues('Linear');

      await lens.assertMissingValues('Linear');

      await lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      await lens.assertColor('#ff0000');

      await testSubjects.existOrFail('indexPattern-dimension-formatDecimals');

      await lens.closeDimensionEditor();

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql('Test of label');
    });

    it('should not show static value tab for data layers', async () => {
      await lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      // Quick functions and Formula tabs should be visible
      expect(await testSubjects.exists('lens-dimensionTabs-quickFunctions')).to.eql(true);
      expect(await testSubjects.exists('lens-dimensionTabs-formula')).to.eql(true);
      // Static value tab should not be visible
      expect(await testSubjects.exists('lens-dimensionTabs-static_value')).to.eql(false);

      await lens.closeDimensionEditor();
    });

    it('should be able to add very long labels and still be able to remove a dimension', async () => {
      await lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      const longLabel =
        'Veryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryvery long label wrapping multiple lines';
      await lens.editDimensionLabel(longLabel);
      await lens.waitForVisualization('xyVisChart');
      await lens.closeDimensionEditor();

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(longLabel);
      expect(await lens.canRemoveDimension('lnsXY_yDimensionPanel')).to.equal(true);
      await lens.removeDimension('lnsXY_yDimensionPanel');
      await testSubjects.missingOrFail('lnsXY_yDimensionPanel > lns-dimensionTrigger');
    });

    it('should allow creation of a multi-axis chart and switching multiple times', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await elasticChart.setNewChartUiDebugFlag(true);

      await lens.switchToVisualization('bar');

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.dest',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'unique_count',
        field: 'bytes',
        keepOpen: true,
      });

      await lens.changeAxisSide('right');
      let data = await lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.axes?.y.length).to.eql(2);
      expect(data?.axes?.y.some(({ position }) => position === 'right')).to.eql(true);

      await lens.changeAxisSide('left');
      data = await lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.axes?.y.length).to.eql(1);
      expect(data?.axes?.y.some(({ position }) => position === 'right')).to.eql(false);

      await lens.changeAxisSide('right');
      await lens.waitForVisualization('xyVisChart');

      await lens.closeDimensionEditor();
    });

    it('should show value labels on bar charts when enabled', async () => {
      // enable value labels
      await lens.openTextOptions();
      await testSubjects.click('lns_valueLabels_inside');

      // check for value labels
      const data = await lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.bars?.[0].labels).not.to.eql(0);
    });

    it('should override axis title', async () => {
      const axisTitle = 'overridden axis';
      await lens.toggleToolbarPopover('lnsLeftAxisButton');
      await testSubjects.setValue('lnsyLeftAxisTitle', axisTitle, {
        clearWithKeyboard: true,
      });

      let data = await lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.axes?.y?.[1].title).to.eql(axisTitle);

      // hide the gridlines
      await testSubjects.click('lnsshowyLeftAxisGridlines');

      data = await lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.axes?.y?.[1].gridlines.length).to.eql(0);
    });

    it('should transition from a multi-layer stacked bar to treemap chart using suggestions', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.dest',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.createLayer();

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.save('twolayerchart');
      await testSubjects.click('lnsSuggestion-treemap > lnsSuggestion');

      expect(await lens.getLayerCount()).to.eql(1);
      expect(await lens.getDimensionTriggerText('lnsPie_groupByDimensionPanel')).to.eql(
        'Top 5 values of geo.dest'
      );
      expect(await lens.getDimensionTriggerText('lnsPie_sizeByDimensionPanel')).to.eql(
        'Average of bytes'
      );
    });

    it('should transition from line chart to pie chart and to bar chart', async () => {
      await visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await lens.clickVisualizeListItemTitle('lnsXYvis');

      expect(await lens.hasChartSwitchWarning('pie')).to.eql(true);
      await lens.switchToVisualization('pie');

      expect(await lens.getTitle()).to.eql('lnsXYvis');
      expect(await lens.getDimensionTriggerText('lnsPie_sliceByDimensionPanel')).to.eql(
        'Top 3 values of ip'
      );
      expect(await lens.getDimensionTriggerText('lnsPie_sizeByDimensionPanel')).to.eql(
        'Average of bytes'
      );

      expect(await lens.hasChartSwitchWarning('bar')).to.eql(false);
      await lens.switchToVisualization('bar');
      expect(await lens.getTitle()).to.eql('lnsXYvis');
      expect(await lens.getDimensionTriggerText('lnsXY_splitDimensionPanel')).to.eql(
        'Top 3 values of ip'
      );
      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Average of bytes'
      );
    });

    it('should transition from bar chart to line chart', async () => {
      await visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await lens.clickVisualizeListItemTitle('lnsXYvis');

      await lens.switchToVisualization('line');
      expect(await lens.getTitle()).to.eql('lnsXYvis');
      expect(await lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql('@timestamp');
      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Average of bytes'
      );
      expect(await lens.getDimensionTriggerText('lnsXY_splitDimensionPanel')).to.eql(
        'Top 3 values of ip'
      );
    });

    it('should transition from pie chart to treemap chart', async () => {
      await visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsPieVis');
      await lens.clickVisualizeListItemTitle('lnsPieVis');

      expect(await lens.hasChartSwitchWarning('treemap')).to.eql(false);
      await lens.switchToVisualization('treemap');
      expect(await lens.getDimensionTriggersTexts('lnsPie_groupByDimensionPanel')).to.eql([
        'Top 7 values of geo.dest',
        'Top 3 values of geo.src',
      ]);
      expect(await lens.getDimensionTriggerText('lnsPie_sizeByDimensionPanel')).to.eql(
        'Average of bytes'
      );
    });

    it('should create a pie chart and switch to datatable', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.switchToVisualization('pie');
      await lens.configureDimension({
        dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
        disableEmptyRows: true,
      });

      await lens.configureDimension({
        dimension: 'lnsPie_sizeByDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      expect(await lens.hasChartSwitchWarning('lnsDatatable')).to.eql(false);
      await lens.switchToVisualization('lnsDatatable');

      expect(await lens.getDatatableHeaderText()).to.eql('@timestamp per 3 hours');
      expect(await lens.getDatatableCellText(0, 0)).to.eql('2015-09-20 00:00');
      expect(await lens.getDatatableHeaderText(1)).to.eql('Average of bytes');
      expect(await lens.getDatatableCellText(0, 1)).to.eql('6,011.351');
    });

    it('should create a heatmap chart and transition to barchart', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.switchToVisualization('heatmap', 'heat');

      await lens.configureDimension({
        dimension: 'lnsHeatmap_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await lens.configureDimension({
        dimension: 'lnsHeatmap_yDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.dest',
      });
      await lens.configureDimension({
        dimension: 'lnsHeatmap_cellPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      expect(await lens.hasChartSwitchWarning('bar')).to.eql(false);
      await lens.switchToVisualization('bar');
      expect(await lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql('@timestamp');
      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Average of bytes'
      );
    });

    it('should create a valid XY chart with references', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

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

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'cumulative_sum',
        keepOpen: true,
      });
      await lens.configureReference({
        field: 'Records',
      });
      await lens.closeDimensionEditor();

      // Two Y axes that are both valid
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(2);
    });

    it('should allow formatting on references', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.switchToVisualization('lnsDatatable');

      await lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
        disableEmptyRows: true,
      });
      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'moving_average',
        keepOpen: true,
      });
      await lens.configureReference({
        operation: 'sum',
        field: 'bytes',
      });
      await lens.editDimensionFormat('Number');
      await lens.closeDimensionEditor();

      await lens.waitForVisualization();

      const values = await Promise.all(
        range(0, 6).map((index) => lens.getDatatableCellText(index, 1))
      );
      expect(values).to.eql([
        '-',
        '222,420.00',
        '702,050.00',
        '1,879,613.33',
        '3,482,256.25',
        '4,359,953.00',
      ]);
    });

    /**
     * The edge cases are:
     *
     * 1. Showing errors when creating a partial configuration
     * 2. Being able to drag in a new field while in partial config
     * 3. Being able to switch charts while in partial config
     */
    it('should handle edge cases in reference-based operations', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'cumulative_sum',
      });
      expect(await lens.getWorkspaceErrorCount()).to.eql(1);

      await lens.removeDimension('lnsXY_xDimensionPanel');
      expect(await lens.getWorkspaceErrorCount()).to.eql(2);

      await lens.dragFieldToDimensionTrigger(
        '@timestamp',
        'lnsXY_xDimensionPanel > lns-empty-dimension'
      );
      expect(await lens.getWorkspaceErrorCount()).to.eql(1);

      expect(await lens.hasChartSwitchWarning('lnsDatatable')).to.eql(false);
      await lens.switchToVisualization('lnsDatatable');

      expect(await lens.getDimensionTriggerText('lnsDatatable_metrics')).to.eql(
        'Cumulative sum of (incomplete)'
      );
    });

    it('should keep the field selection while transitioning to every reference-based operation', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

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
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'counter_rate',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'cumulative_sum',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'differences',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'moving_average',
      });

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Moving average of Sum of bytes'
      );
    });

    it('should not leave an incomplete column in the visualization config with field-based operation', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'min',
      });

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(undefined);
    });

    it('should revert to previous configuration and not leave an incomplete column in the visualization config with reference-based operations', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'moving_average',
        field: 'Records',
      });

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Moving average of Count of records'
      );

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'median',
        isPreviousIncompatible: true,
        keepOpen: true,
      });

      expect(await lens.isDimensionEditorOpen()).to.eql(true);

      await lens.closeDimensionEditor();

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Moving average of Count of records'
      );
    });

    it('should transition from unique count to last value', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'unique_count',
        field: 'ip',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'last_value',
        field: 'bytes',
        isPreviousIncompatible: true,
      });

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Last value of bytes'
      );
    });

    it('should allow to change index pattern', async () => {
      let indexPatternString;
      if (config.get('esTestCluster.ccs')) {
        indexPatternString = 'ftr-remote:log*';
      } else {
        indexPatternString = 'log*';
      }
      await lens.switchFirstLayerIndexPattern(indexPatternString);
      expect(await lens.getFirstLayerIndexPattern()).to.equal(indexPatternString);
    });

    it('should allow filtering by legend on an xy chart', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

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

      await lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'extension.raw',
      });

      await lens.filterLegend('jpg');
      const hasExtensionFilter = await filterBar.hasFilter('extension.raw', 'jpg');
      expect(hasExtensionFilter).to.be(true);

      await filterBar.removeFilter('extension.raw');
    });

    it('should allow filtering by legend on a pie chart', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.switchToVisualization('pie');

      await lens.configureDimension({
        dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'extension.raw',
      });

      await lens.configureDimension({
        dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'agent.raw',
      });

      await lens.configureDimension({
        dimension: 'lnsPie_sizeByDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.filterLegend('jpg');
      const hasExtensionFilter = await filterBar.hasFilter('extension.raw', 'jpg');
      expect(hasExtensionFilter).to.be(true);

      await filterBar.removeFilter('extension.raw');
    });

    it('should show visual options button group for a pie chart', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.switchToVisualization('pie');

      const hasVisualOptionsButton = await lens.hasVisualOptionsButton();
      expect(hasVisualOptionsButton).to.be(true);

      await lens.openVisualOptions();
      await retry.try(async () => {
        expect(await lens.hasEmptySizeRatioButtonGroup()).to.be(true);
      });
    });

    it('should allow edit meta-data for Lens chart on listing page', async () => {
      await visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('Afancilenstest');
      await listingTable.inspectVisualization();
      await listingTable.editVisualizationDetails({
        title: 'Anewfancilenstest',
        description: 'new description',
      });
      await listingTable.searchForItemWithName('Anewfancilenstest');
      await listingTable.expectItemsCount('visualize', 1);
    });

    it('should correctly optimize multiple percentile metrics', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      for (const percentileValue of [90, 95.5, 99.9]) {
        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'percentile',
          field: 'bytes',
          keepOpen: true,
        });

        await retry.try(async () => {
          const value = `${percentileValue}`;
          // Can not use testSubjects because data-test-subj is placed range input and number input
          const percentileInput = await lens.getNumericFieldReady(
            'lns-indexPattern-percentile-input'
          );
          await percentileInput.type(value);

          const attrValue = await percentileInput.getAttribute('value');
          if (attrValue !== value) {
            throw new Error(`layerPanelTopHitsSize not set to ${value}`);
          }
        });

        await lens.closeDimensionEditor();
      }
      await lens.waitForVisualization('xyVisChart');
      expect(await lens.getWorkspaceErrorCount()).to.eql(0);
    });
  });
}
