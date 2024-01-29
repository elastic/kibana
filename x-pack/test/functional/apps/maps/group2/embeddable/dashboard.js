/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UI_SETTINGS } from '@kbn/data-plugin/common';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'maps']);
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const inspector = getService('inspector');
  const browser = getService('browser');
  const retry = getService('retry');
  const security = getService('security');
  const testSubjects = getService('testSubjects');

  describe('embed in dashboard', () => {
    before(async () => {
      await security.testUser.setRoles(
        [
          'test_logstash_reader',
          'geoshape_data_reader',
          'meta_for_geoshape_data_reader',
          'global_dashboard_all',
          'global_maps_all',
        ],
        { skipBrowserRefresh: true }
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'c698b940-e149-11e8-a35a-370a8516603a',
        [UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX]: true,
      });
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.loadSavedDashboard('map embeddable example');
      await PageObjects.dashboard.waitForRenderComplete();
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({
        [UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX]: false,
      });
      await security.testUser.restoreDefaults();
    });

    async function getRequestTimestamp() {
      await inspector.openInspectorRequestsView();
      const requestStats = await inspector.getTableData();
      const requestTimestamp = PageObjects.maps.getInspectorStatRowHit(
        requestStats,
        'Request timestamp'
      );
      await inspector.close();
      return requestTimestamp;
    }

    it('should set "data-title" attribute', async () => {
      const [{ title }] = await PageObjects.dashboard.getPanelSharedItemData();
      expect(title).to.be('join example');
    });

    it('should display tools control', async () => {
      await PageObjects.maps.expectExistsToolsControl();
    });

    it('should pass index patterns to container', async () => {
      const indexPatterns = await filterBar.getIndexPatterns();
      expect(indexPatterns).to.equal('meta_for_geo_shapes*,logstash-*');
    });

    it('should populate inspector with requests for map embeddable', async () => {
      await dashboardPanelActions.openInspectorByTitle('join example');
      await retry.try(async () => {
        const joinExampleRequestNames = await inspector.getRequestNames();
        expect(joinExampleRequestNames).to.equal(
          'load layer features (geo_shapes*),load join metrics (geo_shapes*)'
        );
      });
      await inspector.close();

      await dashboardPanelActions.openInspectorByTitle('geo grid vector grid example');
      const singleExampleRequest = await inspector.hasSingleRequest();
      const selectedExampleRequest = await inspector.getSelectedOption();
      await inspector.close();

      expect(singleExampleRequest).to.be(true);
      expect(selectedExampleRequest).to.equal('load layer features (logstash-*)');
    });

    it('should apply container state (time, query, filters) to embeddable when loaded', async () => {
      const { rawResponse: response } = await PageObjects.maps.getResponseFromDashboardPanel(
        'geo grid vector grid example'
      );
      expect(response.aggregations.gridSplit.buckets.length).to.equal(6);
    });

    it('should apply new container state (time, query, filters) to embeddable', async () => {
      await filterBar.addFilterAndSelectDataView('logstash-*', {
        field: 'machine.os',
        operation: 'is',
        value: 'win 8',
      });
      await PageObjects.maps.waitForLayersToLoad();

      await filterBar.addFilterAndSelectDataView('meta_for_geo_shapes*', {
        field: 'shape_name',
        operation: 'is',
        value: 'alpha',
      });
      await PageObjects.maps.waitForLayersToLoad();

      const { rawResponse: gridResponse } = await PageObjects.maps.getResponseFromDashboardPanel(
        'geo grid vector grid example'
      );
      expect(gridResponse.aggregations.gridSplit.buckets.length).to.equal(1);

      const { rawResponse: joinResponse } = await PageObjects.maps.getResponseFromDashboardPanel(
        'join example',
        'load join metrics (geo_shapes*)'
      );
      expect(joinResponse.aggregations.join.buckets.length).to.equal(1);
    });

    it('should apply embeddable query and filters to panel', async () => {
      // clear filters from previous test
      await filterBar.removeAllFilters();

      await PageObjects.dashboard.switchToEditMode();

      await dashboardPanelActions.editPanelByTitle('geo grid vector grid example');
      await PageObjects.maps.waitForLayersToLoad();

      await filterBar.addFilter({ field: 'machine.os', operation: 'is', value: 'ios' });
      await PageObjects.maps.waitForLayersToLoad();
      await testSubjects.click('mapSaveAndReturnButton');
      const { rawResponse: gridResponse } = await PageObjects.maps.getResponseFromDashboardPanel(
        'geo grid vector grid example'
      );
      expect(gridResponse.aggregations.gridSplit.buckets.length).to.equal(2);
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

    // see https://github.com/elastic/kibana/issues/61596 on why it is specific to maps
    it("dashboard's back button should navigate to previous page", async () => {
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('map embeddable example');
      await PageObjects.dashboard.waitForRenderComplete();
      await browser.goBack();
      expect(await PageObjects.dashboard.onDashboardLandingPage()).to.be(true);
    });
  });
}
