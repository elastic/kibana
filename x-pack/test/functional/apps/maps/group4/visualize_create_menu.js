/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const { visualize, header, maps } = getPageObjects(['visualize', 'header', 'maps']);
  const listingTable = getService('listingTable');
  const security = getService('security');

  describe('visualize create menu', () => {
    describe('maps visualize alias', () => {
      describe('with write permission', () => {
        before(async () => {
          await security.testUser.setRoles(
            ['global_maps_all', 'global_visualize_all', 'test_logstash_reader'],
            {
              skipBrowserRefresh: true,
            }
          );

          await visualize.navigateToNewVisualization();
        });

        it('should show maps application in create menu', async () => {
          const hasMapsApp = await visualize.hasMapsApp();
          expect(hasMapsApp).to.equal(true);
        });

        it('should take users to Maps application when Maps is clicked', async () => {
          await visualize.clickMapsApp();
          await header.waitUntilLoadingHasFinished();
          const onMapPage = await maps.onMapPage();
          expect(onMapPage).to.equal(true);
        });
      });

      describe('without write permission', function () {
        this.tags('skipFIPS');
        before(async () => {
          await security.testUser.setRoles(
            ['global_maps_read', 'global_visualize_all', 'test_logstash_reader'],
            {
              skipBrowserRefresh: true,
            }
          );

          await visualize.navigateToNewVisualization();
        });

        after(async () => {
          await security.testUser.restoreDefaults();
        });

        it('should not show maps application in create menu', async () => {
          const hasMapsApp = await visualize.hasMapsApp();
          expect(hasMapsApp).to.equal(false);
        });
      });
    });

    describe('aggregion based visualizations', () => {
      before(async () => {
        await security.testUser.setRoles(['global_visualize_all', 'test_logstash_reader'], {
          skipBrowserRefresh: true,
        });

        await visualize.navigateToNewAggBasedVisualization();
      });

      after(async () => {
        await security.testUser.restoreDefaults();
      });

      it('should not show legacy region map visualizion in create menu', async () => {
        const hasLegecyViz = await visualize.hasVisType('region_map');
        expect(hasLegecyViz).to.equal(false);
      });

      it('should not show legacy tilemap map visualizion in create menu', async () => {
        const hasLegecyViz = await visualize.hasVisType('tile_map');
        expect(hasLegecyViz).to.equal(false);
      });
    });
    describe('edit meta-data', () => {
      before(async () => {
        await security.testUser.setRoles(
          ['global_maps_all', 'global_visualize_all', 'test_logstash_reader'],
          {
            skipBrowserRefresh: true,
          }
        );

        await visualize.navigateToNewAggBasedVisualization();
      });

      after(async () => {
        await security.testUser.restoreDefaults();
      });

      it('should allow to change meta-data on a map visualization', async () => {
        await visualize.navigateToNewVisualization();
        await visualize.clickMapsApp();
        await maps.waitForLayersToLoad();
        await maps.saveMap('myTestMap');
        await visualize.gotoVisualizationLandingPage();
        await listingTable.searchForItemWithName('myTestMap');
        await listingTable.inspectVisualization();
        await listingTable.editVisualizationDetails({
          title: 'AnotherTestMap',
          description: 'new description',
        });
        await listingTable.searchForItemWithName('AnotherTestMap');
        await listingTable.expectItemsCount('visualize', 1);
      });
    });
  });
}
