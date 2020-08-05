/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps']);
  const inspector = getService('inspector');

  describe('blended vector layer', () => {
    before(async () => {
      await PageObjects.maps.loadSavedMap('blended document example');
    });

    it('should request documents when zoomed to smaller regions showing less data', async () => {
      const hits = await PageObjects.maps.getHits();
      expect(hits).to.equal('33');
    });

    it('should request clusters when zoomed to larger regions showing lots of data', async () => {
      await PageObjects.maps.setView(20, -90, 2);
      await inspector.open();
      await inspector.openInspectorRequestsView();
      const requestStats = await inspector.getTableData();
      const hits = PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
      const totalHits = PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits (total)');
      await inspector.close();

      expect(hits).to.equal('0');
      expect(totalHits).to.equal('14000');
    });

    it('should request documents when query narrows data', async () => {
      await PageObjects.maps.setAndSubmitQuery('bytes > 19000');
      const hits = await PageObjects.maps.getHits();
      expect(hits).to.equal('75');
    });
  });
}
