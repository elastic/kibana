/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

const JOIN_PROPERTY_NAME = '__kbnjoin__max_of_prop1__855ccb86-fe42-11e8-8eb2-f2801f1b9fd1';
const EXPECTED_JOIN_VALUES = {
  alpha: 10,
  bravo: 3,
  charlie: 12,
  tango: undefined,
};

const VECTOR_SOURCE_ID = 'n1t6f';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps']);
  const inspector = getService('inspector');
  const security = getService('security');

  describe('layer with joins', () => {
    before(async () => {
      await security.testUser.setRoles(
        ['global_maps_all', 'geoshape_data_reader', 'meta_for_geoshape_data_reader'],
        { skipBrowserRefresh: true }
      );
      await PageObjects.maps.loadSavedMap('join example');
    });

    after(async () => {
      await inspector.close();
      await PageObjects.maps.refreshAndClearUnsavedChangesWarning();
      await security.testUser.restoreDefaults();
    });

    it('should re-fetch join with refresh timer', async () => {
      async function getRequestTimestamp() {
        await PageObjects.maps.openInspectorRequest('meta_for_geo_shapes*.runtime_shape_name');
        const requestStats = await inspector.getTableData();
        const requestTimestamp = PageObjects.maps.getInspectorStatRowHit(
          requestStats,
          'Request timestamp'
        );
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

      //field display name
      expect(split[0]).to.equal('max prop1');

      //bands 1-8
      expect(split[1]).to.equal('< 4.13');
      expect(split[2]).to.equal('4.13 up to 5.25');
      expect(split[3]).to.equal('5.25 up to 6.38');
      expect(split[4]).to.equal('6.38 up to 7.5');
      expect(split[5]).to.equal('7.5 up to 8.63');
      expect(split[6]).to.equal('8.63 up to 9.75');
      expect(split[7]).to.equal('9.75 up to 11');
      expect(split[8]).to.equal('>= 11');
    });

    it('should decorate feature properties with join property', async () => {
      const mapboxStyle = await PageObjects.maps.getMapboxStyle();
      expect(mapboxStyle.sources[VECTOR_SOURCE_ID].data.features.length).to.equal(8);

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

    it('should flag only the joined features as visible', async () => {
      const mapboxStyle = await PageObjects.maps.getMapboxStyle();
      const vectorSource = mapboxStyle.sources[VECTOR_SOURCE_ID];

      const visibilitiesOfFeatures = vectorSource.data.features.map((feature) => {
        return feature.properties.__kbn_isvisibleduetojoin__;
      });

      expect(visibilitiesOfFeatures).to.eql([
        false,
        true,
        true,
        true,
        // geo centroids for above features
        false,
        true,
        true,
        true,
      ]);
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
        const { rawResponse: joinResponse } = await PageObjects.maps.getResponse(
          'meta_for_geo_shapes*.runtime_shape_name'
        );
        expect(joinResponse.aggregations.join.buckets.length).to.equal(2);
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
        const { rawResponse: joinResponse } = await PageObjects.maps.getResponse(
          'meta_for_geo_shapes*.runtime_shape_name'
        );
        expect(joinResponse.aggregations.join.buckets.length).to.equal(1);
      });

      it('should update dynamic data range in legend with new results', async () => {
        const layerTOCDetails = await PageObjects.maps.getLayerTOCDetails('geo_shapes*');
        const split = layerTOCDetails.trim().split('\n');

        const min = split[0];
        expect(min).to.equal('max prop1');

        const max = split[1];
        expect(max).to.equal('12'); // just single band because single value
      });

      it('should flag only the joined features as visible', async () => {
        const mapboxStyle = await PageObjects.maps.getMapboxStyle();
        const vectorSource = mapboxStyle.sources[VECTOR_SOURCE_ID];

        const visibilitiesOfFeatures = vectorSource.data.features.map((feature) => {
          return feature.properties.__kbn_isvisibleduetojoin__;
        });

        expect(visibilitiesOfFeatures).to.eql([
          false,
          true,
          false,
          false,
          // geo centroids for above features
          false,
          true,
          false,
          false,
        ]);
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
