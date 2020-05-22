/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'maps']);
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const DASHBOARD_NAME = 'verify_map_embeddable_state';

  describe('embeddable state', () => {
    before(async () => {
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'c698b940-e149-11e8-a35a-370a8516603a',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.addEmbeddable('document example', 'map');

      await PageObjects.maps.setView(0.0, 0.0, 10);
      await PageObjects.dashboard.saveDashboard(DASHBOARD_NAME);
      await PageObjects.dashboard.loadSavedDashboard(DASHBOARD_NAME);
    });

    it('should render map with center and zoom from embeddable state', async () => {
      const { lat, lon, zoom } = await PageObjects.maps.getView();
      expect(Math.round(lat)).to.equal(0);
      expect(Math.round(lon)).to.equal(0);
      expect(Math.round(zoom)).to.equal(10);
    });
  });
}
