/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['visualize', 'header', 'maps']);

  const security = getService('security');

  describe('visualize create menu', () => {
    before(async () => {
      await security.testUser.setRoles(
        ['test_logstash_reader', 'global_maps_all', 'geoshape_data_reader', 'global_visualize_all'],
        false
      );

      await PageObjects.visualize.navigateToNewVisualization();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should show maps application in create menu', async () => {
      const hasMapsApp = await PageObjects.visualize.hasMapsApp();
      expect(hasMapsApp).to.equal(true);
    });

    it('should not show legacy region map visualizion in create menu', async () => {
      const hasLegecyViz = await PageObjects.visualize.hasRegionMap();
      expect(hasLegecyViz).to.equal(false);
    });

    it('should not show legacy tilemap map visualizion in create menu', async () => {
      const hasLegecyViz = await PageObjects.visualize.hasTileMap();
      expect(hasLegecyViz).to.equal(false);
    });

    it('should take users to Maps application when Maps is clicked', async () => {
      await PageObjects.visualize.clickMapsApp();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.maps.waitForLayersToLoad();
      const doesLayerExist = await PageObjects.maps.doesLayerExist('Road map');
      expect(doesLayerExist).to.equal(true);
    });
  });
}
