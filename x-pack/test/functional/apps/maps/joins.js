/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

const JOIN_PROPERTY_NAME = '__kbnjoin__max_of_prop1_groupby_meta_for_geo_shapes*.shape_name';
const EXPECTED_JOIN_VALUES = {
  alpha: 10,
  bravo: 3,
  charlie: 12,
  tango: undefined
};

const VECTOR_SOURCE_ID = 'n1t6f';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps']);
  const inspector = getService('inspector');

  describe('layer with joins', () => {
    before(async () => {
      await PageObjects.maps.loadSavedMap('join example');
    });

    after(async () => {
      await inspector.close();
    });

    it('should re-fetch join with refresh timer', async () => {
      async function getRequestTimestamp() {
        await PageObjects.maps.openInspectorRequest('meta_for_geo_shapes*.shape_name');
        const requestStats = await inspector.getTableData();
        const requestTimestamp =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Request timestamp');
        await inspector.close();
        return requestTimestamp;
      }

      const beforeRefreshTimerTimestamp = await getRequestTimestamp();
      expect(beforeRefreshTimerTimestamp.length).to.be(24);
      await PageObjects.maps.triggerSingleRefresh(1000);
      const afterRefreshTimerTimestamp = await getRequestTimestamp();
      expect(beforeRefreshTimerTimestamp).not.to.equal(afterRefreshTimerTimestamp);
    });

    it('should show dynamic data range in legend', async () => {
      const layerTOCDetails = await PageObjects.maps.getLayerTOCDetails('geo_shapes*');
      const split = layerTOCDetails.trim().split('\n');

      const min = split[0];
      expect(min).to.equal('3');

      const max = split[2];
      expect(max).to.equal('12');
    });

    it('should decorate feature properties with join property', async () => {
      const mapboxStyle = await PageObjects.maps.getMapboxStyle();
      expect(mapboxStyle.sources[VECTOR_SOURCE_ID].data.features.length).to.equal(4);

      mapboxStyle.sources.n1t6f.data.features.forEach(({ properties }) => {
        if (properties.name === 'tango') {
          //left join, which means we won't rescale joins that do not match
          expect(properties.hasOwnProperty(JOIN_PROPERTY_NAME)).to.be(false);
        } else {
          expect(properties.hasOwnProperty(JOIN_PROPERTY_NAME)).to.be(true);
        }
        expect(properties[JOIN_PROPERTY_NAME]).to.be(EXPECTED_JOIN_VALUES[properties.name]);
      });
    });

    it('should style fills, points and lines independently', async () => {
      const mapboxStyle = await PageObjects.maps.getMapboxStyle();
      const layersForVectorSource = mapboxStyle.layers.filter(mbLayer => {
        return mbLayer.id.startsWith(VECTOR_SOURCE_ID);
      });

      //circle layer for points
      // eslint-disable-next-line max-len
      expect(layersForVectorSource[0]).to.eql({ 'id': 'n1t6f_circle', 'type': 'circle', 'source': 'n1t6f', 'minzoom': 0, 'maxzoom': 24, 'filter': ['any', ['==', ['geometry-type'], 'Point'], ['==', ['geometry-type'], 'MultiPoint']],  'layout': { 'visibility': 'visible' }, 'paint': { 'circle-color': ['interpolate', ['linear'], ['coalesce', ['feature-state', '__kbn__scaled(__kbnjoin__max_of_prop1_groupby_meta_for_geo_shapes*.shape_name)'], -1], -1, 'rgba(0,0,0,0)', 0, '#f7faff', 0.125, '#ddeaf7', 0.25, '#c5daee', 0.375, '#9dc9e0', 0.5, '#6aadd5', 0.625, '#4191c5', 0.75, '#2070b4', 0.875, '#072f6b'], 'circle-opacity': 0.75, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-opacity': 0.75, 'circle-stroke-width': 1, 'circle-radius': 10 } });

      //fill layer
      // eslint-disable-next-line max-len
      expect(layersForVectorSource[1]).to.eql({ 'id': 'n1t6f_fill', 'type': 'fill', 'source': 'n1t6f', 'minzoom': 0, 'maxzoom': 24, 'filter': ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']], 'layout': { 'visibility': 'visible' }, 'paint': { 'fill-color': ['interpolate', ['linear'], ['coalesce', ['feature-state', '__kbn__scaled(__kbnjoin__max_of_prop1_groupby_meta_for_geo_shapes*.shape_name)'], -1], -1, 'rgba(0,0,0,0)', 0, '#f7faff', 0.125, '#ddeaf7', 0.25, '#c5daee', 0.375, '#9dc9e0', 0.5, '#6aadd5', 0.625, '#4191c5', 0.75, '#2070b4', 0.875, '#072f6b'], 'fill-opacity': 0.75 } }
      );

      //line layer for borders
      // eslint-disable-next-line max-len
      expect(layersForVectorSource[2]).to.eql({ 'id': 'n1t6f_line', 'type': 'line', 'source': 'n1t6f', 'minzoom': 0, 'maxzoom': 24, 'filter': ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon'], ['==', ['geometry-type'], 'LineString'], ['==', ['geometry-type'], 'MultiLineString']], 'layout': { 'visibility': 'visible' }, 'paint': { 'line-color': '#FFFFFF', 'line-opacity': 0.75, 'line-width': 1 } });

    });

    describe('query bar', () => {
      before(async () => {
        await PageObjects.maps.setAndSubmitQuery('prop1 < 10 or _index : "geo_shapes*"');
      });

      afterEach(async () => {
        await inspector.close();
      });

      it('should apply query to join request', async () => {
        await PageObjects.maps.openInspectorRequest('meta_for_geo_shapes*.shape_name');
        const requestStats = await inspector.getTableData();
        const totalHits =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits (total)');
        expect(totalHits).to.equal('3');
        const hits =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
        expect(hits).to.equal('0'); // aggregation requests do not return any documents
        const indexPatternName =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Index pattern');
        expect(indexPatternName).to.equal('meta_for_geo_shapes*');
      });

      it('should not apply query to join request when apply global query is disabled', async () => {
        await PageObjects.maps.openLayerPanel('geo_shapes*');
        await PageObjects.maps.disableApplyGlobalQuery();

        await PageObjects.maps.openInspectorRequest('meta_for_geo_shapes*.shape_name');
        const requestStats = await inspector.getTableData();
        const totalHits =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits (total)');
        expect(totalHits).to.equal('6');
        const hits =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
        expect(hits).to.equal('0'); // aggregation requests do not return any documents
        const indexPatternName =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Index pattern');
        expect(indexPatternName).to.equal('meta_for_geo_shapes*');
      });
    });


    describe('inspector', () => {
      afterEach(async () => {
        await inspector.close();
      });

      it('should not contain any elasticsearch request after layer is deleted', async () => {
        await PageObjects.maps.removeLayer('geo_shapes*');
        const noRequests = await PageObjects.maps.doesInspectorHaveRequests();
        expect(noRequests).to.equal(true);
      });
    });
  });
}
