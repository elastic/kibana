/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects }: FtrProviderContext) {
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
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');

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
      '19,985'
    );
    await PageObjects.lens.assertExactText(
      '[data-test-subj="lnsDataTable"] [data-test-subj="lnsDataTableCellValueFilterable"]',
      'IN'
    );
  }

  async function assertExpectedChart() {
    await PageObjects.lens.assertExactText(
      '[data-test-subj="embeddablePanelHeading-lnsXYvis"]',
      'lnsXYvis'
    );
  }

  async function assertExpectedTimerange() {
    const time = await PageObjects.timePicker.getTimeConfig();
    expect(time.start).to.equal('Sep 21, 2015 @ 09:00:00.000');
    expect(time.end).to.equal('Sep 21, 2015 @ 12:00:00.000');
  }

  async function clickOnBarHistogram() {
    const el = await elasticChart.getCanvas();

    await browser
      .getActions()
      .move({ x: 5, y: 5, origin: el._webElement })
      .click()
      .perform();
  }

  describe('lens smokescreen tests', () => {
    it('should allow editing saved visualizations', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await PageObjects.lens.clickVisualizeListItemTitle('Artistpreviouslyknownaslens');
      await PageObjects.lens.goToTimeRange();
      await assertExpectedMetric();
    });

    it('metric should be embeddable in dashboards', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await find.clickByButtonText('Artistpreviouslyknownaslens');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();
      await assertExpectedMetric();
    });

    it('click on the bar in XYChart adds proper filters/timerange in dashboard', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await find.clickByButtonText('lnsXYvis');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();
      await clickOnBarHistogram();
      await testSubjects.click('applyFiltersPopoverButton');

      await assertExpectedChart();
      await assertExpectedTimerange();
      const hasIpFilter = await filterBar.hasFilter('ip', '97.220.3.248');
      expect(hasIpFilter).to.be(true);
    });

    it('should allow seamless transition to and from table view and add a filter', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await PageObjects.lens.clickVisualizeListItemTitle('Artistpreviouslyknownaslens');
      await PageObjects.lens.goToTimeRange();
      await assertExpectedMetric();
      await PageObjects.lens.switchToVisualization('lnsChartSwitchPopover_lnsDatatable');
      await PageObjects.lens.configureDimension({
        dimension: '[data-test-subj="lnsDatatable_column"] [data-test-subj="lns-empty-dimension"]',
        operation: 'terms',
        field: 'geo.dest',
      });
      await PageObjects.lens.save('Artistpreviouslyknownaslens');
      await find.clickByCssSelector('[data-test-subj="lensDatatableFilterOut"]');
      await assertExpectedTable();
      await PageObjects.lens.switchToVisualization('lnsChartSwitchPopover_lnsMetric');
      await assertExpectedMetric('19,985');
    });

    it('should allow creation of lens visualizations', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension:
          '[data-test-subj="lnsXY_xDimensionPanel"] [data-test-subj="lns-empty-dimension"]',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension:
          '[data-test-subj="lnsXY_yDimensionPanel"] [data-test-subj="lns-empty-dimension"]',
        operation: 'avg',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension:
          '[data-test-subj="lnsXY_splitDimensionPanel"] [data-test-subj="lns-empty-dimension"]',
        operation: 'terms',
        field: '@message.raw',
      });

      await PageObjects.lens.switchToVisualization('lnsChartSwitchPopover_lnsDatatable');
      await PageObjects.lens.removeDimension('lnsDatatable_column');
      await PageObjects.lens.switchToVisualization('lnsChartSwitchPopover_bar_stacked');

      await PageObjects.lens.configureDimension({
        dimension:
          '[data-test-subj="lnsXY_splitDimensionPanel"] [data-test-subj="lns-empty-dimension"]',
        operation: 'terms',
        field: 'ip',
      });

      await PageObjects.lens.save('Afancilenstest');

      // Ensure the visualization shows up in the visualize list, and takes
      // us back to the visualization as we configured it.
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await PageObjects.lens.clickVisualizeListItemTitle('Afancilenstest');
      await PageObjects.lens.goToTimeRange();

      expect(await PageObjects.lens.getTitle()).to.eql('Afancilenstest');

      // .echLegendItem__title is the only viable way of getting the xy chart's
      // legend item(s), so we're using a class selector here.
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(3);
    });
  });
}
