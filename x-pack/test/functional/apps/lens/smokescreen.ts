/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens']);
  const find = getService('find');
  const listingTable = getService('listingTable');

  async function assertExpectedMetric(title: string, metric: string) {
    await PageObjects.lens.assertExactText('[data-test-subj="lns_metric_title"]', title);
    await PageObjects.lens.assertExactText('[data-test-subj="lns_metric_value"]', metric);
  }

  async function assertExpectedChartTitle(title: string) {
    await PageObjects.lens.assertExactText(`[data-test-subj="lns_ChartTitle"]`, title);
  }

  async function assertDatatableThText(text: string, index = 0) {
    return PageObjects.lens.assertExactText(
      `[data-test-subj="lnsDataTable"] thead th:nth-child(${index + 1}) .euiTableCellContent__text`,
      text
    );
  }

  async function assertDatatableCellText(text: string, rowIndex = 0, colIndex = 0) {
    return PageObjects.lens.assertExactText(
      `[data-test-subj="lnsDataTable"] tr:nth-child(${rowIndex + 1}) td:nth-child(${colIndex + 1})`,
      text
    );
  }

  describe('lens smokescreen tests', () => {
    it('should allow editing saved visualizations', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('Artistpreviouslyknownaslens');
      await PageObjects.lens.clickVisualizeListItemTitle('Artistpreviouslyknownaslens');
      await PageObjects.lens.goToTimeRange();
      await assertExpectedMetric('Maximum of bytes', '19,986');
    });

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
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(3);
    });

    it('should allow seamless transition to and from table view', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('Artistpreviouslyknownaslens');
      await PageObjects.lens.clickVisualizeListItemTitle('Artistpreviouslyknownaslens');
      await PageObjects.lens.goToTimeRange();
      await assertExpectedMetric('Maximum of bytes', '19,986');
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      await assertDatatableThText('Maximum of bytes');
      await assertDatatableCellText('19,986', 0, 0);
      await PageObjects.lens.switchToVisualization('lnsMetric');
      await assertExpectedMetric('Maximum of bytes', '19,986');
    });

    it('should switch from a multi-layer stacked bar to a multi-layer line chart', async () => {
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

      expect(await PageObjects.lens.getLayerCount()).to.eql(2);
    });

    it('should allow transition from line chart to donut chart and to bar chart', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('donut');
      await assertExpectedChartTitle('lnsXYvis');
      // TODO: to check if chart is valid, we check dimension panel
      // - once we have access to check if chart renders properly, we should make assertions based on chart
      expect(
        await PageObjects.lens.getVisibleTextOfDimensionTrigger('lnsPie_sliceByDimensionPanel')
      ).to.eql('Top values of ip');
      expect(
        await PageObjects.lens.getVisibleTextOfDimensionTrigger('lnsPie_sizeByDimensionPanel')
      ).to.eql('Average of bytes');

      await PageObjects.lens.switchToVisualization('bar');
      await assertExpectedChartTitle('lnsXYvis');
    });

    it('should allow seamless transition from bar chart to line chart using layer chart switch', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchLayerSeriesType('line');
      await assertExpectedChartTitle('lnsXYvis');
    });

    it('should allow seamless transition from pie chart to treemap chart', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsPieVis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsPieVis');
      await PageObjects.lens.goToTimeRange();
      expect(await PageObjects.lens.hasChartSwitchWarning('treemap')).to.eql(false);
      await PageObjects.lens.switchToVisualization('treemap');
      expect(
        await PageObjects.lens.getVisibleTextOfDimensionTrigger('lnsPie_groupByDimensionPanel', 0)
      ).to.eql('Top values of geo.dest');
      expect(
        await PageObjects.lens.getVisibleTextOfDimensionTrigger('lnsPie_groupByDimensionPanel', 1)
      ).to.eql('Top values of geo.src');
      expect(
        await PageObjects.lens.getVisibleTextOfDimensionTrigger('lnsPie_sizeByDimensionPanel')
      ).to.eql('Average of bytes');
    });

    it('should allow creating a pie chart and switching to datatable', async () => {
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

      await PageObjects.lens.switchToVisualization('lnsDatatable');
      await assertDatatableThText('@timestamp per 3 hours', 0);
      await assertDatatableThText('Average of bytes', 1);
      await assertDatatableCellText('2015-09-20 00:00', 0, 0);
      await assertDatatableCellText('6,011.351', 0, 1);
    });
  });
}
