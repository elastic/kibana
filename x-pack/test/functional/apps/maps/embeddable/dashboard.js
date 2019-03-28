/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'maps']);
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const inspector = getService('inspector');

  describe('embed in dashboard', () => {
    before(async () => {
      await kibanaServer.uiSettings.replace({
        'defaultIndex': 'c698b940-e149-11e8-a35a-370a8516603a'
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('map embeddable example');
    });

    async function getRequestTimestamp() {
      await inspector.openInspectorRequestsView();
      const requestStats = await inspector.getTableData();
      const requestTimestamp =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Request timestamp');
      await inspector.close();
      return requestTimestamp;
    }

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

    it('should apply container state (time, query, filters) to embeddable when loaded', async () => {
      await dashboardPanelActions.openInspectorByTitle('geo grid vector grid example');
      const requestStats = await inspector.getTableData();
      const totalHits =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits (total)');
      await inspector.close();
      expect(totalHits).to.equal('6');
    });

    it('should apply new container state (time, query, filters) to embeddable', async () => {
      await filterBar.selectIndexPattern('logstash-*');
      await filterBar.addFilter('machine.os', 'is', 'win 8');
      await dashboardPanelActions.openInspectorByTitle('geo grid vector grid example');
      const requestStats = await inspector.getTableData();
      const totalHits =  PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits (total)');
      await inspector.close();
      expect(totalHits).to.equal('1');
    });

    it('should re-fetch query when "refresh" is clicked', async () => {
      await dashboardPanelActions.openInspectorByTitle('geo grid vector grid example');
      const beforeQueryRefreshTimestamp = await getRequestTimestamp();
      await PageObjects.maps.refreshQuery();
      await dashboardPanelActions.openInspectorByTitle('geo grid vector grid example');
      const afterQueryRefreshTimestamp = await getRequestTimestamp();
      expect(beforeQueryRefreshTimestamp).not.to.equal(afterQueryRefreshTimestamp);
    });

    it('should re-fetch documents with refresh timer', async () => {
      await dashboardPanelActions.openInspectorByTitle('geo grid vector grid example');
      const beforeRefreshTimerTimestamp = await getRequestTimestamp();
      expect(beforeRefreshTimerTimestamp.length).to.be(24);
      await PageObjects.maps.triggerSingleRefresh(1000);
      await dashboardPanelActions.openInspectorByTitle('geo grid vector grid example');
      const afterRefreshTimerTimestamp = await getRequestTimestamp();
      expect(beforeRefreshTimerTimestamp).not.to.equal(afterRefreshTimerTimestamp);
    });
  });
}
