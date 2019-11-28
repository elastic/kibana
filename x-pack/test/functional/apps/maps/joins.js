/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import _ from 'lodash';

import { MAPBOX_STYLES } from './mapbox_styles';

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
      // Color is dynamically obtained from eui source lib
      const dynamicColor = layersForVectorSource[0].paint['circle-stroke-color'];

      //circle layer for points
      expect(layersForVectorSource[0]).to.eql(
        _.set(MAPBOX_STYLES.POINT_LAYER, 'paint.circle-stroke-color', dynamicColor)
      );

      //fill layer
      expect(layersForVectorSource[1]).to.eql(MAPBOX_STYLES.FILL_LAYER);

      //line layer for borders
      expect(layersForVectorSource[2]).to.eql(
        _.set(MAPBOX_STYLES.LINE_LAYER, 'paint.line-color', dynamicColor)
      );

    });

    it('should flag only the joined features as visible', async () => {
      const mapboxStyle = await PageObjects.maps.getMapboxStyle();
      const vectorSource = mapboxStyle.sources[VECTOR_SOURCE_ID];

      const visibilitiesOfFeatures = vectorSource.data.features.map(feature => {
        return feature.properties.__kbn_isvisibleduetojoin__;
      });

      expect(visibilitiesOfFeatures).to.eql([false, true, true, true]);
    });


    describe('query bar', () => {
      before(async () => {
        await PageObjects.maps.setAndSubmitQuery('prop1 < 10');
      });

      after(async () => {
        await inspector.close();
        await PageObjects.maps.setAndSubmitQuery('');
      });

      it('should not apply query to source and apply query to join', async () => {
        await PageObjects.maps.openInspectorRequest('meta_for_geo_shapes*.shape_name');
        const requestStats = await inspector.getTableData();
        const totalHits =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits (total)');
        expect(totalHits).to.equal('3');
        const hits =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
        expect(hits).to.equal('0'); // aggregation requests do not return any documents
        const indexPatternName =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Index pattern');
        expect(indexPatternName).to.equal('meta_for_geo_shapes*');
      });
    });

    describe('where clause', () => {
      before(async () => {
        await PageObjects.maps.setJoinWhereQuery('geo_shapes*', 'prop1 >= 11');
      });

      after(async () => {
        await PageObjects.maps.closeLayerPanel();
      });

      it('should apply query to join request', async () => {
        await PageObjects.maps.openInspectorRequest('meta_for_geo_shapes*.shape_name');
        const requestStats = await inspector.getTableData();
        const totalHits =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits (total)');
        expect(totalHits).to.equal('2');
        const hits =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
        expect(hits).to.equal('0'); // aggregation requests do not return any documents
        await inspector.close();
      });

      it('should update dynamic data range in legend with new results', async () => {
        const layerTOCDetails = await PageObjects.maps.getLayerTOCDetails('geo_shapes*');
        const split = layerTOCDetails.trim().split('\n');

        const min = split[0];
        expect(min).to.equal('12');

        const max = split[2];
        expect(max).to.equal('12');
      });

      it('should flag only the joined features as visible', async () => {
        const mapboxStyle = await PageObjects.maps.getMapboxStyle();
        const vectorSource = mapboxStyle.sources[VECTOR_SOURCE_ID];

        const visibilitiesOfFeatures = vectorSource.data.features.map(feature => {
          return feature.properties.__kbn_isvisibleduetojoin__;
        });

        expect(visibilitiesOfFeatures).to.eql([false, true, false, false]);
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
