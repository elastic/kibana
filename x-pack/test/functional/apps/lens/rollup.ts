/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens']);
  const find = getService('find');
  const listingTable = getService('listingTable');
  const esArchiver = getService('esArchiver');

  describe('lens rollup tests', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('lens/rollup/data');
      await esArchiver.loadIfNeeded('lens/rollup/config');
    });

    after(async () => {
      await esArchiver.unload('lens/rollup/data');
      await esArchiver.unload('lens/rollup/config');
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
        operation: 'sum',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(2);

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
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(2);
    });

    it('should allow seamless transition to and from table view', async () => {
      await PageObjects.lens.switchToVisualization('lnsMetric');
      await PageObjects.lens.assertMetric('Sum of bytes', '16,788');
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      expect(await PageObjects.lens.getDatatableHeaderText()).to.eql('Sum of bytes');
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('16,788');
    });
  });
}
