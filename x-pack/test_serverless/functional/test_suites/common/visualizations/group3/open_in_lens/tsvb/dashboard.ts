/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { lens, timePicker, dashboard, canvas } = getPageObjects([
    'visualize',
    'lens',
    'timePicker',
    'dashboard',
    'canvas',
  ]);
  const dashboardCustomizePanel = getService('dashboardCustomizePanel');
  const dashboardBadgeActions = getService('dashboardBadgeActions');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const panelActions = getService('dashboardPanelActions');
  const kibanaServer = getService('kibanaServer');

  describe('Dashboard to TSVB to Lens', function describeIndexTests() {
    const fixture =
      'x-pack/test_serverless/functional/fixtures/kbn_archiver/lens/open_in_lens/tsvb/dashboard.json';

    before(async () => {
      await kibanaServer.importExport.load(fixture);
    });

    after(async () => {
      await kibanaServer.importExport.unload(fixture);
    });

    beforeEach(async () => {
      await dashboard.navigateToApp(); // required for svl until dashboard PO navigation is fixed
    });

    it('should convert a by value TSVB viz to a Lens viz', async () => {
      await dashboard.gotoDashboardEditMode('Convert to Lens - Dashboard - TSVB - 1');
      await timePicker.setDefaultAbsoluteRange();

      await dashboard.waitForRenderComplete();
      const originalEmbeddableCount = await canvas.getEmbeddableCount();
      await dashboardPanelActions.customizePanel();
      await dashboardCustomizePanel.enableCustomTimeRange();
      await dashboardCustomizePanel.openDatePickerQuickMenu();
      await dashboardCustomizePanel.clickCommonlyUsedTimeRange('Last_30 days');
      await dashboardCustomizePanel.clickSaveButton();
      await dashboard.waitForRenderComplete();
      await dashboardBadgeActions.expectExistsTimeRangeBadgeAction();

      const visPanel = await panelActions.getPanelHeading('My TSVB to Lens viz 1');
      await panelActions.convertToLens(visPanel);
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
      const titles = await dashboard.getPanelTitles();
      expect(titles[0]).to.be('My TSVB to Lens viz 1 (converted)');
      await dashboardBadgeActions.expectExistsTimeRangeBadgeAction();
      await panelActions.removePanel();
    });

    it('should convert a by reference TSVB viz to a Lens viz', async () => {
      await dashboard.gotoDashboardEditMode('Convert to Lens - Dashboard - TSVB - 2');
      // await dashboard.gotoDashboardEditMode('Convert to Lens - Dashboard - Metric');
      await timePicker.setDefaultAbsoluteRange();

      // save it to library
      const originalPanel = await testSubjects.find('embeddablePanelHeading-');
      await panelActions.saveToLibrary('My TSVB to Lens viz 2', originalPanel);

      await dashboard.waitForRenderComplete();
      const originalEmbeddableCount = await canvas.getEmbeddableCount();
      await dashboardPanelActions.customizePanel();
      await dashboardCustomizePanel.enableCustomTimeRange();
      await dashboardCustomizePanel.openDatePickerQuickMenu();
      await dashboardCustomizePanel.clickCommonlyUsedTimeRange('Last_30 days');
      await dashboardCustomizePanel.clickSaveButton();
      await dashboard.waitForRenderComplete();
      await dashboardBadgeActions.expectExistsTimeRangeBadgeAction();

      const visPanel = await panelActions.getPanelHeading('My TSVB to Lens viz 2');
      await panelActions.convertToLens(visPanel);
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
