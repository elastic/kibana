/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');

  const testDataListPositive = [
    {
      suiteSuffix: 'with an artificial server log',
      filePath: path.join(__dirname, 'files_to_import', 'artificial_server_log'),
      indexName: 'user-import_1',
      createIndexPattern: false,
      expected: {
        results: {
          title: 'artificial_server_log',
        },
      },
    },
  ];

  const testDataListNegative = [
    {
      suiteSuffix: 'with a non-log file',
      filePath: path.join(__dirname, 'files_to_import', 'not_a_log_file'),
    },
  ];

  describe('file based', function () {
    this.tags(['mlqa']);
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
      await ml.navigation.navigateToMl();
    });

    for (const testData of testDataListPositive) {
      describe(testData.suiteSuffix, function () {
        after(async () => {
          await ml.api.deleteIndices(testData.indexName);
        });

        it('displays and imports a file', async () => {
          await ml.testExecution.logTestStep('loads the data visualizer selector page');
          await ml.navigation.navigateToDataVisualizer();

          await ml.testExecution.logTestStep('loads the file upload page');
          await ml.dataVisualizer.navigateToFileUpload();

          await ml.testExecution.logTestStep('selects a file and loads visualizer results');
          await ml.dataVisualizerFileBased.selectFile(testData.filePath);

          await ml.testExecution.logTestStep('displays the components of the file details page');
          await ml.dataVisualizerFileBased.assertFileTitle(testData.expected.results.title);
          await ml.dataVisualizerFileBased.assertFileContentPanelExists();
          await ml.dataVisualizerFileBased.assertSummaryPanelExists();
          await ml.dataVisualizerFileBased.assertFileStatsPanelExists();

          await ml.testExecution.logTestStep('loads the import settings page');
          await ml.dataVisualizerFileBased.navigateToFileImport();

          await ml.testExecution.logTestStep('sets the index name');
          await ml.dataVisualizerFileBased.setIndexName(testData.indexName);

          await ml.testExecution.logTestStep('sets the create index pattern checkbox');
          await ml.dataVisualizerFileBased.setCreateIndexPatternCheckboxState(
            testData.createIndexPattern
          );

          await ml.testExecution.logTestStep('imports the file');
          await ml.dataVisualizerFileBased.startImportAndWaitForProcessing();
        });
      });
    }

    for (const testData of testDataListNegative) {
      describe(testData.suiteSuffix, function () {
        it('does not import an invalid file', async () => {
          await ml.testExecution.logTestStep('loads the data visualizer selector page');
          await ml.navigation.navigateToDataVisualizer();

          await ml.testExecution.logTestStep('loads the file upload page');
          await ml.dataVisualizer.navigateToFileUpload();

          await ml.testExecution.logTestStep('selects a file and displays an error');
          await ml.dataVisualizerFileBased.selectFile(testData.filePath, true);
        });
      });
    }
  });
}
