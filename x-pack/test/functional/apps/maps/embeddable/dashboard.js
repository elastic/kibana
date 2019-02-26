/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'dashboard']);
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const inspector = getService('inspector');

  describe('embedded in dashboard', () => {
    before(async () => {
      await kibanaServer.uiSettings.replace({
        'defaultIndex': 'c698b940-e149-11e8-a35a-370a8516603a'
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('map embeddable example');
    });

    it('should pass index patterns to container', async () => {
      const indexPatterns = await filterBar.getIndexPatterns();
      expect(indexPatterns).to.equal('geo_shapes*,meta_for_geo_shapes*,logstash-*');
    });

    it('should populate inspector with requests for map embeddable', async () => {
      await dashboardPanelActions.openInspectorByTitle('join example');
      const joinExampleRequestNames = await inspector.getRequestNames();
      await inspector.close();
      expect(joinExampleRequestNames).to.equal('geo_shapes*,meta_for_geo_shapes*.shape_name');

      await dashboardPanelActions.openInspectorByTitle('geo grid vector grid example');
      const gridExampleRequestNames = await inspector.getRequestNames();
      await inspector.close();
      expect(gridExampleRequestNames).to.equal('logstash-*');
    });
  });
}
