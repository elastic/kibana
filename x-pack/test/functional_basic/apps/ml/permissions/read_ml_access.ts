/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';

import { FtrProviderContext } from '../../../ftr_provider_context';

import { USER } from '../../../../functional/services/ml/security_common';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  const testUsers = [USER.ML_VIEWER, USER.ML_VIEWER_SPACES];

  describe('for user with read ML access', function () {
    for (const user of testUsers) {
      describe(`(${user})`, function () {
        const ecIndexPattern = 'ft_module_sample_ecommerce';
        const ecExpectedTotalCount = 287;
        const ecExpectedFieldPanelCount = 2;
        const ecExpectedModuleId = 'sample_data_ecommerce';

        const uploadFilePath = path.join(
          __dirname,
          '..',
          '..',
          '..',
          '..',
          'functional',
          'apps',
          'ml',
          'data_visualizer',
          'files_to_import',
          'artificial_server_log'
        );
        const expectedUploadFileTitle = 'artificial_server_log';

        before(async () => {
          await ml.api.cleanMlIndices();

          await esArchiver.loadIfNeeded('ml/module_sample_ecommerce');
          await ml.testResources.createIndexPatternIfNeeded(ecIndexPattern, 'order_date');

          await ml.securityUI.loginAs(user);
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

          await ml.testExecution.logTestStep('should display the disabled "Overview" tab');
          await ml.navigation.assertOverviewTabEnabled(false);

          await ml.testExecution.logTestStep('should display the disabled "Anomaly Detection" tab');
          await ml.navigation.assertAnomalyDetectionTabEnabled(false);

          await ml.testExecution.logTestStep(
            'should display the disabled "Data Frame Analytics" tab'
          );
          await ml.navigation.assertDataFrameAnalyticsTabEnabled(false);

          await ml.testExecution.logTestStep('should display the enabled "Data Visualizer" tab');
          await ml.navigation.assertDataVisualizerTabEnabled(true);

          await ml.testExecution.logTestStep('should display the disabled "Settings" tab');
          await ml.navigation.assertSettingsTabEnabled(false);
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

          await ml.testExecution.logTestStep(
            'should display the "start trial" card with enabled button'
          );
          await ml.dataVisualizer.assertDataVisualizerStartTrialCardExists();
          await ml.dataVisualizer.assertStartTrialButtonEnabled(true);
        });

        it('should display elements on Index Data Visualizer page correctly', async () => {
          await ml.testExecution.logTestStep('should load an index into the data visualizer page');
          await ml.dataVisualizer.navigateToIndexPatternSelection();
          await ml.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(ecIndexPattern);

          await ml.testExecution.logTestStep('should display the time range step');
          await ml.dataVisualizerIndexBased.assertTimeRangeSelectorSectionExists();

          await ml.testExecution.logTestStep('should load data for full time range');
          await ml.dataVisualizerIndexBased.clickUseFullDataButton(ecExpectedTotalCount);

          await ml.testExecution.logTestStep('should display the panels of fields');
          await ml.dataVisualizerIndexBased.assertFieldsPanelsExist(ecExpectedFieldPanelCount);

          await ml.testExecution.logTestStep('should not display the actions panel with cards');
          await ml.dataVisualizerIndexBased.assertActionsPanelNotExists();
          await ml.dataVisualizerIndexBased.assertCreateAdvancedJobCardNotExists();
          await ml.dataVisualizerIndexBased.assertRecognizerCardNotExists(ecExpectedModuleId);
        });

        it('should display elements on File Data Visualizer page correctly', async () => {
          await ml.testExecution.logTestStep('should load the file data visualizer file selection');
          await ml.navigation.navigateToDataVisualizer();
          await ml.dataVisualizer.navigateToFileUpload();

          await ml.testExecution.logTestStep(
            'should select a file and load visualizer result page'
          );
          await ml.dataVisualizerFileBased.selectFile(uploadFilePath);

          await ml.testExecution.logTestStep('should display components of the file details page');
          await ml.dataVisualizerFileBased.assertFileTitle(expectedUploadFileTitle);
          await ml.dataVisualizerFileBased.assertFileContentPanelExists();
          await ml.dataVisualizerFileBased.assertSummaryPanelExists();
          await ml.dataVisualizerFileBased.assertFileStatsPanelExists();
          await ml.dataVisualizerFileBased.assertImportButtonEnabled(false);
        });

        it('should not allow access to the Stack Management ML page', async () => {
          await ml.testExecution.logTestStep(
            'should load the stack management with the ML menu item being absent'
          );
          await ml.navigation.navigateToStackManagement({ expectMlLink: false });
        });
      });
    }
  });
}
