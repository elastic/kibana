/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* This test is importing saved objects from 7.13.0 to 8.0 and the backported version
 * will import from 6.8.x to 7.x.x
 */

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'timePicker']);
  const renderService = getService('renderable');

  describe('Verify upgraded dashboards', function () {
    before(async () => {
      await PageObjects.common.navigateToApp('management', { insertTimestamp: false });
    });

    it('should be able to verify that dashboards rendered correctly in 6.x space', async function () {
      await PageObjects.common.navigateToUrl('dashboard', undefined, {
        basePath: `/s/6x`,
        ensureCurrentUrl: false,
        shouldLoginIfPrompted: false,
        shouldUseHashForSubUrl: false,
      });
      await PageObjects.dashboard.loadSavedDashboard('shakespeare_dashboard');
      await PageObjects.dashboard.expectOnDashboard('shakespeare_dashboard');

      await renderService.waitForRender(6);

      await PageObjects.dashboard.verifyNoRenderErrors();

      await PageObjects.timePicker.setDefaultAbsoluteRange();

      await PageObjects.dashboard.loadSavedDashboard('logstash_dashboardwithfilters');
      await PageObjects.dashboard.expectOnDashboard('logstash_dashboardwithfilters');

      await renderService.waitForRender(20);

      await PageObjects.dashboard.verifyNoRenderErrors();
    });

    it('should be able to verify that dashboards rendered correctly in 7.x space', async function () {
      await PageObjects.common.navigateToUrl('dashboard', undefined, {
        basePath: `/s/7x`,
        ensureCurrentUrl: false,
        shouldLoginIfPrompted: false,
        shouldUseHashForSubUrl: false,
      });
      await PageObjects.dashboard.loadSavedDashboard('nontimebased_shakespeare_drilldown');
      await PageObjects.dashboard.expectOnDashboard('nontimebased_shakespeare_drilldown');

      await renderService.waitForRender(2);

      await PageObjects.dashboard.verifyNoRenderErrors();

      await PageObjects.timePicker.setDefaultAbsoluteRange();

      await PageObjects.dashboard.loadSavedDashboard('by_reference_drilldown');
      await PageObjects.dashboard.expectOnDashboard('by_reference_drilldown');

      await renderService.waitForRender(4);

      await PageObjects.dashboard.verifyNoRenderErrors();
    });
  });
}
