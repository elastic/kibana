/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps']);
  const inspector = getService('inspector');

  const VECTOR_SOURCE_ID = '67c1de2c-2fc5-4425-8983-094b589afe61';

  describe('point to point source', () => {
    before(async () => {
      await PageObjects.maps.loadSavedMap('pew pew demo');
    });

    it('should request source clusters for destination locations', async () => {
      await inspector.open();
      await inspector.openInspectorRequestsView();
      const requestStats = await inspector.getTableData();
      const hits = PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
      const totalHits = PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits (total)');
      await inspector.close();

      expect(hits).to.equal('0');
      expect(totalHits).to.equal('4');
    });

    it('should render lines', async () => {
      const mapboxStyle = await PageObjects.maps.getMapboxStyle();
      const features = mapboxStyle.sources[VECTOR_SOURCE_ID].data.features;
      expect(features.length).to.equal(2);
      expect(features[0].geometry.type).to.equal('LineString');
    });
  });
}
