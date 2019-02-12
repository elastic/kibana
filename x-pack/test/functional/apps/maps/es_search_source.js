/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps']);
  const queryBar = getService('queryBar');
  const inspector = getService('inspector');

  describe('elasticsearch document layer', () => {
    before(async () => {
      await PageObjects.maps.loadSavedMap('document example');
    });

    async function getRequestTimestamp() {
      await PageObjects.maps.openInspectorRequestsView();
      const requestStats = await inspector.getTableData();
      const requestTimestamp =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Request timestamp');
      await inspector.close();
      return requestTimestamp;
    }

    async function getHits() {
      await PageObjects.maps.openInspectorRequestsView();
      const requestStats = await inspector.getTableData();
      const hits = PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
      await inspector.close();
      return hits;
    }

    it('should re-fetch geohashgrid aggregation with refresh timer', async () => {
      const beforeRefreshTimerTimestamp = await getRequestTimestamp();
      expect(beforeRefreshTimerTimestamp.length).to.be(24);
      await PageObjects.maps.triggerSingleRefresh(1000);
      const afterRefreshTimerTimestamp = await getRequestTimestamp();
      expect(beforeRefreshTimerTimestamp).not.to.equal(afterRefreshTimerTimestamp);
    });

    describe('query bar', () => {
      before(async () => {
        await queryBar.setQuery('machine.os.raw : "win 8"');
        await queryBar.submitQuery();
      });

      after(async () => {
        await queryBar.setQuery('');
        await queryBar.submitQuery();
      });

      it('should apply query to search request', async () => {
        await PageObjects.maps.openInspectorRequestsView();
        const requestStats = await inspector.getTableData();
        const hits = PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
        await inspector.close();
        expect(hits).to.equal('1');
      });

      it('should re-fetch query when "refresh" is clicked', async () => {
        const beforeQueryRefreshTimestamp = await getRequestTimestamp();
        await queryBar.submitQuery();
        const afterQueryRefreshTimestamp = await getRequestTimestamp();
        expect(beforeQueryRefreshTimestamp).not.to.equal(afterQueryRefreshTimestamp);
      });
    });

    describe('inspector', () => {
      it('should register elasticsearch request in inspector', async () => {
        const hits = await getHits();
        expect(hits).to.equal('6');
      });
    });

    describe('filter by extent', () => {
      it('should handle geo_point filtering with extents that cross antimeridian', async () => {
        await PageObjects.maps.loadSavedMap('antimeridian points example');
        const hits = await getHits();
        expect(hits).to.equal('2');
      });

      it('should handle geo_shape filtering with extents that cross antimeridian', async () => {
        await PageObjects.maps.loadSavedMap('antimeridian shapes example');
        const hits = await getHits();
        expect(hits).to.equal('2');
      });
    });
  });
}
