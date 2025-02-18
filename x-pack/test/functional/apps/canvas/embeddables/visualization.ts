/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const { canvas, visualize } = getPageObjects(['canvas', 'visualize']);
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');

  describe('visualization in canvas', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/canvas/lens'
      );
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana_unload'
      );

      // open canvas home
      await canvas.goToListingPage();
      // create new workpad
      await canvas.createNewWorkpad();
      await canvas.setWorkpadName('visualization tests');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('by-reference', () => {
      it('adds existing visualize embeddable from the visualize library', async () => {
        await canvas.clickAddFromLibrary();
        await dashboardAddPanel.addVisualization('Rendering-Test: metric');
        await testSubjects.existOrFail('embeddablePanelHeading-RenderingTest:metric');
      });

      it('edits visualize by-reference embeddable', async () => {
        await dashboardPanelActions.editPanelByTitle('Rendering Test: metric');
        await visualize.saveVisualization('Rendering Test: metric v2', {
          saveAsNew: false,
          redirectToOrigin: true,
        });
        await testSubjects.existOrFail('embeddablePanelHeading-RenderingTest:metricv2');
        await canvas.deleteSelectedElement();
      });
    });

    describe('by-value', () => {
      it('creates new vega embeddable', async () => {
        const originalEmbeddableCount = await canvas.getEmbeddableCount();
        await canvas.addNewPanel('Custom visualization');
        await visualize.saveVisualizationAndReturn();
        await retry.try(async () => {
          const embeddableCount = await canvas.getEmbeddableCount();
          expect(embeddableCount).to.eql(originalEmbeddableCount + 1);
        });
      });

      it('edits vega by-value embeddable', async () => {
        const originalEmbeddableCount = await canvas.getEmbeddableCount();
        await dashboardPanelActions.clickEdit();
        await visualize.saveVisualizationAndReturn();
        await retry.try(async () => {
          const embeddableCount = await canvas.getEmbeddableCount();
          expect(embeddableCount).to.eql(originalEmbeddableCount);
        });
      });
    });
  });
}
