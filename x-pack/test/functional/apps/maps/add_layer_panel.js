/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['maps']);

  describe('Add layer panel', () => {
    before(async () => {
      await PageObjects.maps.openNewMap();
    });

    describe('visibility', () => {
      it('should open on clicking "Add layer"', async () => {
        await PageObjects.maps.clickAddLayer();
        const panelOpen = await PageObjects.maps.isLayerAddPanelOpen();
        expect(panelOpen).to.be(true);
      });

      it('should close on clicking "Cancel"', async () => {
        await PageObjects.maps.cancelLayerAdd();
        const panelOpen = await PageObjects.maps.isLayerAddPanelOpen();
        expect(panelOpen).to.be(false);
      });
    });

    describe('with unsaved layer', () => {
      const LAYER_NAME = 'World Countries';

      before(async () => {
        await PageObjects.maps.clickAddLayer();
        await PageObjects.maps.selectVectorSource();
        await PageObjects.maps.selectVectorLayer(LAYER_NAME);
      });

      it('should show unsaved layer in layer TOC', async () => {
        const vectorLayerExists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(vectorLayerExists).to.be(true);
      });

      it('should disable Map application save button', async () => {
        // saving map should be a no-op because its diabled
        await testSubjects.click('mapSaveButton');

        const panelOpen = await PageObjects.maps.isLayerAddPanelOpen();
        expect(panelOpen).to.be(true);
        const vectorLayerExists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(vectorLayerExists).to.be(true);
      });

      it('should close & remove layer on clicking "Cancel"', async () => {
        await PageObjects.maps.cancelLayerAdd(LAYER_NAME);

        const panelOpen = await PageObjects.maps.isLayerAddPanelOpen();
        expect(panelOpen).to.be(false);
        const vectorLayerExists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(vectorLayerExists).to.be(false);
      });
    });
  });
}
