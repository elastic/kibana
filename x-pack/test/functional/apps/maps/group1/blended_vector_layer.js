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

  describe('blended vector layer', () => {
    before(async () => {
      await security.testUser.setRoles(['test_logstash_reader', 'global_maps_all']);
      await PageObjects.maps.loadSavedMap('blended document example');
    });

    afterEach(async () => {
      await inspector.close();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should request documents when zoomed to smaller regions showing less data', async () => {
      const { rawResponse: response } = await PageObjects.maps.getResponse();
      // Allow a range of hits to account for variances in browser window size.
      expect(response.hits.hits.length).to.be.within(5, 12);
    });

    it('should request clusters when zoomed to larger regions showing lots of data', async () => {
      await PageObjects.maps.setView(20, -90, 2);
      const { rawResponse: response } = await PageObjects.maps.getResponse();
      expect(response.aggregations.gridSplit.buckets.length).to.equal(17);
    });

    it('should request documents when query narrows data', async () => {
      await PageObjects.maps.setAndSubmitQuery('bytes > 19000');
      const { rawResponse: response } = await PageObjects.maps.getResponse();
      expect(response.hits.hits.length).to.equal(75);
    });
  });
}
