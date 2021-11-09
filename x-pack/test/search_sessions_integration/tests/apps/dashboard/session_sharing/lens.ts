/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['header', 'common', 'dashboard', 'timePicker', 'lens']);

  // Dashboard shares a search session with lens when navigating to and from by value lens to hit search cache
  // https://github.com/elastic/kibana/issues/99310
  describe('Search session sharing with lens', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
    });

    // NOTE: This test doesn't check if the cache was actually hit, but just checks if the same search session id is used
    // so it doesn't give the 100% confidence that cache-hit improvement works https://github.com/elastic/kibana/issues/99310
    // but if it fails, we for sure know it doesn't work
    it("should share search session with by value lens and don't share with by reference", async () => {
      // Add a by ref lens panel to a new dashboard
      const lensTitle = 'Artistpreviouslyknownaslens';
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames(lensTitle);
      await find.clickByButtonText(lensTitle);
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();
      await PageObjects.dashboard.waitForRenderComplete();

      // Navigating to lens and back should create a new session
      const byRefSessionId = await dashboardPanelActions.getSearchSessionIdByTitle(lensTitle);
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickEdit();
      await PageObjects.lens.saveAndReturn();
      await PageObjects.dashboard.waitForRenderComplete();
      const newByRefSessionId = await dashboardPanelActions.getSearchSessionIdByTitle(lensTitle);

      expect(byRefSessionId).not.to.eql(newByRefSessionId);

      // Convert to by-value
      const byRefPanel = await testSubjects.find('embeddablePanelHeading-' + lensTitle);
      await dashboardPanelActions.unlinkFromLibary(byRefPanel);
      await PageObjects.dashboard.waitForRenderComplete();
      const byValueSessionId = await dashboardPanelActions.getSearchSessionIdByTitle(lensTitle);

      // Navigating to lens and back should keep the session
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickEdit();
      await PageObjects.lens.saveAndReturn();
      await PageObjects.dashboard.waitForRenderComplete();
      const newByValueSessionId = await dashboardPanelActions.getSearchSessionIdByTitle(lensTitle);
      expect(byValueSessionId).to.eql(newByValueSessionId);
    });
  });
}
