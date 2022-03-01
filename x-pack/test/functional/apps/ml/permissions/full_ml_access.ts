/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { FtrProviderContext } from '../../../ftr_provider_context';

import { USER } from '../../../services/ml/security_common';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const browser = getService('browser');

  const testUsers = [
    { user: USER.ML_POWERUSER, discoverAvailable: true },
    { user: USER.ML_POWERUSER_SPACES, discoverAvailable: false },
  ];

  describe('for user with full ML access', function () {
    this.tags(['skipFirefox', 'mlqa']);

    describe('with no data loaded', function () {
      for (const testUser of testUsers) {
        describe(`(${testUser.user})`, function () {
          before(async () => {
            await ml.securityUI.loginAs(testUser.user);
            await ml.api.cleanMlIndices();
          });

          after(async () => {
            // NOTE: Logout needs to happen before anything else to avoid flaky behavior
            await ml.securityUI.logout();
          });

          it('should display the ML entry in Kibana app menu', async () => {
            await ml.testExecution.logTestStep('should open the Kibana app menu');
            await ml.navigation.openKibanaNav();

            await ml.testExecution.logTestStep('should display the ML nav link');
            await ml.navigation.assertKibanaNavMLEntryExists();
          });

          it('should display side nav in the ML app correctly', async () => {
            await ml.testExecution.logTestStep('should load the ML app');
            await ml.navigation.navigateToMl();

            await ml.testExecution.logTestStep('should display the enabled "Overview" tab');
            await ml.navigation.assertOverviewTabEnabled(true);

            await ml.testExecution.logTestStep(
              'should display the enabled "Anomaly Detection" section correctly'
            );
            await ml.navigation.assertAnomalyDetectionTabEnabled(true);
            await ml.navigation.assertAnomalyExplorerNavItemEnabled(true);
            await ml.navigation.assertSingleMetricViewerNavItemEnabled(true);
            await ml.navigation.assertSettingsTabEnabled(true);

            await ml.testExecution.logTestStep(
              'should display the enabled "Data Frame Analytics" section'
            );
            await ml.navigation.assertDataFrameAnalyticsTabEnabled(true);

            await ml.testExecution.logTestStep(
              'should display the enabled "Model Management" section'
            );
            await ml.navigation.assertTrainedModelsNavItemEnabled(true);
            await ml.navigation.assertNodesNavItemEnabled(true);

            await ml.testExecution.logTestStep(
              'should display the enabled "Data Visualizer" section'
            );
            await ml.navigation.assertDataVisualizerTabEnabled(true);
            await ml.navigation.assertFileDataVisualizerNavItemEnabled(true);
            await ml.navigation.assertIndexDataVisualizerNavItemEnabled(true);
          });

          it('should display elements on ML Overview page correctly', async () => {
            await ml.testExecution.logTestStep('should load the ML overview page');
            await ml.navigation.navigateToOverview();

            await ml.commonUI.waitForDatePickerIndicatorLoaded();

            await ml.testExecution.logTestStep('should display a welcome callout');
            await ml.overviewPage.assertGettingStartedCalloutVisible(true);
            await ml.overviewPage.dismissGettingStartedCallout();

            await ml.testExecution.logTestStep('should display ML Nodes panel');
            await ml.mlNodesPanel.assertNodeOverviewPanel();

            await ml.testExecution.logTestStep('should display Anomaly Detection empty state');
            await ml.overviewPage.assertADEmptyStateExists();
            await ml.overviewPage.assertADCreateJobButtonExists();
            await ml.overviewPage.assertADCreateJobButtonEnabled(true);

            await ml.testExecution.logTestStep('should display DFA empty state');
            await ml.overviewPage.assertDFAEmptyStateExists();
            await ml.overviewPage.assertDFACreateJobButtonExists();
            await ml.overviewPage.assertDFACreateJobButtonEnabled(true);

            await ml.testExecution.logTestStep(
              'should persist the getting started callout state after refresh'
            );
            await browser.refresh();
            await ml.overviewPage.assertGettingStartedCalloutVisible(false);
          });
        });
      }
    });

    describe('with data loaded', function () {
      const adJobId = 'fq_single_permission';
      const dfaJobId = 'iph_outlier_permission';
      const calendarId = 'calendar_permission';
      const eventDescription = 'calendar_event_permission';
      const filterId = 'filter_permission';
      const filterItems = ['filter_item_permission'];

      const ecIndexPattern = 'ft_module_sample_ecommerce';
      const ecExpectedTotalCount = '287';

      const uploadFilePath = path.join(
        __dirname,
        '..',
        'data_visualizer',
        'files_to_import',
        'artificial_server_log'
      );
      const expectedUploadFileTitle = 'artificial_server_log';

      before(async () => {
        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
        await esArchiver.loadIfNeeded(
          'x-pack/test/functional/es_archives/ml/module_sample_ecommerce'
        );
        await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
        await ml.testResources.createIndexPatternIfNeeded('ft_ihp_outlier', '@timestamp');
        await ml.testResources.createIndexPatternIfNeeded(ecIndexPattern, 'order_date');
        await ml.testResources.setKibanaTimeZoneToUTC();

        await ml.api.createAndRunAnomalyDetectionLookbackJob(
          ml.commonConfig.getADFqMultiMetricJobConfig(adJobId),
          ml.commonConfig.getADFqDatafeedConfig(adJobId)
        );

        await ml.api.createAndRunDFAJob(
          ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(dfaJobId)
        );

        await ml.api.createCalendar(calendarId, {
          calendar_id: calendarId,
          job_ids: [],
          description: 'Test calendar',
        });
        await ml.api.createCalendarEvents(calendarId, [
          {
            description: eventDescription,
            start_time: '1513641600000',
            end_time: '1513728000000',
          },
        ]);

        await ml.api.createFilter(filterId, {
          description: 'Test filter list',
          items: filterItems,
        });
      });

      after(async () => {
        await ml.api.deleteIndices(`user-${dfaJobId}`);
        await ml.api.deleteCalendar(calendarId);
        await ml.api.deleteFilter(filterId);
        await ml.api.cleanMlIndices();
        await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
        await ml.testResources.deleteIndexPatternByTitle('ft_ihp_outlier');
        await ml.testResources.deleteIndexPatternByTitle(ecIndexPattern);
      });

      for (const testUser of testUsers) {
        describe(`(${testUser.user})`, function () {
          before(async () => {
            await ml.securityUI.loginAs(testUser.user);
          });

          after(async () => {
            // NOTE: Logout needs to happen before anything else to avoid flaky behavior
            await ml.securityUI.logout();
          });

          it('should display elements on ML Overview page correctly', async () => {
            await ml.testExecution.logTestStep('should load the Overview page');
            await ml.navigation.navigateToMl();
            await ml.navigation.navigateToOverview();

            await ml.commonUI.waitForDatePickerIndicatorLoaded();

            await ml.testExecution.logTestStep('should display ML Nodes panel');
            await ml.mlNodesPanel.assertNodeOverviewPanel();

            await ml.testExecution.logTestStep('should display Anomaly Detection panel');
            await ml.overviewPage.assertAdJobsOverviewPanelExist();

            await ml.testExecution.logTestStep('should display DFA panel');
            await ml.overviewPage.assertDFAJobsOverviewPanelExist();
          });

          it('should display elements on Anomaly Detection page correctly', async () => {
            await ml.testExecution.logTestStep('should load the AD job management page');
            await ml.navigation.navigateToMl();
            await ml.navigation.navigateToAnomalyDetection();

            await ml.testExecution.logTestStep('should display the stats bar and the AD job table');
            await ml.jobManagement.assertJobStatsBarExists();
            await ml.jobManagement.assertJobTableExists();

            await ml.testExecution.logTestStep('should display an enabled "Create job" button');
            await ml.jobManagement.assertCreateNewJobButtonExists();
            await ml.jobManagement.assertCreateNewJobButtonEnabled(true);

            await ml.testExecution.logTestStep('should display the AD job in the list');
            await ml.jobTable.filterWithSearchString(adJobId, 1);

            await ml.testExecution.logTestStep('should display enabled AD job result links');
            await ml.jobTable.assertJobActionSingleMetricViewerButtonEnabled(adJobId, true);
            await ml.jobTable.assertJobActionAnomalyExplorerButtonEnabled(adJobId, true);

            await ml.testExecution.logTestStep('should display enabled AD job row action buttons');
            await ml.jobTable.assertJobActionsMenuButtonEnabled(adJobId, true);
            await ml.jobTable.assertJobActionStartDatafeedButtonEnabled(adJobId, true);
            await ml.jobTable.assertJobActionCloneJobButtonEnabled(adJobId, true);
            await ml.jobTable.assertJobActionEditJobButtonEnabled(adJobId, true);
            await ml.jobTable.assertJobActionDeleteJobButtonEnabled(adJobId, true);

            await ml.testExecution.logTestStep('should select the job');
            await ml.jobTable.selectJobRow(adJobId);

            await ml.testExecution.logTestStep('should display enabled multi select result links');
            await ml.jobTable.assertMultiSelectActionSingleMetricViewerButtonEnabled(true);
            await ml.jobTable.assertMultiSelectActionAnomalyExplorerButtonEnabled(true);

            await ml.testExecution.logTestStep(
              'should display enabled multi select action buttons'
            );
            await ml.jobTable.assertMultiSelectManagementActionsButtonEnabled(true);
            await ml.jobTable.assertMultiSelectStartDatafeedActionButtonEnabled(true);
            await ml.jobTable.assertMultiSelectDeleteJobActionButtonEnabled(true);
            await ml.jobTable.deselectJobRow(adJobId);
          });

          it('should display elements on Single Metric Viewer page correctly', async () => {
            await ml.testExecution.logTestStep('should open AD job in the single metric viewer');
            await ml.jobTable.clickOpenJobInSingleMetricViewerButton(adJobId);
            await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

            await ml.testExecution.logTestStep('should pre-fill the AD job selection');
            await ml.jobSelection.assertJobSelection([adJobId]);

            await ml.testExecution.logTestStep('should pre-fill the detector input');
            await ml.singleMetricViewer.assertDetectorInputExist();
            await ml.singleMetricViewer.assertDetectorInputValue('0');

            await ml.testExecution.logTestStep('should input the airline entity value');
            await ml.singleMetricViewer.assertEntityInputExist('airline');
            await ml.singleMetricViewer.assertEntityInputSelection('airline', []);
            await ml.singleMetricViewer.selectEntityValue('airline', 'AAL');

            await ml.testExecution.logTestStep('should display the chart');
            await ml.singleMetricViewer.assertChartExist();

            await ml.testExecution.logTestStep('should display the annotations section');
            await ml.singleMetricViewer.assertAnnotationsExists('loaded');

            await ml.testExecution.logTestStep('should display the anomalies table with entries');
            await ml.anomaliesTable.assertTableExists();
            await ml.anomaliesTable.assertTableNotEmpty();

            await ml.testExecution.logTestStep('should display enabled anomaly row action buttons');
            await ml.anomaliesTable.assertAnomalyActionsMenuButtonExists(0);
            await ml.anomaliesTable.assertAnomalyActionsMenuButtonEnabled(0, true);
            await ml.anomaliesTable.assertAnomalyActionConfigureRulesButtonEnabled(0, true);

            await ml.testExecution.logTestStep(
              'should display the forecast modal with enabled run button'
            );
            await ml.forecast.assertForecastButtonExists();
            await ml.forecast.assertForecastButtonEnabled(true);
            await ml.forecast.openForecastModal();
            await ml.forecast.assertForecastModalRunButtonEnabled(true);
            await ml.forecast.closeForecastModal();
          });

          it('should display elements on Anomaly Explorer page correctly', async () => {
            await ml.testExecution.logTestStep('should open AD job in the anomaly explorer');
            await ml.singleMetricViewer.openAnomalyExplorer();
            await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

            await ml.testExecution.logTestStep('should pre-fill the AD job selection');
            await ml.jobSelection.assertJobSelection([adJobId]);

            await ml.testExecution.logTestStep('should display the influencers list');
            await ml.anomalyExplorer.assertInfluencerListExists();
            await ml.anomalyExplorer.assertInfluencerFieldListNotEmpty('airline');

            await ml.testExecution.logTestStep('should display the swim lanes');
            await ml.anomalyExplorer.assertOverallSwimlaneExists();
            await ml.anomalyExplorer.assertSwimlaneViewByExists();

            await ml.testExecution.logTestStep('should display the annotations panel');
            await ml.anomalyExplorer.assertAnnotationsPanelExists('loaded');

            await ml.testExecution.logTestStep('should display the anomalies table with entries');
            await ml.anomaliesTable.assertTableExists();
            await ml.anomaliesTable.assertTableNotEmpty();

            await ml.testExecution.logTestStep('should display enabled anomaly row action button');
            await ml.anomaliesTable.assertAnomalyActionsMenuButtonExists(0);
            await ml.anomaliesTable.assertAnomalyActionsMenuButtonEnabled(0, true);

            await ml.testExecution.logTestStep(
              'should display enabled configure rules action button'
            );
            await ml.anomaliesTable.assertAnomalyActionConfigureRulesButtonEnabled(0, true);

            await ml.testExecution.logTestStep('should display enabled view series action button');
            await ml.anomaliesTable.assertAnomalyActionViewSeriesButtonEnabled(0, true);
          });

          it('should display elements on Data Frame Analytics page correctly', async () => {
            await ml.testExecution.logTestStep('should load the DFA job management page');
            await ml.navigation.navigateToDataFrameAnalytics();

            await ml.testExecution.logTestStep(
              'should display the stats bar and the analytics table'
            );
            await ml.dataFrameAnalytics.assertAnalyticsStatsBarExists();
            await ml.dataFrameAnalytics.assertAnalyticsTableExists();

            await ml.testExecution.logTestStep('should display an enabled "Create job" button');
            await ml.dataFrameAnalytics.assertCreateNewAnalyticsButtonExists();
            await ml.dataFrameAnalytics.assertCreateNewAnalyticsButtonEnabled(true);

            await ml.testExecution.logTestStep('should display the DFA job in the list');
            await ml.dataFrameAnalyticsTable.filterWithSearchString(dfaJobId, 1);

            await ml.testExecution.logTestStep(
              'should display enabled DFA job view and action menu'
            );
            await ml.dataFrameAnalyticsTable.assertJobRowViewButtonEnabled(dfaJobId, true);
            await ml.dataFrameAnalyticsTable.assertJobRowActionsMenuButtonEnabled(dfaJobId, true);
            await ml.dataFrameAnalyticsTable.assertJobActionViewButtonEnabled(dfaJobId, true);

            await ml.testExecution.logTestStep('should display enabled DFA job row action buttons');
            await ml.dataFrameAnalyticsTable.assertJobActionStartButtonEnabled(dfaJobId, false); // job already completed
            await ml.dataFrameAnalyticsTable.assertJobActionEditButtonEnabled(dfaJobId, true);
            await ml.dataFrameAnalyticsTable.assertJobActionCloneButtonEnabled(dfaJobId, true);
            await ml.dataFrameAnalyticsTable.assertJobActionDeleteButtonEnabled(dfaJobId, true);
            await ml.dataFrameAnalyticsTable.ensureJobActionsMenuClosed(dfaJobId);
          });

          it('should display elements on Data Frame Analytics results view page correctly', async () => {
            await ml.testExecution.logTestStep('displays the results view for created job');
            await ml.dataFrameAnalyticsTable.openResultsView(dfaJobId);
            await ml.dataFrameAnalyticsResults.assertOutlierTablePanelExists();
            await ml.dataFrameAnalyticsResults.assertResultsTableExists();
            await ml.dataFrameAnalyticsResults.assertResultsTableNotEmpty();
          });

          it('should display elements on Data Visualizer home page correctly', async () => {
            await ml.testExecution.logTestStep('should load the data visualizer page');
            await ml.navigation.navigateToDataVisualizer();

            await ml.testExecution.logTestStep(
              'should display the "import data" card with enabled button'
            );
            await ml.dataVisualizer.assertDataVisualizerImportDataCardExists();
            await ml.dataVisualizer.assertUploadFileButtonEnabled(true);

            await ml.testExecution.logTestStep(
              'should display the "select data view" card with enabled button'
            );
            await ml.dataVisualizer.assertDataVisualizerIndexDataCardExists();
            await ml.dataVisualizer.assertSelectIndexButtonEnabled(true);
          });

          it('should display elements on Index Data Visualizer page correctly', async () => {
            await ml.testExecution.logTestStep(
              'should load an index into the data visualizer page'
            );
            await ml.dataVisualizer.navigateToIndexPatternSelection();
            await ml.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(ecIndexPattern);

            await ml.testExecution.logTestStep('should display the time range step');
            await ml.dataVisualizerIndexBased.assertTimeRangeSelectorSectionExists();

            await ml.testExecution.logTestStep('should load data for full time range');
            await ml.dataVisualizerIndexBased.clickUseFullDataButton(ecExpectedTotalCount);

            await ml.testExecution.logTestStep('should display the data visualizer table');
            await ml.dataVisualizerIndexBased.assertDataVisualizerTableExist();

            await ml.testExecution.logTestStep(
              `should display the actions panel ${
                testUser.discoverAvailable ? 'with' : 'without'
              } Discover card`
            );
            if (testUser.discoverAvailable) {
              await ml.dataVisualizerIndexBased.assertActionsPanelExists();
            }
            await ml.dataVisualizerIndexBased.assertViewInDiscoverCard(testUser.discoverAvailable);

            await ml.testExecution.logTestStep('should display job cards');
            await ml.dataVisualizerIndexBased.assertCreateAdvancedJobCardExists();
            await ml.dataVisualizerIndexBased.assertCreateDataFrameAnalyticsCardExists();
          });

          it('should display elements on File Data Visualizer page correctly', async () => {
            await ml.testExecution.logTestStep(
              'should load the file data visualizer file selection'
            );
            await ml.navigation.navigateToDataVisualizer();
            await ml.dataVisualizer.navigateToFileUpload();

            await ml.testExecution.logTestStep(
              'should select a file and load visualizer result page'
            );
            await ml.dataVisualizerFileBased.selectFile(uploadFilePath);

            await ml.testExecution.logTestStep(
              'should display components of the file details page'
            );
            await ml.dataVisualizerFileBased.assertFileTitle(expectedUploadFileTitle);
            await ml.dataVisualizerFileBased.assertFileContentPanelExists();
            await ml.dataVisualizerFileBased.assertSummaryPanelExists();
            await ml.dataVisualizerFileBased.assertFileStatsPanelExists();
            await ml.dataVisualizerFileBased.assertImportButtonEnabled(true);
          });

          it('should display elements on Settings home page correctly', async () => {
            await ml.testExecution.logTestStep('should load the settings page');
            await ml.navigation.navigateToSettings();

            await ml.testExecution.logTestStep('should display enabled calendar controls');
            await ml.settings.assertManageCalendarsLinkExists();
            await ml.settings.assertManageCalendarsLinkEnabled(true);
            await ml.settings.assertCreateCalendarLinkExists();
            await ml.settings.assertCreateCalendarLinkEnabled(true);

            await ml.testExecution.logTestStep('should display enabled filter list controls');
            await ml.settings.assertManageFilterListsLinkExists();
            await ml.settings.assertManageFilterListsLinkEnabled(true);
            await ml.settings.assertCreateFilterListLinkExists();
            await ml.settings.assertCreateFilterListLinkEnabled(true);
          });

          it('should display elements on Calendar management page correctly', async () => {
            await ml.testExecution.logTestStep('should load the calendar management page');
            await ml.settings.navigateToCalendarManagement();

            await ml.testExecution.logTestStep('should display enabled create calendar button');
            await ml.settingsCalendar.assertCreateCalendarButtonEnabled(true);

            await ml.testExecution.logTestStep('should display the calendar in the list');
            await ml.settingsCalendar.filterWithSearchString(calendarId, 1);

            await ml.testExecution.logTestStep('should enable delete calendar button on selection');
            await ml.settingsCalendar.assertDeleteCalendarButtonEnabled(false);
            await ml.settingsCalendar.selectCalendarRow(calendarId);
            await ml.settingsCalendar.assertDeleteCalendarButtonEnabled(true);

            await ml.testExecution.logTestStep('should load the calendar edit page');
            await ml.settingsCalendar.openCalendarEditForm(calendarId);

            await ml.testExecution.logTestStep(
              'should display enabled elements of the edit calendar page'
            );
            await ml.settingsCalendar.assertApplyToAllJobsSwitchEnabled(true);
            await ml.settingsCalendar.assertJobSelectionEnabled(true);
            await ml.settingsCalendar.assertJobGroupSelectionEnabled(true);
            await ml.settingsCalendar.assertNewEventButtonEnabled(true);
            await ml.settingsCalendar.assertImportEventsButtonEnabled(true);

            await ml.testExecution.logTestStep('should display the event in the list');
            await ml.settingsCalendar.assertEventRowExists(eventDescription);

            await ml.testExecution.logTestStep('should display enabled delete event button');
            await ml.settingsCalendar.assertDeleteEventButtonEnabled(eventDescription, true);
          });

          it('should display elements on Filter Lists management page correctly', async () => {
            await ml.testExecution.logTestStep('should load the filter list management page');
            await ml.navigation.navigateToSettings();
            await ml.settings.navigateToFilterListsManagement();

            await ml.testExecution.logTestStep('should display enabled create filter list button');
            await ml.settingsFilterList.assertCreateFilterListButtonEnabled(true);

            await ml.testExecution.logTestStep('should display the filter list in the table');
            await ml.settingsFilterList.filterWithSearchString(filterId, 1);

            await ml.testExecution.logTestStep(
              'should enable delete filter list button on selection'
            );
            await ml.settingsFilterList.assertDeleteFilterListButtonEnabled(false);
            await ml.settingsFilterList.selectFilterListRow(filterId);
            await ml.settingsFilterList.assertDeleteFilterListButtonEnabled(true);

            await ml.testExecution.logTestStep('should load the filter list edit page');
            await ml.settingsFilterList.openFilterListEditForm(filterId);

            await ml.testExecution.logTestStep(
              'should display enabled elements of the edit calendar page'
            );
            await ml.settingsFilterList.assertEditDescriptionButtonEnabled(true);
            await ml.settingsFilterList.assertAddItemsButtonEnabled(true);

            await ml.testExecution.logTestStep('should display the filter item in the list');
            await ml.settingsFilterList.assertFilterItemExists(filterItems[0]);

            await ml.testExecution.logTestStep(
              'should enable delete filter item button on selection'
            );
            await ml.settingsFilterList.assertDeleteItemButtonEnabled(false);
            await ml.settingsFilterList.selectFilterItem(filterItems[0]);
            await ml.settingsFilterList.assertDeleteItemButtonEnabled(true);
          });

          it('should display elements on Stack Management ML page correctly', async () => {
            await ml.testExecution.logTestStep(
              'should load the stack management with the ML menu item being present'
            );
            await ml.navigation.navigateToStackManagement();

            await ml.testExecution.logTestStep(
              'should load the jobs list page in stack management'
            );
            await ml.navigation.navigateToStackManagementJobsListPage();

            await ml.testExecution.logTestStep('should display the AD job in the list');
            await ml.jobTable.filterWithSearchString(adJobId, 1, 'stackMgmtJobList');

            await ml.testExecution.logTestStep(
              'should load the analytics jobs list page in stack management'
            );
            await ml.navigation.navigateToStackManagementJobsListPageAnalyticsTab();

            await ml.testExecution.logTestStep('should display the DFA job in the list');
            await ml.dataFrameAnalyticsTable.filterWithSearchString(dfaJobId, 1);
          });
        });
      }
    });
  });
}
