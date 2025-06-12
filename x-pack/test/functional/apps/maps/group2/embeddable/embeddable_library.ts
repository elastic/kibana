/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const find = getService('find');
  const { dashboard, header, maps } = getPageObjects(['dashboard', 'header', 'maps']);
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const mapTitle = 'embeddable library map';

  describe('maps in embeddable library', () => {
    before(async () => {
      await security.testUser.setRoles(
        [
          'test_logstash_reader',
          'global_maps_all',
          'geoshape_data_reader',
          'global_dashboard_all',
          'meta_for_geoshape_data_reader',
        ],
        { skipBrowserRefresh: true }
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'c698b940-e149-11e8-a35a-370a8516603a',
      });
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickAddMapPanel();
      await header.waitUntilLoadingHasFinished();
      await maps.waitForLayersToLoad();
      await maps.clickSaveAndReturnButton();
      await dashboard.waitForRenderComplete();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('save map panel to embeddable library', async () => {
      await dashboardPanelActions.saveToLibrary(mapTitle);
      await dashboardPanelActions.expectLinkedToLibrary(mapTitle);
    });

    it('unlink map panel from embeddable library', async () => {
      await dashboardPanelActions.unlinkFromLibrary(mapTitle);
      await dashboardPanelActions.expectNotLinkedToLibrary(mapTitle);

      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames(mapTitle);
      await find.existsByLinkText(mapTitle);
      await dashboardAddPanel.closeAddPanel();
    });
  });
}
