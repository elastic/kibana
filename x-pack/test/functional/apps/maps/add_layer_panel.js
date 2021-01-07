/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['maps']);
  const security = getService('security');

  describe('Add layer panel', () => {
    const LAYER_NAME = 'World Countries';

    before(async () => {
      await security.testUser.setRoles(['global_maps_all']);
      await PageObjects.maps.openNewMap();
      await PageObjects.maps.clickAddLayer();
      await PageObjects.maps.selectEMSBoundariesSource();
      await PageObjects.maps.selectVectorLayer(LAYER_NAME);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should show unsaved layer in layer TOC', async () => {
      const vectorLayerExists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
      expect(vectorLayerExists).to.be(true);
    });

    it('should disable Map application save button', async () => {
      const mapSaveButton = await testSubjects.find('mapSaveButton');
      const isDisabled = await mapSaveButton.getAttribute('disabled');
      expect(isDisabled).to.be('true');

      const panelOpen = await PageObjects.maps.isLayerAddPanelOpen();
      expect(panelOpen).to.be(true);
      const vectorLayerExists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
      expect(vectorLayerExists).to.be(true);
    });

    it('should remove layer on cancel', async () => {
      await PageObjects.maps.cancelLayerAdd(LAYER_NAME);

      const vectorLayerExists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
      expect(vectorLayerExists).to.be(false);
    });
  });
}
