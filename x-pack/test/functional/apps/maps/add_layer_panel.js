/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps', 'common']);
  const MapsObject = PageObjects.maps;
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');

  const LAYER_ADD_FORM = 'layerAddForm';
  const VECTOR_CARD_TITLE = 'vectorShapes';
  const LAYER_ADD_CANCEL_BUTTON = 'layerAddCancelButton';
  const EMS_VECTOR_COMBO_BOX = 'emsVectorComboBox';

  describe('Add layer panel', () => {
    before(async () => {
      await MapsObject.openNewMap();
    });

    beforeEach(async () => {
      await MapsObject.clickAddLayer();
    });

    afterEach(async () => {
      const cancelExists = await testSubjects.exists(LAYER_ADD_CANCEL_BUTTON);
      if (cancelExists) {
        await testSubjects.click(LAYER_ADD_CANCEL_BUTTON);
      }
    });

    it('should open on clicking "Add layer"', async () => {
      // Verify panel page element is open
      const panelOpen = await testSubjects.exists(LAYER_ADD_FORM);
      expect(panelOpen).to.be(true);
    });

    it('should close on clicking "Cancel"', async () => {
      // Verify panel page element is open
      let panelOpen = await testSubjects.exists(LAYER_ADD_FORM);
      expect(panelOpen).to.be(true);
      // Click cancel
      await testSubjects.click(LAYER_ADD_CANCEL_BUTTON);
      // Verify panel isn't open
      panelOpen = await testSubjects.exists(LAYER_ADD_FORM);
      expect(panelOpen).to.be(false);
    });

    it('should close & remove layer on clicking "Cancel" after selecting layer',
      async () => {
        // Verify panel page element is open
        let panelOpen = await testSubjects.exists(LAYER_ADD_FORM);
        expect(panelOpen).to.be(true);
        // Select source
        await testSubjects.click(VECTOR_CARD_TITLE);
        // Select layer
        const optionsStringList = await comboBox.getOptionsList(EMS_VECTOR_COMBO_BOX);
        const optionsList = optionsStringList.trim().split('\n');
        expect(optionsList.length).to.be.greaterThan(0);
        const vectorLayer = optionsList[0];
        await comboBox.set(EMS_VECTOR_COMBO_BOX, vectorLayer);
        // Confirm layer added
        await PageObjects.common.sleep(1000);
        let vectorLayerExists = await MapsObject.doesLayerExist(vectorLayer);
        expect(vectorLayerExists).to.be(true);
        // Click cancel
        await testSubjects.click(LAYER_ADD_CANCEL_BUTTON);
        // Verify panel isn't open
        panelOpen = await testSubjects.exists(LAYER_ADD_FORM);
        expect(panelOpen).to.be(false);
        // Verify layer has been removed
        await PageObjects.common.sleep(500);
        vectorLayerExists = await MapsObject.doesLayerExist(vectorLayer);
        expect(vectorLayerExists).to.be(false);
      });

    it('should close and remove layer on map save', async () => {
      // Verify panel page element is open
      let panelOpen = await testSubjects.exists(LAYER_ADD_FORM);
      expect(panelOpen).to.be(true);
      // Select source
      await testSubjects.click(VECTOR_CARD_TITLE);
      // Select layer
      const optionsStringList = await comboBox.getOptionsList(EMS_VECTOR_COMBO_BOX);
      const optionsList = optionsStringList.trim().split('\n');
      expect(optionsList.length).to.be.greaterThan(0);
      const vectorLayer = optionsList[0];
      await comboBox.set(EMS_VECTOR_COMBO_BOX, vectorLayer);
      // Confirm layer added
      await PageObjects.common.sleep(1000);
      let vectorLayerExists = await MapsObject.doesLayerExist(vectorLayer);
      expect(vectorLayerExists).to.be(true);
      // Click save
      await MapsObject.saveMap('Mappishness');
      // Verify panel isn't open
      panelOpen = await testSubjects.exists(LAYER_ADD_FORM);
      expect(panelOpen).to.be(false);
      // Verify layer has been removed
      await PageObjects.common.sleep(500);
      vectorLayerExists = await MapsObject.doesLayerExist(vectorLayer);
      expect(vectorLayerExists).to.be(false);
    });
  });
}
