/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['canvas', 'common', 'header', 'maps']);
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');

  describe('maps in canvas', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      // open canvas home
      await PageObjects.common.navigateToApp('canvas');
      // create new workpad
      await PageObjects.canvas.createNewWorkpad();
      await PageObjects.canvas.setWorkpadName('maps tests');
    });

    describe('by-value', () => {
      it('creates new map embeddable', async () => {
        const originalEmbeddableCount = await PageObjects.canvas.getEmbeddableCount();
        await PageObjects.canvas.createNewVis('maps');
        await PageObjects.maps.clickSaveAndReturnButton();
        const embeddableCount = await PageObjects.canvas.getEmbeddableCount();
        expect(embeddableCount).to.eql(originalEmbeddableCount + 1);
      });

      it('edits map by-value embeddable', async () => {
        const originalEmbeddableCount = await PageObjects.canvas.getEmbeddableCount();
        await dashboardPanelActions.toggleContextMenu();
        await dashboardPanelActions.clickEdit();
        await PageObjects.maps.saveMap('canvas test map');
        const embeddableCount = await PageObjects.canvas.getEmbeddableCount();
        expect(embeddableCount).to.eql(originalEmbeddableCount);
      });
    });

    describe('by-reference', () => {
      it('adds existing map embeddable from the visualize library', async () => {
        await PageObjects.canvas.deleteSelectedElement();
        await PageObjects.canvas.clickAddFromLibrary();
        await dashboardAddPanel.addEmbeddable('canvas test map', 'map');
        await testSubjects.existOrFail('embeddablePanelHeading-canvastestmap');
      });

      it('edits map by-reference embeddable', async () => {
        await dashboardPanelActions.editPanelByTitle('canvas test map');
        await PageObjects.maps.saveMap('canvas test map v2', true, false);
        await testSubjects.existOrFail('embeddablePanelHeading-canvastestmapv2');
        await PageObjects.canvas.deleteSelectedElement();
      });
    });
  });
}
