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

  describe('layer visibility', () => {
    before(async () => {
      await security.testUser.setRoles(['test_logstash_reader', 'global_maps_all']);
      await PageObjects.maps.loadSavedMap('document example hidden');
    });

    afterEach(async () => {
      await inspector.close();
      await PageObjects.maps.refreshAndClearUnsavedChangesWarning();
      await security.testUser.restoreDefaults();
    });

    it('should not make any requests when layer is hidden', async () => {
      const noRequests = await PageObjects.maps.doesInspectorHaveRequests();
      expect(noRequests).to.equal(true);
    });

    it('should fetch layer data when layer is made visible', async () => {
      await PageObjects.maps.toggleLayerVisibility('logstash');
      const hits = await PageObjects.maps.getHits();
      expect(hits).to.equal('5');
    });
  });
}
