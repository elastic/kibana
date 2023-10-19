/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'lens', 'maps']);

  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const security = getService('security');

  describe('filter by map extent', () => {
    before(async () => {
      await security.testUser.setRoles(
        ['test_logstash_reader', 'global_maps_all', 'global_dashboard_all'],
        { skipBrowserRefresh: true }
      );
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.gotoDashboardEditMode('filter by map extent dashboard');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should not filter dashboard by map extent before "filter by map extent" is enabled', async () => {
      await PageObjects.lens.assertLegacyMetric('Count of records', '6');
    });

    it('should filter dashboard by map extent when "filter by map extent" is enabled', async () => {
      const mapPanelHeader = await dashboardPanelActions.getPanelHeading('document example');
      await dashboardPanelActions.openContextMenuMorePanel(mapPanelHeader);
      await testSubjects.click('embeddablePanelAction-FILTER_BY_MAP_EXTENT');
      await testSubjects.setEuiSwitch(
        'filterByMapExtentSwitch24ade730-afe4-42b6-919a-c4e0a98c94f2',
        'check'
      );
      await browser.pressKeys(browser.keys.ESCAPE);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.lens.assertLegacyMetric('Count of records', '1');
    });

    it('should filter dashboard by new map extent when map is moved', async () => {
      await PageObjects.maps.setView(32.95539, -93.93054, 5);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.assertLegacyMetric('Count of records', '2');
    });

    it('should remove map extent filter dashboard when "filter by map extent" is disabled', async () => {
      const mapPanelHeader = await dashboardPanelActions.getPanelHeading('document example');
      await dashboardPanelActions.openContextMenuMorePanel(mapPanelHeader);
      await testSubjects.click('embeddablePanelAction-FILTER_BY_MAP_EXTENT');
      await testSubjects.setEuiSwitch(
        'filterByMapExtentSwitch24ade730-afe4-42b6-919a-c4e0a98c94f2',
        'uncheck'
      );
      await browser.pressKeys(browser.keys.ESCAPE);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.assertLegacyMetric('Count of records', '6');
    });
  });
}
