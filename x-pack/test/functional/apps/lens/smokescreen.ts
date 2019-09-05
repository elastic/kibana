/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  ]);
  const find = getService('find');
  const retry = getService('retry');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');

  async function goToValidTimeRange() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';
    await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
  }

  async function assertExpectedText(selector: string, test: (value?: string) => boolean) {
    let actualText: string | undefined;

    await retry.waitForWithTimeout('assertExpectedText', 1000, async () => {
      actualText = await find.byCssSelector(selector).then(el => el.getVisibleText());
      return test(actualText);
    });

    if (!test(actualText)) {
      throw new Error(`"${actualText}" did not match expectation.`);
    }
  }

  async function assertExactText(selector: string, expectedText: string) {
    await assertExpectedText(selector, value => value === expectedText);
  }

  async function assertExpectedMetric() {
    await assertExactText('[data-test-subj="lns_metric_title"]', 'Maximum of bytes');
    await assertExactText('[data-test-subj="lns_metric_value"]', '19,986');
  }

  async function assertExpectedTable() {
    await assertExactText(
      '[data-test-subj="lnsDataTable"] thead .euiTableCellContent__text',
      'Maximum of bytes'
    );
    await assertExactText(
      '[data-test-subj="lnsDataTable"] tbody .euiTableCellContent__text',
      '19,986'
    );
  }

  async function switchToVisualization(dataTestSubj: string) {
    await find.clickByCssSelector('[data-test-subj="lnsChartSwitchPopover"]');
    await find.clickByCssSelector(`[data-test-subj="${dataTestSubj}"]`);
  }

  function clickVisualizeListItem(title: string) {
    return find.clickByCssSelector(`[data-test-subj="visListingTitleLink-${title}"]`);
  }

  describe('lens smokescreen tests', () => {
    it('should allow editing saved visualizations', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await clickVisualizeListItem('Artistpreviouslyknownaslens');
      await goToValidTimeRange();
      await assertExpectedMetric();
    });

    it('should be embeddable in dashboards', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await goToValidTimeRange();
      await PageObjects.dashboard.addVisualizations([
        { name: 'Artistpreviouslyknownaslens', embeddableType: 'lens' },
      ]);
      await assertExpectedMetric();
    });

    it('should allow seamless transition to and from table view', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await clickVisualizeListItem('Artistpreviouslyknownaslens');
      await goToValidTimeRange();
      await assertExpectedMetric();
      await switchToVisualization('lnsChartSwitchPopover_lnsDatatable');
      await assertExpectedTable();
      await switchToVisualization('lnsChartSwitchPopover_lnsMetric');
      await assertExpectedMetric();
    });

    it('should allow creation of lens visualizations', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await goToValidTimeRange();

      // Drag the @timestamp field to the workspace
      const workspace = await find.byCssSelector('[data-test-subj="lnsWorkspace"]');
      const timestampField = await find.byCssSelector(
        `[data-test-subj="lnsFieldListPanelField"] [title="@timestamp"]`
      );

      await browser.dragAndDrop(
        { location: timestampField, offset: { x: 0, y: 0 } },
        { location: workspace, offset: { x: 40, y: 40 } }
      );

      // Change the y from count to average of bytes
      await find.clickByButtonText('Count of documents');
      await find.clickByCssSelector('[data-test-subj="lns-indexPatternDimensionIncompatible-avg"]');
      await find.clickByCssSelector('[data-test-subj="indexPattern-dimension-field"]');
      await find.clickByCssSelector('[data-test-subj="lns-fieldOption-bytes"]');

      // Change the title
      await find.setValue('[data-test-subj="lns_ChartTitle"]', 'Afancilenstest');

      // Save the chart
      await find.clickByCssSelector('[data-test-subj="lnsApp_saveButton"]');

      // Ensure the visualization shows up in the visualize list
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await clickVisualizeListItem('Afancilenstest');
      await goToValidTimeRange();

      // Expect to see the visualization editor for the saved visualization
      const title = await find
        .byCssSelector('[data-test-subj="lns_ChartTitle"]')
        .then(el => el.getAttribute('value'));

      expect(title).to.eql('Afancilenstest');

      // .echLegendItem__title is the only viable way of getting the xy chart's
      // legend item(s), so we're using a class selector here.
      await assertExpectedText(
        '.echLegendItem__title',
        legendText => !!legendText && legendText.includes('Average of bytes')
      );
    });
  });
}
