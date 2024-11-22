/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const queryBar = getService('queryBar');
  const { common, discover, header, maps, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'header',
    'maps',
    'unifiedFieldList',
  ]);
  const security = getService('security');
  const from = 'Sep 22, 2015 @ 00:00:00.000';
  const to = 'Sep 22, 2015 @ 04:00:00.000';

  describe('discover visualize button', () => {
    beforeEach(async () => {
      await security.testUser.setRoles([
        'test_logstash_reader',
        'global_maps_all',
        'geoshape_data_reader',
        'global_discover_read',
        'global_visualize_read',
      ]);
      await common.setTime({ from, to });
      await common.navigateToApp('discover');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await common.unsetTime();
    });

    it('should link geo_shape fields to Maps application', async () => {
      await discover.selectIndexPattern('geo_shapes*');
      await unifiedFieldList.clickFieldListItemVisualize('geometry');
      await header.waitUntilLoadingHasFinished();
      await maps.waitForLayersToLoad();
      const doesLayerExist = await maps.doesLayerExist('geo_shapes*');
      expect(doesLayerExist).to.equal(true);
      const tooltipText = await maps.getLayerTocTooltipMsg('geo_shapes*');
      expect(tooltipText).to.equal('geo_shapes*\nFound ~8 documents. This count is approximate.');
      await maps.refreshAndClearUnsavedChangesWarning();
    });

    it('should link geo_point fields to Maps application with time and query context', async () => {
      await discover.selectIndexPattern('logstash-*');

      await queryBar.setQuery('machine.os.raw : "ios"');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();

      await unifiedFieldList.clickFieldListItemVisualize('geo.coordinates');
      await header.waitUntilLoadingHasFinished();
      await maps.waitForLayersToLoad();
      const doesLayerExist = await maps.doesLayerExist('logstash-*');
      expect(doesLayerExist).to.equal(true);
      const tooltipText = await maps.getLayerTocTooltipMsg('logstash-*');
      expect(tooltipText).to.equal(
        'logstash-*\nFound 7 documents.\nResults narrowed by global search\nResults narrowed by global time'
      );
      await maps.refreshAndClearUnsavedChangesWarning();
    });
  });
}
