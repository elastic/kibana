/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'visualize', 'timePicker', 'home', 'lens']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const listingTable = getService('listingTable');

  describe('Lens', () => {
    const lensChartName = 'MyLensChart';
    before(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.home.addSampleDataSet('flights');
    });

    after(async () => {
      await PageObjects.common.navigateToApp('visualize');
      await listingTable.searchForItemWithName(lensChartName);
      await listingTable.checkListingSelectAllCheckbox();
      await listingTable.clickDeleteSelected();
      await PageObjects.common.clickConfirmOnModal();
    });

    it('lens', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.timePicker.ensureHiddenNoDataPopover();
      await a11y.testAppSnapshot();
    });

    it('lens XY chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.timePicker.ensureHiddenNoDataPopover();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: 'timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'avg',
        field: 'AvgTicketPrice',
      });

      await a11y.testAppSnapshot();
    });

    it('lens pie chart', async () => {
      await PageObjects.lens.switchToVisualization('pie');
      await a11y.testAppSnapshot();
    });

    it('lens datatable', async () => {
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      await a11y.testAppSnapshot();
    });

    it('lens metric chart', async () => {
      await PageObjects.lens.switchToVisualization('lnsMetric');
      await a11y.testAppSnapshot();
    });

    it('dimension configuration panel', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.timePicker.ensureHiddenNoDataPopover();

      await PageObjects.lens.openDimensionEditor('lnsXY_xDimensionPanel > lns-empty-dimension');
      await a11y.testAppSnapshot();

      await PageObjects.lens.closeDimensionEditor();
      await PageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-empty-dimension');
      await a11y.testAppSnapshot();

      await PageObjects.lens.closeDimensionEditor();
    });

    it('change chart type', async () => {
      await PageObjects.lens.switchToVisualization('line');
      await a11y.testAppSnapshot();
    });

    it('change chart type via suggestions', async () => {
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: 'timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'avg',
        field: 'AvgTicketPrice',
      });

      await testSubjects.click('lnsSuggestion-barChart > lnsSuggestion');
      await a11y.testAppSnapshot();
    });

    // Skip until https://github.com/elastic/kibana/issues/88661 gets closed
    it.skip('lens XY chart with multiple layers', async () => {
      await PageObjects.lens.createLayer();

      await PageObjects.lens.switchToVisualization('area');
      await PageObjects.lens.configureDimension(
        {
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field: 'DestCityName',
        },
        1
      );

      await PageObjects.lens.configureDimension(
        {
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'median',
          field: 'FlightTimeMin',
        },
        1
      );
      await a11y.testAppSnapshot();
    });

    it('saves lens chart', async () => {
      await PageObjects.lens.save(lensChartName);
      await a11y.testAppSnapshot();
    });
  });
}
