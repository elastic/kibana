/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';

import { FtrProviderContext } from '../../../ftr_provider_context';

import { USER } from '../../../services/ml/security_common';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  const testUsers = [USER.ML_VIEWER, USER.ML_VIEWER_SPACES];

  describe('for user with read ML access', function () {
    this.tags(['skipFirefox', 'mlqa']);

    describe('with no data loaded', function () {
      for (const user of testUsers) {
        describe(`(${user})`, function () {
          before(async () => {
            await ml.securityUI.loginAs(user);
            await ml.api.cleanMlIndices();
          });

          after(async () => {
            await ml.securityUI.logout();
          });

          it('should not display the ML file data vis link on the Kibana home page', async () => {
            await ml.testExecution.logTestStep('should load the Kibana home page');
            await ml.navigation.navigateToKibanaHome();

            await ml.testExecution.logTestStep('should not display the ML file data vis link');
            await ml.commonUI.assertKibanaHomeFileDataVisLinkNotExists();
          });

          it('should display the ML entry in Kibana app menu', async () => {
            await ml.testExecution.logTestStep('should open the Kibana app menu');
            await ml.navigation.openKibanaNav();

            await ml.testExecution.logTestStep('should display the ML nav link');
            await ml.navigation.assertKibanaNavMLEntryExists();
          });

          it('should display tabs in the ML app correctly', async () => {
            await ml.testExecution.logTestStep('should load the ML app');
            await ml.navigation.navigateToMl();

            await ml.testExecution.logTestStep('should display the enabled "Overview" tab');
            await ml.navigation.assertOverviewTabEnabled(true);

            await ml.testExecution.logTestStep(
              'should display the enabled "Anomaly Detection" tab'
            );
            await ml.navigation.assertAnomalyDetectionTabEnabled(true);

            await ml.testExecution.logTestStep(
              'should display the enabled "Data Frame Analytics" tab'
            );
            await ml.navigation.assertDataFrameAnalyticsTabEnabled(true);

            await ml.testExecution.logTestStep('should display the enabled "Data Visualizer" tab');
            await ml.navigation.assertDataVisualizerTabEnabled(true);

            await ml.testExecution.logTestStep('should display the enabled "Settings" tab');
            await ml.navigation.assertSettingsTabEnabled(true);
          });

          it('should display elements on ML Overview page correctly', async () => {
            await ml.testExecution.logTestStep('should load the ML overview page');
            await ml.navigation.navigateToMl();
            await ml.navigation.navigateToOverview();

            await ml.testExecution.logTestStep('should display disabled AD create job button');
            await ml.overviewPage.assertADCreateJobButtonExists();
            await ml.overviewPage.assertADCreateJobButtonEnabled(false);

            await ml.testExecution.logTestStep('should display disabled DFA create job button');
            await ml.overviewPage.assertDFACreateJobButtonExists();
            await ml.overviewPage.assertDFACreateJobButtonEnabled(false);
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
      const ecExpectedFieldPanelCount = 2;

      const uploadFilePath = path.join(
        __dirname,
        '..',
        'data_visualizer',
        'files_to_import',
        'artificial_server_log'
      );
      const expectedUploadFileTitle = 'artificial_server_log';

      before(async () => {
        await esArchiver.loadIfNeeded('ml/farequote');
        await esArchiver.loadIfNeeded('ml/ihp_outlier');
        await esArchiver.loadIfNeeded('ml/module_sample_ecommerce');
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
            start_time: 1513641600000,
            end_time: 1513728000000,
          },
        ]);

        await ml.api.createFilter(filterId, {
          description: 'Test filter list',
          items: filterItems,
        });
      });

      after(async () => {
        await ml.api.cleanMlIndices();
        await ml.api.deleteIndices(`user-${dfaJobId}`);
        await ml.api.deleteCalendar(calendarId);
        await ml.api.deleteFilter(filterId);
      });

      for (const user of testUsers) {
        describe(`(${user})`, function () {
          before(async () => {
            await ml.securityUI.loginAs(user);
          });

          after(async () => {
            await ml.securityUI.logout();
          });

          it('should display elements on Anomaly Detection page correctly', async () => {
            await ml.testExecution.logTestStep('should load the AD job management page');
            await ml.navigation.navigateToMl();
            await ml.navigation.navigateToAnomalyDetection();

            await ml.testExecution.logTestStep('should display the stats bar and the AD job table');
            await ml.jobManagement.assertJobStatsBarExists();
            await ml.jobManagement.assertJobTableExists();

            await ml.testExecution.logTestStep('should display a disabled "Create job" button');
            await ml.jobManagement.assertCreateNewJobButtonExists();
            await ml.jobManagement.assertCreateNewJobButtonEnabled(false);

            await ml.testExecution.logTestStep('should display the AD job in the list');
            await ml.jobTable.filterWithSearchString(adJobId, 1);

            await ml.testExecution.logTestStep('should display enabled AD job result links');
            await ml.jobTable.assertJobActionSingleMetricViewerButtonEnabled(adJobId, true);
            await ml.jobTable.assertJobActionAnomalyExplorerButtonEnabled(adJobId, true);

            await ml.testExecution.logTestStep('should display disabled AD job row action button');
            await ml.jobTable.assertJobActionsMenuButtonEnabled(adJobId, false);

            await ml.testExecution.logTestStep('should select the job');
            await ml.jobTable.selectJobRow(adJobId);

            await ml.testExecution.logTestStep('should display enabled multi select result links');
            await ml.jobTable.assertMultiSelectActionSingleMetricViewerButtonEnabled(true);
            await ml.jobTable.assertMultiSelectActionAnomalyExplorerButtonEnabled(true);

            await ml.testExecution.logTestStep(
              'should display disabled multi select action button'
            );
            await ml.jobTable.assertMultiSelectManagementActionsButtonEnabled(false);
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

            await ml.testExecution.logTestStep('should not display the anomaly row action button');
            await ml.anomaliesTable.assertAnomalyActionsMenuButtonNotExists(0);

            await ml.testExecution.logTestStep(
              'should display the forecast modal with disabled run button'
            );
            await ml.singleMetricViewer.assertForecastButtonExists();
            await ml.singleMetricViewer.assertForecastButtonEnabled(true);
            await ml.singleMetricViewer.openForecastModal();
            await ml.singleMetricViewer.assertForecastModalRunButtonEnabled(false);
            await ml.singleMetricViewer.closeForecastModal();
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

            await ml.testExecution.logTestStep('should not display configure rules action button');
            await ml.anomaliesTable.assertAnomalyActionConfigureRulesButtonNotExists(0);

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

            await ml.testExecution.logTestStep('should display a disabled "Create job" button');
            await ml.dataFrameAnalytics.assertCreateNewAnalyticsButtonExists();
            await ml.dataFrameAnalytics.assertCreateNewAnalyticsButtonEnabled(false);

            await ml.testExecution.logTestStep('should display the DFA job in the list');
            await ml.dataFrameAnalyticsTable.filterWithSearchString(dfaJobId, 1);

            await ml.testExecution.logTestStep(
              'should display enabled DFA job view and action menu'
            );
            await ml.dataFrameAnalyticsTable.assertJobRowViewButtonEnabled(dfaJobId, true);
            await ml.dataFrameAnalyticsTable.assertJowRowActionsMenuButtonEnabled(dfaJobId, true);
            await ml.dataFrameAnalyticsTable.assertJobActionViewButtonEnabled(dfaJobId, true);

            await ml.testExecution.logTestStep(
              'should display disabled DFA job row action buttons'
            );
            await ml.dataFrameAnalyticsTable.assertJobActionStartButtonEnabled(dfaJobId, false); // job already completed
            await ml.dataFrameAnalyticsTable.assertJobActionEditButtonEnabled(dfaJobId, false);
            await ml.dataFrameAnalyticsTable.assertJobActionCloneButtonEnabled(dfaJobId, false);
            await ml.dataFrameAnalyticsTable.assertJobActionDeleteButtonEnabled(dfaJobId, false);
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
              'should display the "select index pattern" card with enabled button'
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

            await ml.testExecution.logTestStep('should display the panels of fields');
            await ml.dataVisualizerIndexBased.assertFieldsPanelsExist(ecExpectedFieldPanelCount);

            await ml.testExecution.logTestStep('should not display the actions panel');
            await ml.dataVisualizerIndexBased.assertActionsPanelNotExists();
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
            await ml.dataVisualizerFileBased.assertImportButtonEnabled(false);
          });

          it('should display elements on Settings home page correctly', async () => {
            await ml.testExecution.logTestStep('should load the settings page');
            await ml.navigation.navigateToSettings();

            await ml.testExecution.logTestStep(
              'should display enabled calendar management and disabled calendar create links'
            );
            await ml.settings.assertManageCalendarsLinkExists();
            await ml.settings.assertManageCalendarsLinkEnabled(true);
            await ml.settings.assertCreateCalendarLinkExists();
            await ml.settings.assertCreateCalendarLinkEnabled(false);

            await ml.testExecution.logTestStep('should display disabled filter list controls');
            await ml.settings.assertManageFilterListsLinkExists();
            await ml.settings.assertManageFilterListsLinkEnabled(false);
            await ml.settings.assertCreateFilterListLinkExists();
            await ml.settings.assertCreateFilterListLinkEnabled(false);
          });

          it('should display elements on Calendar management page correctly', async () => {
            await ml.testExecution.logTestStep('should load the calendar management page');
            await ml.settings.navigateToCalendarManagement();

            await ml.testExecution.logTestStep('should display disabled create calendar button');
            await ml.settingsCalendar.assertCreateCalendarButtonEnabled(false);

            await ml.testExecution.logTestStep('should display the calendar in the list');
            await ml.settingsCalendar.filterWithSearchString(calendarId, 1);

            await ml.testExecution.logTestStep(
              'should not enable delete calendar button on selection'
            );
            await ml.settingsCalendar.assertDeleteCalendarButtonEnabled(false);
            await ml.settingsCalendar.selectCalendarRow(calendarId);
            await ml.settingsCalendar.assertDeleteCalendarButtonEnabled(false);

            await ml.testExecution.logTestStep('should load the calendar edit page');
            await ml.settingsCalendar.openCalendarEditForm(calendarId);

            await ml.testExecution.logTestStep(
              'should display disabled elements of the edit calendar page'
            );
            await ml.settingsCalendar.assertApplyToAllJobsSwitchEnabled(false);
            await ml.settingsCalendar.assertJobSelectionEnabled(false);
            await ml.settingsCalendar.assertJobGroupSelectionEnabled(false);
            await ml.settingsCalendar.assertNewEventButtonEnabled(false);
            await ml.settingsCalendar.assertImportEventsButtonEnabled(false);

            await ml.testExecution.logTestStep('should display the event in the list');
            await ml.settingsCalendar.assertEventRowExists(eventDescription);

            await ml.testExecution.logTestStep('should display enabled delete event button');
            await ml.settingsCalendar.assertDeleteEventButtonEnabled(eventDescription, false);
          });

          it('should display elements on Stack Management ML page correctly', async () => {
            await ml.testExecution.logTestStep(
              'should load the stack management with the ML menu item being absent'
            );
            await ml.navigation.navigateToStackManagement({ expectMlLink: false });
          });
        });
      }
    });
  });
}
