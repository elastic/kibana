/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['visualize', 'header', 'maps']);

  const security = getService('security');

  describe('visualize create menu', () => {
    describe('maps visualize alias', () => {
      describe('with write permission', () => {
        before(async () => {
          await security.testUser.setRoles(['global_maps_all', 'global_visualize_all'], {
            skipBrowserRefresh: true,
          });

          await PageObjects.visualize.navigateToNewVisualization();
        });

        it('should show maps application in create menu', async () => {
          const hasMapsApp = await PageObjects.visualize.hasMapsApp();
          expect(hasMapsApp).to.equal(true);
        });

        it('should take users to Maps application when Maps is clicked', async () => {
          await PageObjects.visualize.clickMapsApp();
          await PageObjects.header.waitUntilLoadingHasFinished();
          const onMapPage = await PageObjects.maps.onMapPage();
          expect(onMapPage).to.equal(true);
        });
      });

      describe('without write permission', () => {
        before(async () => {
          await security.testUser.setRoles(['global_maps_read', 'global_visualize_all'], {
            skipBrowserRefresh: true,
          });

          await PageObjects.visualize.navigateToNewVisualization();
        });

        after(async () => {
          await security.testUser.restoreDefaults();
        });

        it('should not show maps application in create menu', async () => {
          const hasMapsApp = await PageObjects.visualize.hasMapsApp();
          expect(hasMapsApp).to.equal(false);
        });
      });
    });

    describe('aggregion based visualizations', () => {
      before(async () => {
        await security.testUser.setRoles(['global_visualize_all'], { skipBrowserRefresh: true });

        await PageObjects.visualize.navigateToNewAggBasedVisualization();
      });

      after(async () => {
        await security.testUser.restoreDefaults();
      });

      it('should not show legacy region map visualizion in create menu', async () => {
        const hasLegecyViz = await PageObjects.visualize.hasVisType('region_map');
        expect(hasLegecyViz).to.equal(false);
      });

      it('should not show legacy tilemap map visualizion in create menu', async () => {
        const hasLegecyViz = await PageObjects.visualize.hasVisType('tile_map');
        expect(hasLegecyViz).to.equal(false);
      });
    });
  });
}
