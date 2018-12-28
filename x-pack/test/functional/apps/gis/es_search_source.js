/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['gis']);

  describe('elasticsearch document layer', () => {
    before(async () => {
      await PageObjects.gis.loadSavedMap('document example');
    });

    after(async () => {
      await PageObjects.gis.closeInspector();
    });

    it('should re-fetch geohashgrid aggregation with refresh timer', async () => {
      async function getRequestTimestamp() {
        await PageObjects.gis.openInspectorRequestsView();
        const requestStats = await PageObjects.gis.getInspectorTableData();
        const requestTimestamp =  PageObjects.gis.getInspectorStatRowHit(requestStats, 'Request timestamp');
        await PageObjects.gis.closeInspector();
        return requestTimestamp;
      }
      const beforeRefreshTimerTimestamp = await getRequestTimestamp();
      expect(beforeRefreshTimerTimestamp.length).to.be(24);
      await PageObjects.gis.triggerSingleRefresh(1000);
      const afterRefreshTimerTimestamp = await getRequestTimestamp();
      expect(beforeRefreshTimerTimestamp).not.to.equal(afterRefreshTimerTimestamp);
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
