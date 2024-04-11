/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, visualBuilder, lens, timeToVisualize, dashboard, canvas, header } =
    getPageObjects([
      'visualBuilder',
      'visualize',
      'lens',
      'timeToVisualize',
      'dashboard',
      'canvas',
      'header',
    ]);
  const dashboardCustomizePanel = getService('dashboardCustomizePanel');
  const dashboardBadgeActions = getService('dashboardBadgeActions');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const panelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const filterBar = getService('filterBar');

  // FLAKY: https://github.com/elastic/kibana/issues/179307
  describe('Dashboard to TSVB to Lens', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
    });

    it('should convert a by value TSVB viz to a Lens viz', async () => {
      await visualBuilder.resetPage();
      // adds filters
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'css' });
      await header.waitUntilLoadingHasFinished();

      await testSubjects.click('visualizeSaveButton');
      await timeToVisualize.saveFromModal('My TSVB to Lens viz 1', {
        addToDashboard: 'new',
        saveToLibrary: false,
      });

      await dashboard.waitForRenderComplete();
      const originalEmbeddableCount = await canvas.getEmbeddableCount();
      await dashboardPanelActions.customizePanel();
      await dashboardCustomizePanel.enableCustomTimeRange();
      await dashboardCustomizePanel.openDatePickerQuickMenu();
      await dashboardCustomizePanel.clickCommonlyUsedTimeRange('Last_30 days');
      await dashboardCustomizePanel.clickSaveButton();
      await dashboard.waitForRenderComplete();
      await dashboardBadgeActions.expectExistsTimeRangeBadgeAction();
      await panelActions.openContextMenu();
      await panelActions.clickEdit();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(await dimensions[1].getVisibleText()).to.be('Count of records');
      });

      expect(await filterBar.hasFilter('extension', 'css')).to.be(true);

      await lens.replaceInDashboard();
      await retry.try(async () => {
        const embeddableCount = await canvas.getEmbeddableCount();
        expect(embeddableCount).to.eql(originalEmbeddableCount);
      });
      const titles = await dashboard.getPanelTitles();
      expect(titles[0]).to.be('My TSVB to Lens viz 1 (converted)');
      await dashboardBadgeActions.expectExistsTimeRangeBadgeAction();
      await panelActions.removePanel();
    });

    it('should convert a by reference TSVB viz to a Lens viz', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickVisType('metrics');
      await testSubjects.click('visualizesaveAndReturnButton');
      // save it to library
      const originalPanel = await testSubjects.find('embeddablePanelHeading-');
      await panelActions.legacySaveToLibrary('My TSVB to Lens viz 2', originalPanel);

      await dashboard.waitForRenderComplete();
      const originalEmbeddableCount = await canvas.getEmbeddableCount();
      await dashboardPanelActions.customizePanel();
      await dashboardCustomizePanel.enableCustomTimeRange();
      await dashboardCustomizePanel.openDatePickerQuickMenu();
      await dashboardCustomizePanel.clickCommonlyUsedTimeRange('Last_30 days');
      await dashboardCustomizePanel.clickSaveButton();
      await dashboard.waitForRenderComplete();
      await dashboardBadgeActions.expectExistsTimeRangeBadgeAction();
      await panelActions.openContextMenu();
      await panelActions.clickEdit();

      await visualize.navigateToLensFromAnotherVisualization();

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
      const panel = await testSubjects.find(`embeddablePanelHeading-MyTSVBtoLensviz2(converted)`);
      const descendants = await testSubjects.findAllDescendant(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
        panel
      );
      expect(descendants.length).to.equal(0);
      const titles = await dashboard.getPanelTitles();
      expect(titles[0]).to.be('My TSVB to Lens viz 2 (converted)');
      await dashboardBadgeActions.expectExistsTimeRangeBadgeAction();
      await panelActions.removePanel();
    });
  });
}
