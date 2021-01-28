/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const find = getService('find');
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const elasticChart = getService('elasticChart');

  describe('lens smokescreen tests', () => {
    it('should allow creation of lens xy chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'avg',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: '@message.raw',
      });

      await PageObjects.lens.switchToVisualization('lnsDatatable');
      await PageObjects.lens.removeDimension('lnsDatatable_column');
      await PageObjects.lens.switchToVisualization('bar_stacked');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await PageObjects.lens.save('Afancilenstest');

      // Ensure the visualization shows up in the visualize list, and takes
      // us back to the visualization as we configured it.
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('Afancilenstest');
      await PageObjects.lens.clickVisualizeListItemTitle('Afancilenstest');
      await PageObjects.lens.goToTimeRange();

      expect(await PageObjects.lens.getTitle()).to.eql('Afancilenstest');

      // .echLegendItem__title is the only viable way of getting the xy chart's
      // legend item(s), so we're using a class selector here.
      // 4th item is the other bucket
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(4);
    });

    it('should create an xy visualization with filters aggregation', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();
      // Change the IP field to filters
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
        operation: 'filters',
        keepOpen: true,
      });
      await PageObjects.lens.addFilterToAgg(`geo.src : CN`);

      // Verify that the field was persisted from the transition
      expect(await PageObjects.lens.getFiltersAggLabels()).to.eql([`ip : *`, `geo.src : CN`]);
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(2);
    });

    it('should transition from metric to table to metric', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('Artistpreviouslyknownaslens');
      await PageObjects.lens.clickVisualizeListItemTitle('Artistpreviouslyknownaslens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.assertMetric('Maximum of bytes', '19,986');
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      expect(await PageObjects.lens.getDatatableHeaderText()).to.eql('Maximum of bytes');
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('19,986');
      await PageObjects.lens.switchToVisualization('lnsMetric');
      await PageObjects.lens.assertMetric('Maximum of bytes', '19,986');
    });

    it('should transition from a multi-layer stacked bar to a multi-layer line chart and correctly remove all layers', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'avg',
        field: 'bytes',
      });

      await PageObjects.lens.createLayer();

      expect(await PageObjects.lens.hasChartSwitchWarning('line')).to.eql(false);

      await PageObjects.lens.switchToVisualization('line');
      await PageObjects.lens.configureDimension(
        {
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field: 'geo.src',
        },
        1
      );

      await PageObjects.lens.configureDimension(
        {
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'median',
          field: 'bytes',
        },
        1
      );

      expect(await PageObjects.lens.getLayerCount()).to.eql(2);
      await testSubjects.click('lnsLayerRemove');
      await testSubjects.click('lnsLayerRemove');
      await testSubjects.existOrFail('empty-workspace');
    });

    it('should edit settings of xy line chart', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();
      await testSubjects.click('lnsXY_splitDimensionPanel > indexPattern-dimension-remove');
      await PageObjects.lens.switchToVisualization('line');
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'max',
        field: 'memory',
        keepOpen: true,
      });
      await PageObjects.lens.editDimensionLabel('Test of label');
      await PageObjects.lens.editDimensionFormat('Percent');
      await PageObjects.lens.editDimensionColor('#ff0000');
      await PageObjects.lens.editMissingValues('Linear');

      await PageObjects.lens.assertMissingValues('Linear');

      await PageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      await PageObjects.lens.assertColor('#ff0000');

      await testSubjects.existOrFail('indexPattern-dimension-formatDecimals');

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Test of label'
      );
      await PageObjects.lens.closeDimensionEditor();
    });

    it('should be able to add very long labels and still be able to remove a dimension', async () => {
      await PageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      const longLabel =
        'Veryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryvery long label wrapping multiple lines';
      await PageObjects.lens.editDimensionLabel(longLabel);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.closeDimensionEditor();

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        longLabel
      );
      expect(
        await testSubjects.isDisplayed('lnsXY_yDimensionPanel >  indexPattern-dimension-remove')
      ).to.equal(true);
      await PageObjects.lens.removeDimension('lnsXY_yDimensionPanel');
      await testSubjects.missingOrFail('lnsXY_yDimensionPanel > lns-dimensionTrigger');
    });

    it('should allow creation of a multi-axis chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await elasticChart.setNewChartUiDebugFlag(true);
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('bar');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.dest',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'avg',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'cardinality',
        field: 'bytes',
        keepOpen: true,
      });

      await PageObjects.lens.changeAxisSide('right');

      await PageObjects.lens.closeDimensionEditor();

      await PageObjects.header.waitUntilLoadingHasFinished();

      const data = await PageObjects.lens.getCurrentChartDebugState();
      expect(data?.axes?.y.length).to.eql(2);
      expect(data?.axes?.y.some(({ position }) => position === 'right')).to.eql(true);
    });

    it('should show value labels on bar charts when enabled', async () => {
      // enable value labels
      await PageObjects.lens.toggleToolbarPopover('lnsValuesButton');
      await testSubjects.click('lnsXY_valueLabels_inside');

      await PageObjects.header.waitUntilLoadingHasFinished();

      // check for value labels
      let data = await PageObjects.lens.getCurrentChartDebugState();
      expect(data?.bars?.[0].labels).not.to.eql(0);

      // switch to stacked bar chart
      await PageObjects.lens.switchToVisualization('bar_stacked');
      await PageObjects.header.waitUntilLoadingHasFinished();

      // check for value labels
      data = await PageObjects.lens.getCurrentChartDebugState();
      expect(data?.bars?.[0].labels.length).to.eql(0);
    });

    it('should override axis title', async () => {
      const axisTitle = 'overridden axis';
      await PageObjects.lens.toggleToolbarPopover('lnsLeftAxisButton');
      await testSubjects.setValue('lnsyLeftAxisTitle', axisTitle, {
        clearWithKeyboard: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();

      let data = await PageObjects.lens.getCurrentChartDebugState();
      expect(data?.axes?.y?.[0].title).to.eql(axisTitle);

      // hide the gridlines
      await testSubjects.click('lnsshowyLeftAxisGridlines');
      await PageObjects.header.waitUntilLoadingHasFinished();

      data = await PageObjects.lens.getCurrentChartDebugState();
      expect(data?.axes?.y?.[0].gridlines.length).to.eql(0);
    });

    it('should transition from a multi-layer stacked bar to donut chart using suggestions', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.dest',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'avg',
        field: 'bytes',
      });

      await PageObjects.lens.createLayer();

      await PageObjects.lens.configureDimension(
        {
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field: 'geo.src',
        },
        1
      );

      await PageObjects.lens.configureDimension(
        {
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'avg',
          field: 'bytes',
        },
        1
      );

      await PageObjects.lens.save('twolayerchart');
      await testSubjects.click('lnsSuggestion-asDonut > lnsSuggestion');

      expect(await PageObjects.lens.getLayerCount()).to.eql(1);
      expect(await PageObjects.lens.getDimensionTriggerText('lnsPie_sliceByDimensionPanel')).to.eql(
        'Top values of geo.dest'
      );
      expect(await PageObjects.lens.getDimensionTriggerText('lnsPie_sizeByDimensionPanel')).to.eql(
        'Average of bytes'
      );
    });

    it('should transition from line chart to donut chart and to bar chart', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();
      expect(await PageObjects.lens.hasChartSwitchWarning('donut')).to.eql(true);
      await PageObjects.lens.switchToVisualization('donut');

      expect(await PageObjects.lens.getTitle()).to.eql('lnsXYvis');
      expect(await PageObjects.lens.getDimensionTriggerText('lnsPie_sliceByDimensionPanel')).to.eql(
        'Top values of ip'
      );
      expect(await PageObjects.lens.getDimensionTriggerText('lnsPie_sizeByDimensionPanel')).to.eql(
        'Average of bytes'
      );

      expect(await PageObjects.lens.hasChartSwitchWarning('bar')).to.eql(false);
      await PageObjects.lens.switchToVisualization('bar');
      expect(await PageObjects.lens.getTitle()).to.eql('lnsXYvis');
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
        'Top values of ip'
      );
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Average of bytes'
      );
    });

    it('should transition from bar chart to line chart using layer chart switch', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchLayerSeriesType('line');
      expect(await PageObjects.lens.getTitle()).to.eql('lnsXYvis');
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
        '@timestamp'
      );
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Average of bytes'
      );
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_splitDimensionPanel')).to.eql(
        'Top values of ip'
      );
    });

    it('should transition from pie chart to treemap chart', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsPieVis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsPieVis');
      await PageObjects.lens.goToTimeRange();
      expect(await PageObjects.lens.hasChartSwitchWarning('treemap')).to.eql(false);
      await PageObjects.lens.switchToVisualization('treemap');
      expect(
        await PageObjects.lens.getDimensionTriggersTexts('lnsPie_groupByDimensionPanel')
      ).to.eql(['Top values of geo.dest', 'Top values of geo.src']);
      expect(await PageObjects.lens.getDimensionTriggerText('lnsPie_sizeByDimensionPanel')).to.eql(
        'Average of bytes'
      );
    });

    it('should create a pie chart and switch to datatable', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('pie');
      await PageObjects.lens.configureDimension({
        dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsPie_sizeByDimensionPanel > lns-empty-dimension',
        operation: 'avg',
        field: 'bytes',
      });

      expect(await PageObjects.lens.hasChartSwitchWarning('lnsDatatable')).to.eql(false);
      await PageObjects.lens.switchToVisualization('lnsDatatable');

      expect(await PageObjects.lens.getDatatableHeaderText()).to.eql('@timestamp per 3 hours');
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('2015-09-20 00:00');
      expect(await PageObjects.lens.getDatatableHeaderText(1)).to.eql('Average of bytes');
      expect(await PageObjects.lens.getDatatableCellText(0, 1)).to.eql('6,011.351');
    });

    it('should create a valid XY chart with references', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
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

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'cumulative_sum',
        keepOpen: true,
      });
      await PageObjects.lens.configureReference({
        field: 'Records',
      });
      await PageObjects.lens.closeDimensionEditor();

      // Two Y axes that are both valid
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(2);
    });

    /**
     * The edge cases are:
     *
     * 1. Showing errors when creating a partial configuration
     * 2. Being able to drag in a new field while in partial config
     * 3. Being able to switch charts while in partial config
     */
    it('should handle edge cases in reference-based operations', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'cumulative_sum',
      });
      expect(await PageObjects.lens.getErrorCount()).to.eql(1);

      await PageObjects.lens.removeDimension('lnsXY_xDimensionPanel');
      expect(await PageObjects.lens.getErrorCount()).to.eql(2);

      await PageObjects.lens.dragFieldToDimensionTrigger(
        '@timestamp',
        'lnsXY_xDimensionPanel > lns-empty-dimension'
      );
      expect(await PageObjects.lens.getErrorCount()).to.eql(1);

      expect(await PageObjects.lens.hasChartSwitchWarning('lnsDatatable')).to.eql(false);
      await PageObjects.lens.switchToVisualization('lnsDatatable');

      expect(await PageObjects.lens.getDimensionTriggerText('lnsDatatable_metrics')).to.eql(
        'Cumulative sum of (incomplete)'
      );
    });

    it('should keep the field selection while transitioning to every reference-based operation', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'avg',
        field: 'bytes',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'counter_rate',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'cumulative_sum',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'derivative',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'moving_average',
      });

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Moving average of Sum of bytes'
      );
    });

    it('should transition from unique count to last value', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'cardinality',
        field: 'ip',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'last_value',
        field: 'bytes',
        isPreviousIncompatible: true,
      });

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Last value of bytes'
      );
    });

    it('should allow to change index pattern', async () => {
      await PageObjects.lens.switchFirstLayerIndexPattern('log*');
      expect(await PageObjects.lens.getFirstLayerIndexPattern()).to.equal('log*');
    });

    it('should show a download button only when the configuration is valid', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('pie');
      await PageObjects.lens.configureDimension({
        dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      // incomplete configuration should not be downloadable
      expect(await testSubjects.isEnabled('lnsApp_downloadCSVButton')).to.eql(false);

      await PageObjects.lens.configureDimension({
        dimension: 'lnsPie_sizeByDimensionPanel > lns-empty-dimension',
        operation: 'avg',
        field: 'bytes',
      });
      expect(await testSubjects.isEnabled('lnsApp_downloadCSVButton')).to.eql(true);
    });
  });
}
