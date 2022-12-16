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
  const security = getService('security');

  describe('search hits', () => {
    before(async () => {
      await security.testUser.setRoles(
        [
          'global_maps_all',
          'test_logstash_reader',
          'antimeridian_points_reader',
          'antimeridian_shapes_reader',
        ],
        { skipBrowserRefresh: true }
      );
      await PageObjects.maps.loadSavedMap('document example');
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

    it('should re-fetch documents with refresh timer', async () => {
      const beforeRefreshTimerTimestamp = await getRequestTimestamp();
      expect(beforeRefreshTimerTimestamp.length).to.be(24);
      await PageObjects.maps.triggerSingleRefresh(1000);
      const afterRefreshTimerTimestamp = await getRequestTimestamp();
      expect(beforeRefreshTimerTimestamp).not.to.equal(afterRefreshTimerTimestamp);
    });

    describe('inspector', () => {
      it('should register elasticsearch request in inspector', async () => {
        const hits = await PageObjects.maps.getHits();
        expect(hits).to.equal('5');
      });
    });

    describe('query bar', () => {
      before(async () => {
        await PageObjects.maps.setAndSubmitQuery(
          'machine.os.raw : "win 8" OR machine.os.raw : "ios"'
        );
      });

      after(async () => {
        await PageObjects.maps.setAndSubmitQuery('');
      });

      it('should apply query to search request', async () => {
        await inspector.open();
        await inspector.openInspectorRequestsView();
        const requestStats = await inspector.getTableData();
        const hits = PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
        await inspector.close();
        expect(hits).to.equal('2');
      });

      it('should re-fetch query when "refresh" is clicked', async () => {
        const beforeQueryRefreshTimestamp = await getRequestTimestamp();
        await PageObjects.maps.refreshQuery();
        const afterQueryRefreshTimestamp = await getRequestTimestamp();
        expect(beforeQueryRefreshTimestamp).not.to.equal(afterQueryRefreshTimestamp);
      });

      it('should apply query to fit to bounds', async () => {
        // Set view to other side of world so no matching results
        await PageObjects.maps.setView(-15, -100, 6);
        await PageObjects.maps.clickFitToBounds('logstash');
        const { lat, lon, zoom } = await PageObjects.maps.getView();
        expect(Math.round(lat)).to.equal(41);
        expect(Math.round(lon)).to.equal(-102);

        // Centering is correct, but screen-size and dpi affect zoom level,
        // causing this test to be brittle in different environments
        // Expecting zoom-level to be between ]4,5]
        expect(Math.ceil(zoom)).to.equal(5);
      });
    });

    describe('layer query', () => {
      before(async () => {
        await PageObjects.maps.setLayerQuery('logstash', 'machine.os.raw : "ios"');
      });

      it('should apply layer query to search request', async () => {
        await inspector.open();
        await inspector.openInspectorRequestsView();
        const requestStats = await inspector.getTableData();
        const hits = PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
        await inspector.close();
        expect(hits).to.equal('2');
      });

      it('should apply layer query to fit to bounds', async () => {
        // Set view to other side of world so no matching results
        await PageObjects.maps.setView(-15, -100, 6);
        await PageObjects.maps.clickFitToBounds('logstash');
        const { lat, lon, zoom } = await PageObjects.maps.getView();
        expect(Math.round(lat)).to.equal(43);
        expect(Math.round(lon)).to.equal(-102);
        expect(Math.round(zoom)).to.equal(5);
      });
    });

    describe('filter by extent', () => {
      it('should handle geo_point filtering with extents that cross antimeridian', async () => {
        await PageObjects.maps.loadSavedMap('antimeridian points example');
        const hits = await PageObjects.maps.getHits();
        expect(hits).to.equal('2');
      });

      it('should handle geo_shape filtering with extents that cross antimeridian', async () => {
        await PageObjects.maps.loadSavedMap('antimeridian shapes example');
        const hits = await PageObjects.maps.getHits();
        expect(hits).to.equal('2');
      });
    });
  });
}
