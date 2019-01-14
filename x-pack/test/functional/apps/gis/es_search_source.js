/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['gis']);
  const queryBar = getService('queryBar');

  describe('elasticsearch document layer', () => {
    before(async () => {
      await PageObjects.gis.loadSavedMap('document example');
    });

    async function getRequestTimestamp() {
      await PageObjects.gis.openInspectorRequestsView();
      const requestStats = await PageObjects.gis.getInspectorTableData();
      const requestTimestamp =  PageObjects.gis.getInspectorStatRowHit(requestStats, 'Request timestamp');
      await PageObjects.gis.closeInspector();
      return requestTimestamp;
    }

    it('should re-fetch geohashgrid aggregation with refresh timer', async () => {
      const beforeRefreshTimerTimestamp = await getRequestTimestamp();
      expect(beforeRefreshTimerTimestamp.length).to.be(24);
      await PageObjects.gis.triggerSingleRefresh(1000);
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
        await PageObjects.gis.openInspectorRequestsView();
        const requestStats = await PageObjects.gis.getInspectorTableData();
        const hits = PageObjects.gis.getInspectorStatRowHit(requestStats, 'Hits');
        await PageObjects.gis.closeInspector();
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
        await PageObjects.gis.openInspectorRequestsView();
        const requestStats = await PageObjects.gis.getInspectorTableData();
        const hits = PageObjects.gis.getInspectorStatRowHit(requestStats, 'Hits');
        expect(hits).to.equal('6');
      });
    });
  });
}
