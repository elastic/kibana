/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

    it('loads the ML pages', async () => {
      await ml.testExecution.logTestStep('loads the ML home page');
      await ml.navigation.navigateToMl();

      await ml.testExecution.logTestStep('loads the overview page');
      await ml.navigation.navigateToOverview();

      await ml.testExecution.logTestStep('loads the anomaly detection area');
      await ml.navigation.navigateToAnomalyDetection();

      await ml.testExecution.logTestStep('loads the job management page');
      await ml.navigation.navigateToJobManagement();
      await ml.jobManagement.assertEmptyStateVisible();
      await ml.jobManagement.assertCreateNewJobButtonExists();

      await ml.testExecution.logTestStep('loads the settings page');
      await ml.navigation.navigateToSettings();
      await ml.settings.assertManageCalendarsLinkExists();
      await ml.settings.assertCreateCalendarLinkExists();
      await ml.settings.assertManageFilterListsLinkExists();
      await ml.settings.assertCreateFilterListLinkExists();

      await ml.testExecution.logTestStep('loads the data frame analytics page');
      await ml.navigation.navigateToDataFrameAnalytics();
      await ml.dataFrameAnalytics.assertEmptyListMessageExists();

      await ml.testExecution.logTestStep('loads the data visualizer page');
      await ml.navigation.navigateToDataVisualizer();
      await ml.dataVisualizer.assertDataVisualizerImportDataCardExists();
      await ml.dataVisualizer.assertDataVisualizerIndexDataCardExists();

      await ml.testExecution.logTestStep(
        'should load the stack management with the ML menu item being present'
      );
      await ml.navigation.navigateToStackManagement();

      await ml.testExecution.logTestStep('should load the jobs list page in stack management');
      await ml.navigation.navigateToStackManagementJobsListPage();

      await ml.testExecution.logTestStep(
        'should load the analytics jobs list page in stack management'
      );
      await ml.navigation.navigateToStackManagementJobsListPageAnalyticsTab();
    });
  });
}
