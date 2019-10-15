/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects, ...rest }: FtrProviderContext) {
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

  async function assertExpectedMetric() {
    await PageObjects.lens.assertExactText(
      '[data-test-subj="lns_metric_title"]',
      'Maximum of bytes'
    );
    await PageObjects.lens.assertExactText('[data-test-subj="lns_metric_value"]', '19,986');
  }

  async function assertExpectedTable() {
    await PageObjects.lens.assertExactText(
      '[data-test-subj="lnsDataTable"] thead .euiTableCellContent__text',
      'Maximum of bytes'
    );
    await PageObjects.lens.assertExactText(
      '[data-test-subj="lnsDataTable"] tbody .euiTableCellContent__text',
      '19,986'
    );
  }

  describe('lens smokescreen tests', () => {
    it('should allow editing saved visualizations', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await PageObjects.lens.clickVisualizeListItemTitle('Artistpreviouslyknownaslens');
      await PageObjects.lens.goToTimeRange();
      await assertExpectedMetric();
    });

    it('should be embeddable in dashboards', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await find.clickByButtonText('Artistpreviouslyknownaslens');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();
      await assertExpectedMetric();
    });

    it('should allow seamless transition to and from table view', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await PageObjects.lens.clickVisualizeListItemTitle('Artistpreviouslyknownaslens');
      await PageObjects.lens.goToTimeRange();
      await assertExpectedMetric();
      await PageObjects.lens.switchToVisualization('lnsChartSwitchPopover_lnsDatatable');
      await assertExpectedTable();
      await PageObjects.lens.switchToVisualization('lnsChartSwitchPopover_lnsMetric');
      await assertExpectedMetric();
    });

    it('should allow creation of lens visualizations', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension:
          '[data-test-subj="lnsXY_xDimensionPanel"] [data-test-subj="indexPattern-configure-dimension"]',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension:
          '[data-test-subj="lnsXY_yDimensionPanel"] [data-test-subj="indexPattern-configure-dimension"]',
        operation: 'avg',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension:
          '[data-test-subj="lnsXY_splitDimensionPanel"] [data-test-subj="indexPattern-configure-dimension"]',
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
