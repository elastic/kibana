/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps']);
  const security = getService('security');

  const VECTOR_SOURCE_ID = '67c1de2c-2fc5-4425-8983-094b589afe61';

  describe('point to point source', () => {
    before(async () => {
      await security.testUser.setRoles(['global_maps_all', 'geoconnections_data_reader']);
      await PageObjects.maps.loadSavedMap('pew pew demo');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should request source clusters for destination locations', async () => {
      const { rawResponse: response } = await PageObjects.maps.getResponse();
      expect(response.aggregations.destSplit.buckets.length).to.equal(2);
    });

    it('should render lines', async () => {
      const mapboxStyle = await PageObjects.maps.getMapboxStyle();
      const features = mapboxStyle.sources[VECTOR_SOURCE_ID].data.features;
      expect(features.length).to.equal(4);
      expect(features[0].geometry.type).to.equal('LineString');
    });

    it('should fit to bounds', async () => {
      // Set view to other side of world so no matching results
      await PageObjects.maps.setView(-70, 0, 6);
      await PageObjects.maps.clickFitToBounds('connections');
      const { lat, lon } = await PageObjects.maps.getView();
      expect(Math.round(lat)).to.equal(41);
      expect(Math.round(lon)).to.equal(-70);
    });
  });
}
