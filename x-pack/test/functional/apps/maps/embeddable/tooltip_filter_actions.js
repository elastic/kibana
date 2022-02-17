/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'discover', 'header', 'maps']);
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const security = getService('security');

  describe('tooltip filter actions', () => {
    before(async () => {
      await security.testUser.setRoles([
        'test_logstash_reader',
        'global_maps_all',
        'geoshape_data_reader',
        'global_dashboard_all',
        'meta_for_geoshape_data_reader',
        'global_discover_read',
      ]);
    });
    async function loadDashboardAndOpenTooltip() {
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'c698b940-e149-11e8-a35a-370a8516603a',
      });

      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('dash for tooltip filter action test');

      await PageObjects.maps.lockTooltipAtPosition(200, -200);
    }

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    describe('apply filter to current view', () => {
      before(async () => {
        await loadDashboardAndOpenTooltip();
      });

      it('should display create filter button when tooltip is locked', async () => {
        const exists = await testSubjects.exists('mapTooltipCreateFilterButton');
        expect(exists).to.be(true);
      });

      it('should create filters when create filter button is clicked', async () => {
        await testSubjects.click('mapTooltipCreateFilterButton');
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await PageObjects.maps.waitForLayersToLoadMinimizedLayerControl();

        const numFilters = await filterBar.getFilterCount();
        expect(numFilters).to.be(1);

        const hasJoinFilter = await filterBar.hasFilter('runtime_shape_name', 'charlie');
        expect(hasJoinFilter).to.be(true);
      });
    });

    describe('panel actions', () => {
      beforeEach(async () => {
        await loadDashboardAndOpenTooltip();
      });

      it('should trigger dashboard drilldown action when clicked', async () => {
        await testSubjects.click('mapTooltipMoreActionsButton');
        await testSubjects.click('mapFilterActionButton__drilldown1');

        // Assert on new dashboard with filter from action
        await PageObjects.dashboard.waitForRenderComplete();
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.equal(2);

        const hasJoinFilter = await filterBar.hasFilter('runtime_shape_name', 'charlie');
        expect(hasJoinFilter).to.be(true);
      });

      it('should trigger url drilldown action when clicked', async () => {
        await testSubjects.click('mapTooltipMoreActionsButton');
        await testSubjects.click('mapFilterActionButton__urlDrilldownToDiscover');

        // Assert on discover with filter from action
        await PageObjects.discover.waitForDiscoverAppOnScreen();
        const hasFilter = await filterBar.hasFilter('name', 'charlie');
        expect(hasFilter).to.be(true);
      });
    });
  });
}
