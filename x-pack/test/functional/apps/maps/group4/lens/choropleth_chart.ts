/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens, maps } = getPageObjects(['visualize', 'lens', 'maps']);
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');

  // Test requires access to Elastic Maps Service
  // Do not skip test if failure is "Test requires access to Elastic Maps Service (EMS). EMS is not available"
  describe('choropleth chart', () => {
    before('', async () => {
      await maps.expectEmsToBeAvailable();
    });

    it('should allow creation of choropleth chart', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();

      await lens.switchToVisualization('lnsChoropleth', 'Region map');

      await lens.configureDimension({
        dimension: 'lnsChoropleth_regionKeyDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.dest',
      });

      await lens.configureDimension({
        dimension: 'lnsChoropleth_valueDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await maps.openLegend();
      await maps.waitForLayersToLoad();

      expect(await maps.getNumberOfLayers()).to.eql(2);
      expect(await maps.doesLayerExist('World Countries by Average of bytes')).to.be(true);
    });

    it('should create choropleth chart from suggestion', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();

      await lens.dragFieldToWorkspace('geo.dest', 'xyVisChart');

      // add filter to force data fetch to set activeData
      await filterBar.addFilter({
        field: 'bytes',
        operation: 'is between',
        value: { from: '200', to: '10000' },
      });

      await testSubjects.click('lnsSuggestion-worldCountriesByCountOfRecords > lnsSuggestion');

      await maps.openLegend();
      await maps.waitForLayersToLoad();

      expect(await maps.getNumberOfLayers()).to.eql(2);
      expect(await maps.doesLayerExist('World Countries by Count of records')).to.be(true);
    });
  });
}
