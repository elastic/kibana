/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');

  describe('page navigation', function () {
    this.tags(['skipFirefox', 'mlqa']);
    before(async () => {
      await ml.api.cleanMlIndices();
      await ml.securityUI.loginAsMlPowerUser();
    });

    it('loads the home page', async () => {
      await ml.navigation.navigateToMl();
    });

    it('loads the overview page', async () => {
      await ml.navigation.navigateToOverview();
    });

    it('loads the anomaly detection area', async () => {
      await ml.navigation.navigateToAnomalyDetection();
    });

    it('loads the job management page', async () => {
      await ml.navigation.navigateToJobManagement();
      await ml.jobManagement.assertJobStatsBarExists();
      await ml.jobManagement.assertJobTableExists();
      await ml.jobManagement.assertCreateNewJobButtonExists();
    });

    it('loads the settings page', async () => {
      await ml.navigation.navigateToSettings();
      await ml.settings.assertSettingsManageCalendarsLinkExists();
      await ml.settings.assertSettingsCreateCalendarLinkExists();
      await ml.settings.assertSettingsManageFilterListsLinkExists();
      await ml.settings.assertSettingsCreateFilterListLinkExists();
    });

    it('loads the data frame analytics page', async () => {
      await ml.navigation.navigateToDataFrameAnalytics();
      await ml.dataFrameAnalytics.assertEmptyListMessageExists();
    });

    it('loads the data visualizer page', async () => {
      await ml.navigation.navigateToDataVisualizer();
      await ml.dataVisualizer.assertDataVisualizerImportDataCardExists();
      await ml.dataVisualizer.assertDataVisualizerIndexDataCardExists();
    });
  });
}
