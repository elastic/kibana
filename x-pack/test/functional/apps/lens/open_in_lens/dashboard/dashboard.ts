/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { lens, dashboard, canvas } = getPageObjects(['lens', 'dashboard', 'canvas']);

  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const panelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('Convert to Lens action on dashboard', function describeIndexTests() {
    before(async () => {
      await dashboard.initTests();
    });

    it('should show notification in context menu if visualization can be converted', async () => {
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAggBasedVisualizations();
      await dashboardAddPanel.clickVisType('area');
      await testSubjects.click('savedObjectTitlelogstash-*');
      await testSubjects.exists('visualizesaveAndReturnButton');
      await testSubjects.click('visualizesaveAndReturnButton');
      await dashboard.waitForRenderComplete();
      expect(await dashboard.isNotificationExists(0)).to.be(true);
    });

    it('should convert legacy visualization to lens by clicking "convert to lens" action', async () => {
      const originalEmbeddableCount = await canvas.getEmbeddableCount();
      await panelActions.convertToLens();
      await lens.waitForVisualization('xyVisChart');
      const lastBreadcrumbdcrumb = await testSubjects.getVisibleText('breadcrumb last');
      expect(lastBreadcrumbdcrumb).to.be('Converting Area visualization');
      await lens.replaceInDashboard();

      await retry.try(async () => {
        const embeddableCount = await canvas.getEmbeddableCount();
        expect(embeddableCount).to.eql(originalEmbeddableCount);
      });

      const titles = await dashboard.getPanelTitles();

      expect(titles[0]).to.be('Area visualization (converted)');

      expect(await dashboard.isNotificationExists(0)).to.be(false);
    });

    it('should not show notification in context menu if visualization can not be converted', async () => {
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAggBasedVisualizations();
      await dashboardAddPanel.clickVisType('timelion');
      await testSubjects.exists('visualizesaveAndReturnButton');
      await testSubjects.click('visualizesaveAndReturnButton');
      await dashboard.waitForRenderComplete();
      expect(await dashboard.isNotificationExists(1)).to.be(false);
    });
  });
}
