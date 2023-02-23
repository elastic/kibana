/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, visualBuilder, lens, timeToVisualize, dashboard, canvas } = getPageObjects([
    'visualBuilder',
    'visualize',
    'lens',
    'timeToVisualize',
    'dashboard',
    'canvas',
  ]);

  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const panelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('Dashboard to TSVB to Lens', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
    });

    it('should convert a by value TSVB viz to a Lens viz', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisualBuilder();
      await visualBuilder.checkVisualBuilderIsPresent();
      await visualBuilder.resetPage();
      await testSubjects.click('visualizeSaveButton');

      await timeToVisualize.saveFromModal('My TSVB to Lens viz 1', {
        addToDashboard: 'new',
        saveToLibrary: false,
      });

      await dashboard.waitForRenderComplete();
      const originalEmbeddableCount = await canvas.getEmbeddableCount();
      await panelActions.openContextMenu();
      await panelActions.clickEdit();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(await dimensions[1].getVisibleText()).to.be('Count of records');
      });

      await lens.replaceInDashboard();
      await retry.try(async () => {
        const embeddableCount = await canvas.getEmbeddableCount();
        expect(embeddableCount).to.eql(originalEmbeddableCount);
      });
      await panelActions.removePanel();
    });

    it('should convert a by reference TSVB viz to a Lens viz', async () => {
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickVisType('metrics');
      await testSubjects.click('visualizesaveAndReturnButton');
      // save it to library
      const originalPanel = await testSubjects.find('embeddablePanelHeading-');
      await panelActions.saveToLibrary('My TSVB to Lens viz 2', originalPanel);

      await dashboard.waitForRenderComplete();
      const originalEmbeddableCount = await canvas.getEmbeddableCount();
      await panelActions.openContextMenu();
      await panelActions.clickEdit();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('legacyMtrVis');
      await retry.try(async () => {
        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(await dimensions[1].getVisibleText()).to.be('Count of records');
      });

      await lens.replaceInDashboard();
      await retry.try(async () => {
        const embeddableCount = await canvas.getEmbeddableCount();
        expect(embeddableCount).to.eql(originalEmbeddableCount);
      });

      const panel = await testSubjects.find(`embeddablePanelHeading-`);
      const descendants = await testSubjects.findAllDescendant(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
        panel
      );
      expect(descendants.length).to.equal(0);

      await panelActions.removePanel();
    });
  });
}
