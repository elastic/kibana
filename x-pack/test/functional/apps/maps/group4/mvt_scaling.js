/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const { maps } = getPageObjects(['maps']);
  const inspector = getService('inspector');
  const security = getService('security');
  const testSubjects = getService('testSubjects');

  describe('mvt scaling', () => {
    before(async () => {
      await security.testUser.setRoles(
        ['global_maps_all', 'test_logstash_reader', 'geoshape_data_reader'],
        { skipBrowserRefresh: true }
      );
    });

    after(async () => {
      await inspector.close();
      await security.testUser.restoreDefaults();
    });

    describe('layer style', () => {
      const VECTOR_SOURCE_ID = 'caffa63a-ebfb-466d-8ff6-d797975b88ab';

      let mapboxStyle;
      before(async () => {
        await maps.loadSavedMap('geo_shape_mvt');
        mapboxStyle = await maps.getMapboxStyle();
      });

      it('should request tiles from /internal/maps/mvt/getTile', async () => {
        const tileUrl = new URL(
          mapboxStyle.sources[VECTOR_SOURCE_ID].tiles[0],
          'http://absolute_path'
        );
        const searchParams = Object.fromEntries(tileUrl.searchParams);

        expect(tileUrl.pathname).to.equal('/internal/maps/mvt/getTile/%7Bz%7D/%7Bx%7D/%7By%7D.pbf');

        // token is an unique id that changes between runs
        expect(typeof searchParams.token).to.equal('string');
        delete searchParams.token;

        expect(searchParams).to.eql({
          buffer: '4',
          executionContextId: 'bff99716-e3dc-11ea-87d0-0242ac130003',
          geometryFieldName: 'geometry',
          hasLabels: 'false',
          index: 'geo_shapes*',
          requestBody:
            '(fields:!(prop1),query:(bool:(filter:!((exists:(field:geometry))),must:!(),must_not:!(),should:!())),runtime_mappings:(),size:10001)',
        });
      });

      it('should have fill layer', async () => {
        //Should correctly load meta for style-rule (sigma is set to 1, opacity to 1)
        const fillLayer = mapboxStyle.layers.find(
          (layer) => layer.id === VECTOR_SOURCE_ID + '_fill'
        );
        expect(fillLayer.paint).to.eql({
          'fill-color': [
            'interpolate',
            ['linear'],
            [
              'coalesce',
              [
                'case',
                ['==', ['get', 'prop1'], null],
                0.3819660112501051,
                [
                  'max',
                  ['min', ['to-number', ['get', 'prop1']], 3.618033988749895],
                  1.381966011250105,
                ],
              ],
              0.3819660112501051,
            ],
            0.3819660112501051,
            'rgba(0,0,0,0)',
            1.381966011250105,
            '#e4eefd',
            1.6614745084375788,
            '#d3e3fe',
            1.9409830056250525,
            '#c1d8fe',
            2.2204915028125263,
            '#afceff',
            2.5,
            '#9dc3ff',
            2.7795084971874737,
            '#8bb8ff',
            3.0590169943749475,
            '#77adff',
            3.338525491562421,
            '#61a2ff',
          ],
          'fill-opacity': 1,
        });
      });

      it('should have toomanyfeatures layer', async () => {
        const layer = mapboxStyle.layers.find((mbLayer) => {
          return mbLayer.id === `${VECTOR_SOURCE_ID}_toomanyfeatures`;
        });

        expect(layer).to.eql({
          id: 'caffa63a-ebfb-466d-8ff6-d797975b88ab_toomanyfeatures',
          type: 'line',
          source: 'caffa63a-ebfb-466d-8ff6-d797975b88ab',
          'source-layer': 'meta',
          minzoom: 0,
          maxzoom: 24,
          filter: [
            'all',
            ['==', ['get', 'hits.total.relation'], 'gte'],
            ['>=', ['get', 'hits.total.value'], 10002],
          ],
          layout: { visibility: 'visible' },
          paint: {
            'line-color': '#9dc3ff',
            'line-width': 3,
            'line-dasharray': [2, 1],
            'line-opacity': 1,
          },
        });
      });
    });

    describe('filtering', () => {
      before(async () => {
        await maps.loadSavedMap('MVT documents');
      });

      async function getTileUrl() {
        const mapboxStyle = await maps.getMapboxStyle();
        return mapboxStyle.sources['a7ab2e06-145b-48c5-bd86-b633849017ad'].tiles[0];
      }

      describe('applyGlobalQuery: true, applyGlobalTime: true, applyForceRefresh: true', () => {
        after(async () => {
          await maps.setAbsoluteRange('Sep 20, 2015 @ 00:00:00.000', 'Sep 20, 2015 @ 01:00:00.000');
          await maps.setAndSubmitQuery('');
        });

        it('should update MVT URL when query changes', async () => {
          const prevTileUrl = await getTileUrl();
          await maps.setAndSubmitQuery('machine.os.raw : "win 8"');
          const nextTileUrl = await getTileUrl();
          expect(prevTileUrl).to.not.eql(nextTileUrl);
        });

        it('should update MVT URL when time changes', async () => {
          const prevTileUrl = await getTileUrl();
          await maps.setAbsoluteRange('Sep 20, 2015 @ 00:00:00.000', 'Sep 20, 2015 @ 03:00:00.000');
          const nextTileUrl = await getTileUrl();
          expect(prevTileUrl).to.not.eql(nextTileUrl);
        });

        it('should update MVT URL when refresh clicked', async () => {
          const prevTileUrl = await getTileUrl();
          await maps.refreshQuery();
          const nextTileUrl = await getTileUrl();
          expect(prevTileUrl).to.not.eql(nextTileUrl);
        });
      });

      describe('applyGlobalQuery: false, applyGlobalTime: true, applyForceRefresh: true', () => {
        before(async () => {
          await maps.openLayerPanel('logstash-*');
          await testSubjects.click('mapLayerPanelApplyGlobalQueryCheckbox');
          await maps.waitForLayersToLoad();
        });

        after(async () => {
          await maps.closeLayerPanel();
          await maps.setAbsoluteRange('Sep 20, 2015 @ 00:00:00.000', 'Sep 20, 2015 @ 01:00:00.000');
          await maps.setAndSubmitQuery('');
        });

        it('should not update MVT URL when query changes', async () => {
          const prevTileUrl = await getTileUrl();
          await maps.setAndSubmitQuery('machine.os.raw : "win 8"');
          const nextTileUrl = await getTileUrl();
          expect(prevTileUrl).to.eql(nextTileUrl);
        });

        it('should update MVT URL when time changes', async () => {
          const prevTileUrl = await getTileUrl();
          await maps.setAbsoluteRange('Sep 20, 2015 @ 00:00:00.000', 'Sep 20, 2015 @ 03:00:00.000');
          const nextTileUrl = await getTileUrl();
          expect(prevTileUrl).to.not.eql(nextTileUrl);
        });

        it('should update MVT URL when refresh clicked', async () => {
          const prevTileUrl = await getTileUrl();
          await maps.refreshQuery();
          const nextTileUrl = await getTileUrl();
          expect(prevTileUrl).to.not.eql(nextTileUrl);
        });
      });

      describe('applyGlobalQuery: true, applyGlobalTime: false, applyForceRefresh: true', () => {
        before(async () => {
          await maps.openLayerPanel('logstash-*');
          await testSubjects.click('mapLayerPanelApplyGlobalTimeCheckbox');
          await maps.waitForLayersToLoad();
        });

        after(async () => {
          await maps.closeLayerPanel();
          await maps.setAbsoluteRange('Sep 20, 2015 @ 00:00:00.000', 'Sep 20, 2015 @ 01:00:00.000');
          await maps.setAndSubmitQuery('');
        });

        it('should update MVT URL when query changes', async () => {
          const prevTileUrl = await getTileUrl();
          await maps.setAndSubmitQuery('machine.os.raw : "win 8"');
          const nextTileUrl = await getTileUrl();
          expect(prevTileUrl).to.not.eql(nextTileUrl);
        });

        it('should not update MVT URL when time changes', async () => {
          const prevTileUrl = await getTileUrl();
          await maps.setAbsoluteRange('Sep 20, 2015 @ 00:00:00.000', 'Sep 20, 2015 @ 03:00:00.000');
          const nextTileUrl = await getTileUrl();
          expect(prevTileUrl).to.eql(nextTileUrl);
        });

        it('should update MVT URL when refresh clicked', async () => {
          const prevTileUrl = await getTileUrl();
          await maps.refreshQuery();
          const nextTileUrl = await getTileUrl();
          expect(prevTileUrl).to.not.eql(nextTileUrl);
        });
      });

      describe('applyGlobalQuery: true, applyGlobalTime: true, applyForceRefresh: false', () => {
        before(async () => {
          await maps.openLayerPanel('logstash-*');
          await testSubjects.click('mapLayerPanelRespondToForceRefreshCheckbox');
          await maps.waitForLayersToLoad();
        });

        after(async () => {
          await maps.closeLayerPanel();
          await maps.setAbsoluteRange('Sep 20, 2015 @ 00:00:00.000', 'Sep 20, 2015 @ 01:00:00.000');
          await maps.setAndSubmitQuery('');
        });

        it('should update MVT URL when query changes', async () => {
          const prevTileUrl = await getTileUrl();
          await maps.setAndSubmitQuery('machine.os.raw : "win 8"');
          const nextTileUrl = await getTileUrl();
          expect(prevTileUrl).to.not.eql(nextTileUrl);
        });

        it('should update MVT URL when time changes', async () => {
          const prevTileUrl = await getTileUrl();
          await maps.setAbsoluteRange('Sep 20, 2015 @ 00:00:00.000', 'Sep 20, 2015 @ 03:00:00.000');
          const nextTileUrl = await getTileUrl();
          expect(prevTileUrl).to.not.eql(nextTileUrl);
        });

        it('should not update MVT URL when refresh clicked', async () => {
          const prevTileUrl = await getTileUrl();
          await maps.refreshQuery();
          const nextTileUrl = await getTileUrl();
          expect(prevTileUrl).to.eql(nextTileUrl);
        });
      });
    });
  });
}
