/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['maps', 'common']);

  describe('Add layer panel', () => {
    before(async () => {
      await PageObjects.maps.openNewMap();
    });

    beforeEach(async () => {
      await PageObjects.maps.clickAddLayer();
    });

    afterEach(async () => {
      await PageObjects.maps.cancelLayerAdd();
    });

    it('should open on clicking "Add layer"', async () => {
      // Verify panel page element is open
      const panelOpen = await PageObjects.maps.isLayerAddPanelOpen();
      expect(panelOpen).to.be(true);
    });

    it('should close on clicking "Cancel"', async () => {
      // Verify panel page element is open
      let panelOpen = await PageObjects.maps.isLayerAddPanelOpen();
      expect(panelOpen).to.be(true);
      // Click cancel
      await PageObjects.maps.cancelLayerAdd();
      // Verify panel isn't open
      panelOpen = await PageObjects.maps.isLayerAddPanelOpen();
      expect(panelOpen).to.be(false);
    });

    it('should close & remove layer on clicking "Cancel" after selecting layer',
      async () => {
        // Verify panel page element is open
        let panelOpen = await PageObjects.maps.isLayerAddPanelOpen();
        expect(panelOpen).to.be(true);
        // Select source
        await PageObjects.maps.selectVectorSource();
        // Select layer
        const vectorLayer = await PageObjects.maps.selectVectorLayer();
        // Confirm layer added
        await PageObjects.maps.waitForLayersToLoad();
        let vectorLayerExists = await PageObjects.maps.doesLayerExist(vectorLayer);
        expect(vectorLayerExists).to.be(true);
        // Click cancel
        await PageObjects.maps.cancelLayerAdd();
        // Verify panel isn't open
        panelOpen = await PageObjects.maps.isLayerAddPanelOpen();
        expect(panelOpen).to.be(false);
        // Verify layer has been removed
        await PageObjects.maps.waitForLayerDeleted(vectorLayer);
        vectorLayerExists = await PageObjects.maps.doesLayerExist(vectorLayer);
        expect(vectorLayerExists).to.be(false);
      });

    it('should close and remove layer on map save', async () => {
      // Verify panel page element is open
      let panelOpen = await PageObjects.maps.isLayerAddPanelOpen();
      expect(panelOpen).to.be(true);
      // Select source
      await PageObjects.maps.selectVectorSource();
      // Select layer
      const vectorLayer = await PageObjects.maps.selectVectorLayer();
      // Confirm layer added
      await PageObjects.maps.waitForLayersToLoad();
      let vectorLayerExists = await PageObjects.maps.doesLayerExist(vectorLayer);
      expect(vectorLayerExists).to.be(true);
      // Click save
      await PageObjects.maps.saveMap('Mappishness');
      // Verify panel isn't open
      panelOpen = await PageObjects.maps.isLayerAddPanelOpen();
      expect(panelOpen).to.be(false);
      // Verify layer has been removed
      await PageObjects.maps.waitForLayerDeleted(vectorLayer);
      vectorLayerExists = await PageObjects.maps.doesLayerExist(vectorLayer);
      expect(vectorLayerExists).to.be(false);
    });
  });
}
