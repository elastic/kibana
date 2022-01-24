/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const queryBar = getService('queryBar');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'maps', 'timePicker']);
  const security = getService('security');

  describe('discover visualize button', () => {
    beforeEach(async () => {
      await security.testUser.setRoles([
        'test_logstash_reader',
        'global_maps_all',
        'geoshape_data_reader',
        'global_discover_read',
        'global_visualize_read',
      ]);
      await PageObjects.common.navigateToApp('discover');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should link geo_shape fields to Maps application', async () => {
      await PageObjects.discover.selectIndexPattern('geo_shapes*');
      await PageObjects.discover.clickFieldListItemVisualize('geometry');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.maps.waitForLayersToLoad();
      const doesLayerExist = await PageObjects.maps.doesLayerExist('geo_shapes*');
      expect(doesLayerExist).to.equal(true);
      const tooltipText = await PageObjects.maps.getLayerTocTooltipMsg('geo_shapes*');
      expect(tooltipText).to.equal('geo_shapes*\nFound ~8 documents. This count is approximate.');
      await PageObjects.maps.refreshAndClearUnsavedChangesWarning();
    });

    it('should link geo_point fields to Maps application with time and query context', async () => {
      await PageObjects.discover.selectIndexPattern('logstash-*');
      await PageObjects.timePicker.setAbsoluteRange(
        'Sep 22, 2015 @ 00:00:00.000',
        'Sep 22, 2015 @ 04:00:00.000'
      );
      await queryBar.setQuery('machine.os.raw : "ios"');
      await queryBar.submitQuery();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.discover.clickFieldListItemVisualize('geo.coordinates');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.maps.waitForLayersToLoad();
      const doesLayerExist = await PageObjects.maps.doesLayerExist('logstash-*');
      expect(doesLayerExist).to.equal(true);
      const tooltipText = await PageObjects.maps.getLayerTocTooltipMsg('logstash-*');
      expect(tooltipText).to.equal(
        'logstash-*\nFound 7 documents.\nResults narrowed by global search\nResults narrowed by global time'
      );
      await PageObjects.maps.refreshAndClearUnsavedChangesWarning();
    });
  });
}
