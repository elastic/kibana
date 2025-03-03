/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const { maps } = getPageObjects(['maps']);
  const security = getService('security');

  describe('Add layer panel', () => {
    before(async () => {
      await security.testUser.setRoles(['global_maps_all', 'test_logstash_reader']);
      await maps.openNewMap();
      await maps.clickAddLayer();
      await maps.selectDocumentsSource();
      await maps.selectGeoIndexPatternLayer('logstash-*');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should show unsaved layer in layer TOC', async () => {
      const vectorLayerExists = await maps.doesLayerExist('logstash-*');
      expect(vectorLayerExists).to.be(true);
    });

    it('should disable Map application save button', async () => {
      const mapSaveButton = await testSubjects.find('mapSaveButton');
      const isDisabled = await mapSaveButton.getAttribute('disabled');
      expect(isDisabled).to.be('true');
    });

    it('should remove layer on cancel', async () => {
      await maps.cancelLayerAdd('logstash-*');

      const vectorLayerExists = await maps.doesLayerExist('logstash-*');
      expect(vectorLayerExists).to.be(false);
    });
  });
}
