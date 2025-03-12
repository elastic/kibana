/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { canvas, maps } = getPageObjects(['canvas', 'maps']);
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');

  describe('maps in canvas', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      // canvas application is only available when installation contains canvas workpads
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/canvas/default'
      );
      // open canvas home
      await canvas.goToListingPage();
      // create new workpad
      await canvas.createNewWorkpad();
      await canvas.setWorkpadName('maps tests');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('by-value', () => {
      it('creates new map embeddable', async () => {
        const originalEmbeddableCount = await canvas.getEmbeddableCount();
        await canvas.addNewPanel('Maps');
        await maps.clickSaveAndReturnButton();
        const embeddableCount = await canvas.getEmbeddableCount();
        expect(embeddableCount).to.eql(originalEmbeddableCount + 1);
      });

      it('edits map by-value embeddable', async () => {
        const originalEmbeddableCount = await canvas.getEmbeddableCount();
        await dashboardPanelActions.clickEdit();
        await maps.saveMap('canvas test map');
        const embeddableCount = await canvas.getEmbeddableCount();
        expect(embeddableCount).to.eql(originalEmbeddableCount);
      });
    });

    describe('by-reference', () => {
      it('adds existing map embeddable from the visualize library', async () => {
        await canvas.deleteSelectedElement();
        await canvas.clickAddFromLibrary();
        await dashboardAddPanel.addEmbeddable('canvas test map', 'map');
        await testSubjects.existOrFail('embeddablePanelHeading-canvastestmap');
      });

      it('edits map by-reference embeddable', async () => {
        await dashboardPanelActions.editPanelByTitle('canvas test map');
        await maps.saveMap('canvas test map v2', true, false);
        await testSubjects.existOrFail('embeddablePanelHeading-canvastestmapv2');
        await canvas.deleteSelectedElement();
      });
    });
  });
}
