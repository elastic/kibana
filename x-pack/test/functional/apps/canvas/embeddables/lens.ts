/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function canvasLensTest({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['canvas', 'common', 'header', 'lens', 'unifiedSearch']);
  const esArchiver = getService('esArchiver');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const archives = {
    es: 'x-pack/test/functional/es_archives/canvas/logstash_lens',
    kbn: 'x-pack/test/functional/fixtures/kbn_archiver/canvas/lens',
  };

  describe('lens in canvas', function () {
    before(async () => {
      await esArchiver.load(archives.es);
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(archives.kbn);
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-lens' });
      // open canvas home
      await PageObjects.common.navigateToApp('canvas');
      // load test workpad
      await PageObjects.common.navigateToApp('canvas', {
        hash: '/workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31/page/1',
      });
    });

    after(async () => {
      await esArchiver.unload(archives.es);
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('by-reference', () => {
      it('renders lens visualization using savedLens expression', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.lens.assertMetric('Maximum of bytes', '16,788');
      });

      it('adds existing lens embeddable from the visualize library', async () => {
        await PageObjects.canvas.goToListingPageViaBreadcrumbs();
        await PageObjects.canvas.createNewWorkpad();
        await PageObjects.canvas.setWorkpadName('lens tests');
        await PageObjects.canvas.clickAddFromLibrary();
        await dashboardAddPanel.addEmbeddable('Artistpreviouslyknownaslens', 'lens');
        await testSubjects.existOrFail('embeddablePanelHeading-Artistpreviouslyknownaslens');
      });

      it('edits lens by-reference embeddable', async () => {
        await dashboardPanelActions.editPanelByTitle('Artistpreviouslyknownaslens');
        await PageObjects.lens.save('Artistpreviouslyknownaslens v2', false, true);
        await testSubjects.existOrFail('embeddablePanelHeading-Artistpreviouslyknownaslensv2');
      });
    });

    describe('by-value', () => {
      it('creates new lens embeddable', async () => {
        await PageObjects.canvas.deleteSelectedElement();
        const originalEmbeddableCount = await PageObjects.canvas.getEmbeddableCount();
        await PageObjects.canvas.createNewVis('lens');
        await PageObjects.unifiedSearch.closeTourPopoverByLocalStorage();
        await PageObjects.lens.goToTimeRange();
        await PageObjects.lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'date_histogram',
          field: '@timestamp',
        });
        await PageObjects.lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'average',
          field: 'bytes',
        });
        await PageObjects.lens.saveAndReturn();
        await retry.try(async () => {
          const embeddableCount = await PageObjects.canvas.getEmbeddableCount();
          expect(embeddableCount).to.eql(originalEmbeddableCount + 1);
        });
      });

      it('edits lens by-value embeddable', async () => {
        const originalEmbeddableCount = await PageObjects.canvas.getEmbeddableCount();
        await dashboardPanelActions.toggleContextMenu();
        await dashboardPanelActions.clickEdit();
        await PageObjects.lens.saveAndReturn();
        await retry.try(async () => {
          const embeddableCount = await PageObjects.canvas.getEmbeddableCount();
          expect(embeddableCount).to.eql(originalEmbeddableCount);
        });
      });
    });
  });
}
