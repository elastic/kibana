/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps']);
  const inspector = getService('inspector');
  const DOC_COUNT_PROP_NAME = 'doc_count';
  const security = getService('security');

  describe('geojson vector layer - es geo grid source', () => {
    const DATA_CENTER_LON = -98;
    const DATA_CENTER_LAT = 38;

    before(async () => {
      await security.testUser.setRoles(
        ['global_maps_all', 'test_logstash_reader', 'geoshape_data_reader'],
        { skipBrowserRefresh: true }
      );
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    async function getRequestTimestamp() {
      await inspector.open();
      await inspector.openInspectorRequestsView();
      const requestStats = await inspector.getTableData();
      const requestTimestamp = PageObjects.maps.getInspectorStatRowHit(
        requestStats,
        'Request timestamp'
      );
      await inspector.close();
      return requestTimestamp;
    }

    function makeRequestTestsForGeoPrecision(
      LAYER_ID,
      expectedNumFeaturesZoomedOut,
      expectedNumPartialFeatures
    ) {
      describe('geoprecision - requests', () => {
        let beforeTimestamp;
        beforeEach(async () => {
          await PageObjects.maps.setView(DATA_CENTER_LAT, DATA_CENTER_LON, 1);
          beforeTimestamp = await getRequestTimestamp();
        });

        it('should not rerequest when pan changes do not move map view area outside of buffer', async () => {
          await PageObjects.maps.setView(DATA_CENTER_LAT + 10, DATA_CENTER_LON + 10, 1);
          const afterTimestamp = await getRequestTimestamp();
          expect(afterTimestamp).to.equal(beforeTimestamp);
        });

        it('should not rerequest when zoom changes do not cause geotile_grid precision to change', async () => {
          await PageObjects.maps.setView(DATA_CENTER_LAT, DATA_CENTER_LON, 1.4);
          const beforeSameZoom = await getRequestTimestamp();
          await PageObjects.maps.setView(DATA_CENTER_LAT, DATA_CENTER_LON, 1.6);
          const afterTimestamp = await getRequestTimestamp();
          expect(afterTimestamp).to.equal(beforeSameZoom);
        });

        it('should rerequest when zoom changes causes the geotile_grid precision to change', async () => {
          await PageObjects.maps.setView(DATA_CENTER_LAT, DATA_CENTER_LON, 4);
          const afterTimestamp = await getRequestTimestamp();
          expect(afterTimestamp).not.to.equal(beforeTimestamp);
        });
      });

      describe('geotile grid precision - data', () => {
        beforeEach(async () => {
          await PageObjects.maps.setView(DATA_CENTER_LAT, DATA_CENTER_LON, 1);
        });

        it('should not return any data when the extent does not cover the data bounds', async () => {
          await PageObjects.maps.setView(64, 179, 5);
          const mapboxStyle = await PageObjects.maps.getMapboxStyle();
          expect(mapboxStyle.sources[LAYER_ID].data.features.length).to.equal(0);
        });

        it('should request the data when the map covers the databounds', async () => {
          const mapboxStyle = await PageObjects.maps.getMapboxStyle();
          expect(mapboxStyle.sources[LAYER_ID].data.features.length).to.equal(
            expectedNumFeaturesZoomedOut
          );
        });

        it('should request only partial data when the map only covers part of the databounds', async () => {
          //todo this verifies the extent-filtering behavior (not really the correct application of geotile_grid-precision), and should ideally be moved to its own section
          await PageObjects.maps.setView(DATA_CENTER_LAT, DATA_CENTER_LON, 6);
          const mapboxStyle = await PageObjects.maps.getMapboxStyle();
          expect(mapboxStyle.sources[LAYER_ID].data.features.length).to.equal(
            expectedNumPartialFeatures
          );
        });
      });
    }

    describe('geo_point', () => {
      before(async () => {
        await PageObjects.maps.loadSavedMap('geo grid vector grid example');
      });

      const LAYER_ID = 'g1xkv';

      const MAX_OF_BYTES_PROP_NAME = 'max_of_bytes';

      it('should re-fetch geotile_grid aggregation with refresh timer', async () => {
        const beforeRefreshTimerTimestamp = await getRequestTimestamp();
        expect(beforeRefreshTimerTimestamp.length).to.be(24);
        await PageObjects.maps.triggerSingleRefresh(1000);
        const afterRefreshTimerTimestamp = await getRequestTimestamp();
        expect(beforeRefreshTimerTimestamp).not.to.equal(afterRefreshTimerTimestamp);
      });

      it('should decorate feature properties with metrics properterties', async () => {
        const mapboxStyle = await PageObjects.maps.getMapboxStyle();
        expect(mapboxStyle.sources[LAYER_ID].data.features.length).to.equal(12);

        mapboxStyle.sources[LAYER_ID].data.features.forEach(({ properties }) => {
          expect(properties.hasOwnProperty(MAX_OF_BYTES_PROP_NAME)).to.be(true);
          expect(properties.hasOwnProperty(DOC_COUNT_PROP_NAME)).to.be(true);
        });
      });

      makeRequestTestsForGeoPrecision(LAYER_ID, 8, 4);

      describe('query bar', () => {
        before(async () => {
          await PageObjects.maps.setAndSubmitQuery('machine.os.raw : "win 8"');
          await PageObjects.maps.setView(0, 0, 0);
        });

        after(async () => {
          await PageObjects.maps.setAndSubmitQuery('');
        });

        it('should apply query to geotile_grid aggregation request', async () => {
          const { rawResponse: response } = await PageObjects.maps.getResponse();
          expect(response.aggregations.gridSplit.buckets.length).to.equal(1);
        });
      });

      describe('inspector', () => {
        afterEach(async () => {
          await inspector.close();
        });

        it('should contain geotile_grid aggregation elasticsearch request', async () => {
          const { rawResponse: response } = await PageObjects.maps.getResponse();
          expect(response.aggregations.gridSplit.buckets.length).to.equal(4);
        });

        it('should not contain any elasticsearch request after layer is deleted', async () => {
          await PageObjects.maps.removeLayer('logstash-*');
          const noRequests = await PageObjects.maps.doesInspectorHaveRequests();
          expect(noRequests).to.equal(true);
        });
      });
    });

    describe('geo_shape', () => {
      before(async () => {
        await PageObjects.maps.loadSavedMap('geo grid vector grid example with shape');
      });

      const LAYER_ID = 'g1xkv';
      it('should get expected number of grid cells', async () => {
        const mapboxStyle = await PageObjects.maps.getMapboxStyle();
        expect(mapboxStyle.sources[LAYER_ID].data.features.length).to.equal(26);
      });

      describe('inspector', () => {
        afterEach(async () => {
          await inspector.close();
        });

        it('should contain geotile_grid aggregation elasticsearch request', async () => {
          const { rawResponse: response } = await PageObjects.maps.getResponse();
          expect(response.aggregations.gridSplit.buckets.length).to.equal(13);
        });
      });
    });
  });
}
