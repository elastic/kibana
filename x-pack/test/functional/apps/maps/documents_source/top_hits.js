/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

const VECTOR_SOURCE_ID = 'z52lq';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps']);
  const inspector = getService('inspector');

  describe('top hits', () => {
    before(async () => {
      await PageObjects.maps.loadSavedMap('document example top hits');
    });

    it('should not fetch any search hits', async () => {
      await inspector.open();
      await inspector.openInspectorRequestsView();
      const requestStats = await inspector.getTableData();
      const totalHits =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits (total)');
      expect(totalHits).to.equal('13190');
      const hits =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
      expect(hits).to.equal('0'); // aggregation requests do not return any documents
    });

    it('should display top hits per entity', async () => {
      const mapboxStyle = await PageObjects.maps.getMapboxStyle();
      expect(mapboxStyle.sources[VECTOR_SOURCE_ID].data.features.length).to.equal(10);
    });

    it('should apply query to top hits request', async () => {
      await PageObjects.maps.setAndSubmitQuery('machine.os.raw : "win 8"');
      const mapboxStyle = await PageObjects.maps.getMapboxStyle();
      expect(mapboxStyle.sources[VECTOR_SOURCE_ID].data.features.length).to.equal(2);
    });
  });
}
