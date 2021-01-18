/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'home', 'settings', 'lens']);
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
      await a11y.testAppSnapshot();
    });

    it('lens chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');

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

    it('dimension configuration panel', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');

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

    it('saves lens chart', async () => {
      await PageObjects.lens.save(lensChartName);
      await a11y.testAppSnapshot();
    });
  });
}
