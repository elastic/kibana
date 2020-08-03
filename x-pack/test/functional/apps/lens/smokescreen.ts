/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'header',
    'common',
    'visualize',
    'dashboard',
    'header',
    'timePicker',
    'lens',
  ]);
  const find = getService('find');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const elasticChart = getService('elasticChart');
  const browser = getService('browser');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const listingTable = getService('listingTable');

  async function assertExpectedMetric(metricCount: string = '19,986') {
    await PageObjects.lens.assertExactText(
      '[data-test-subj="lns_metric_title"]',
      'Maximum of bytes'
    );
    await PageObjects.lens.assertExactText('[data-test-subj="lns_metric_value"]', metricCount);
  }

  async function assertExpectedTable() {
    await PageObjects.lens.assertExactText(
      '[data-test-subj="lnsDataTable"] thead .euiTableCellContent__text',
      'Maximum of bytes'
    );
    await PageObjects.lens.assertExactText(
      '[data-test-subj="lnsDataTable"] [data-test-subj="lnsDataTableCellValue"]',
      '19,986'
    );
  }

  async function assertExpectedChartTitleInEmbeddable(title: string) {
    await PageObjects.lens.assertExactText(
      `[data-test-subj="embeddablePanelHeading-${title}"]`,
      title
    );
  }

  async function assertExpectedChartTitle(title: string) {
    await PageObjects.lens.assertExactText(`[data-test-subj="lns_ChartTitle"]`, title);
  }

  async function assertExpectedTimerange() {
    const time = await PageObjects.timePicker.getTimeConfig();
    expect(time.start).to.equal('Sep 21, 2015 @ 09:00:00.000');
    expect(time.end).to.equal('Sep 21, 2015 @ 12:00:00.000');
  }

  async function clickOnBarHistogram() {
    const el = await elasticChart.getCanvas();
    await browser.getActions().move({ x: 5, y: 5, origin: el._webElement }).click().perform();
  }

  describe('lens smokescreen tests', () => {
    it('should allow editing saved visualizations', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('Artistpreviouslyknownaslens');
      await PageObjects.lens.clickVisualizeListItemTitle('Artistpreviouslyknownaslens');
      await PageObjects.lens.goToTimeRange();
      await assertExpectedMetric();
    });

    it('metric should be embeddable in dashboards', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('Artistpreviouslyknownaslens');
      await find.clickByButtonText('Artistpreviouslyknownaslens');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();
      await assertExpectedMetric();
    });

    it('click on the bar in XYChart adds proper filters/timerange in dashboard', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsXYvis');
      await find.clickByButtonText('lnsXYvis');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();
      await clickOnBarHistogram();

      await retry.try(async () => {
        await testSubjects.click('applyFiltersPopoverButton');
        await testSubjects.missingOrFail('applyFiltersPopoverButton');
      });

      await assertExpectedChartTitleInEmbeddable('lnsXYvis');
      await assertExpectedTimerange();
      const hasIpFilter = await filterBar.hasFilter('ip', '97.220.3.248');
      expect(hasIpFilter).to.be(true);
    });

    it('should allow creation of lens visualizations', async () => {
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
      await assertExpectedMetric();
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      await assertExpectedTable();
      await PageObjects.lens.switchToVisualization('lnsMetric');
      await assertExpectedMetric();
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
  });
}
