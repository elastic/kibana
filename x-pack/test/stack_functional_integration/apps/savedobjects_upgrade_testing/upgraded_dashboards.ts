/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  describe('Verify upgraded dashboards', function () {
    const PageObjects = getPageObjects(['common', 'dashboard', 'timePicker']);
    const renderService = getService('renderable');
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
