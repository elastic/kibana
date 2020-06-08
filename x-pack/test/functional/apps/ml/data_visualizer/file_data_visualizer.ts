/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';

import { FtrProviderContext } from '../../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
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

        it('loads the data visualizer selector page', async () => {
          await ml.navigation.navigateToDataVisualizer();
        });

        it('loads the file upload page', async () => {
          await ml.dataVisualizer.navigateToFileUpload();
        });

        it('selects a file and loads visualizer results', async () => {
          await ml.dataVisualizerFileBased.selectFile(testData.filePath);
        });

        it('displays the components of the file details page', async () => {
          await ml.dataVisualizerFileBased.assertFileTitle(testData.expected.results.title);
          await ml.dataVisualizerFileBased.assertFileContentPanelExists();
          await ml.dataVisualizerFileBased.assertSummaryPanelExists();
          await ml.dataVisualizerFileBased.assertFileStatsPanelExists();
        });

        it('loads the import settings page', async () => {
          await ml.dataVisualizerFileBased.navigateToFileImport();
        });

        it('sets the index name', async () => {
          await ml.dataVisualizerFileBased.setIndexName(testData.indexName);
        });

        it('sets the create index pattern checkbox', async () => {
          await ml.dataVisualizerFileBased.setCreateIndexPatternCheckboxState(
            testData.createIndexPattern
          );
        });

        it('imports the file', async () => {
          await ml.dataVisualizerFileBased.startImportAndWaitForProcessing();
        });
      });
    }

    for (const testData of testDataListNegative) {
      describe(testData.suiteSuffix, function () {
        it('loads the data visualizer selector page', async () => {
          await ml.navigation.navigateToDataVisualizer();
        });

        it('loads the file upload page', async () => {
          await ml.dataVisualizer.navigateToFileUpload();
        });

        it('selects a file and displays an error', async () => {
          await ml.dataVisualizerFileBased.selectFile(testData.filePath, true);
        });
      });
    }
  });
}
