/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'maps']);
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');

  describe('choropleth chart', () => {
    it('should allow creation of choropleth chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.switchToVisualization('lnsChoropleth', 'Region map');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsChoropleth_regionKeyDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.dest',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsChoropleth_valueDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.maps.openLegend();
      await PageObjects.maps.waitForLayersToLoad();

      expect(await PageObjects.maps.getNumberOfLayers()).to.eql(2);
      expect(await PageObjects.maps.doesLayerExist('World Countries by Average of bytes')).to.be(
        true
      );
    });

    it('should create choropleth chart from suggestion', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.dragFieldToWorkspace('geo.dest');

      // add filter to force data fetch to set activeData
      await filterBar.addFilter('bytes', 'is between', '200', '10000');

      await testSubjects.click('lnsSuggestion-worldCountriesByCountOfRecords > lnsSuggestion');

      await PageObjects.maps.openLegend();
      await PageObjects.maps.waitForLayersToLoad();

      expect(await PageObjects.maps.getNumberOfLayers()).to.eql(2);
      expect(await PageObjects.maps.doesLayerExist('World Countries by Count of records')).to.be(
        true
      );
    });
  });
}
