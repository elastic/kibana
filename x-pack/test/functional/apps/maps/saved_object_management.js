/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getPageObjects, getService }) {

  const PageObjects = getPageObjects(['maps', 'header', 'timePicker']);
  const queryBar = getService('queryBar');
  const browser = getService('browser');
  const inspector = getService('inspector');

  describe('map saved object management', () => {

    const MAP_NAME_PREFIX = 'saved_object_management_test_';
    const MAP1_NAME = `${MAP_NAME_PREFIX}map1`;
    const MAP2_NAME = `${MAP_NAME_PREFIX}map2`;

    describe('read', () => {
      before(async () => {
        await PageObjects.maps.loadSavedMap('join example');
      });

      it('should update global Kibana time to value stored with map', async () => {
        const timeConfig = await PageObjects.timePicker.getTimeConfig();
        expect(timeConfig.start).to.equal('~ 17 minutes ago');
        expect(timeConfig.end).to.equal('now');
      });

      it('should update global Kibana refresh config to value stored with map', async () => {
        const kibanaRefreshConfig = await PageObjects.timePicker.getRefreshConfig();
        expect(kibanaRefreshConfig.interval).to.equal('1');
        expect(kibanaRefreshConfig.units).to.equal('seconds');
        expect(kibanaRefreshConfig.isPaused).to.equal(true);
      });

      it('should set map location to value stored with map', async () => {
        const { lat, lon, zoom } = await PageObjects.maps.getView();
        expect(lat).to.equal('-0.04647');
        expect(lon).to.equal('77.33426');
        expect(zoom).to.equal('3.02');
      });

      it('should load map layers stored with map', async () => {
        const layerExists = await PageObjects.maps.doesLayerExist('geo_shapes*');
        expect(layerExists).to.equal(true);
      });

      describe('mapState contains query', () => {
        before(async () => {
          await PageObjects.maps.loadSavedMap('document example with query');
        });

        it('should update query bar with query stored with map', async () => {
          const query = await queryBar.getQueryString();
          expect(query).to.equal('machine.os.raw : "ios"');
        });

        it('should update app state with query stored with map', async () => {
          const currentUrl = await browser.getCurrentUrl();
          const appState = currentUrl.substring(currentUrl.indexOf('_a='));
          expect(appState).to.equal('_a=(query:(language:kuery,query:%27machine.os.raw%20:%20%22ios%22%27))');
        });

        it('should apply query stored with map', async () => {
          await inspector.open();
          await inspector.openInspectorRequestsView();
          const requestStats = await inspector.getTableData();
          const hits = PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
          await inspector.close();
          expect(hits).to.equal('2');
        });

        it('should override query stored with map when query is provided in app state', async () => {
          const currentUrl = await browser.getCurrentUrl();
          const kibanaBaseUrl = currentUrl.substring(0, currentUrl.indexOf('#'));
          const appState = `_a=(query:(language:kuery,query:'machine.os.raw%20:%20"win%208"'))`;
          const urlWithQueryInAppState = `${kibanaBaseUrl}#/map/8eabdab0-144f-11e9-809f-ad25bb78262c?${appState}`;

          await browser.get(urlWithQueryInAppState, true);
          await PageObjects.maps.waitForLayersToLoad();

          const query = await queryBar.getQueryString();
          expect(query).to.equal('machine.os.raw : "win 8"');

          await inspector.open();
          await inspector.openInspectorRequestsView();
          const requestStats = await inspector.getTableData();
          await inspector.close();
          const hits = PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
          expect(hits).to.equal('1');
        });
      });
    });

    describe('create', () => {
      it('should allow saving map', async () => {
        await PageObjects.maps.openNewMap();

        await PageObjects.maps.saveMap(MAP1_NAME);
        const count = await PageObjects.maps.getMapCountWithName(MAP1_NAME);
        expect(count).to.equal(1);
      });

      it('should allow saving map that crosses dateline', async () => {
        await PageObjects.maps.openNewMap();
        await PageObjects.maps.setView('64', '179', '5');

        await PageObjects.maps.saveMap(MAP2_NAME);
        const count = await PageObjects.maps.getMapCountWithName(MAP2_NAME);
        expect(count).to.equal(1);
      });
    });

    describe('delete', () => {
      it('should delete selected saved objects', async () => {
        await PageObjects.maps.deleteSavedMaps(MAP_NAME_PREFIX);

        const map1Count = await PageObjects.maps.getMapCountWithName(MAP1_NAME);
        expect(map1Count).to.equal(0);

        const map2Count = await PageObjects.maps.getMapCountWithName(MAP2_NAME);
        expect(map2Count).to.equal(0);
      });
    });

  });
}
