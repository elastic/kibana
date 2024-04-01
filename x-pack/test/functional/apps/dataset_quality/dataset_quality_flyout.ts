/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DatasetQualityFtrProviderContext } from './config';
import { datasetNames, getInitialTestLogs, getLogsForDataset } from './data';

export default function ({ getService, getPageObjects }: DatasetQualityFtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
  ]);
  const testSubjects = getService('testSubjects');
  const synthtrace = getService('logSynthtraceEsClient');
  const to = '2024-01-01T12:00:00.000Z';

  describe('Dataset quality flyout', () => {
    before(async () => {
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      await PageObjects.datasetQuality.navigateTo();
    });

    after(async () => {
      await synthtrace.clean();
      await PageObjects.observabilityLogsExplorer.removeInstalledPackages();
    });

    it('opens the flyout for the right dataset', async () => {
      const testDatasetName = datasetNames[1];

      await PageObjects.datasetQuality.openDatasetFlyout(testDatasetName);

      await testSubjects.existOrFail(
        PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutTitle
      );
    });

    it('shows the correct last activity', async () => {
      const testDatasetName = datasetNames[0];

      // Update last activity for the dataset
      await PageObjects.datasetQuality.closeFlyout();
      await synthtrace.index(
        getLogsForDataset({ to: new Date().toISOString(), count: 1, dataset: testDatasetName })
      );
      await PageObjects.datasetQuality.refreshTable();

      const cols = await PageObjects.datasetQuality.parseDatasetTable();

      const datasetNameCol = cols['Dataset Name'];
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();

      const testDatasetRowIndex = datasetNameColCellTexts.findIndex(
        (dName: string) => dName === testDatasetName
      );

      const lastActivityText = (await cols['Last Activity'].getCellTexts())[testDatasetRowIndex];

      await PageObjects.datasetQuality.openDatasetFlyout(testDatasetName);

      const lastActivityTextExists = await PageObjects.datasetQuality.doestTextExistInFlyout(
        lastActivityText,
        `[data-test-subj=${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutFieldValue}]`
      );
      expect(lastActivityTextExists).to.eql(true);
    });

    it('shows the integration details', async () => {
      const apacheAccessDatasetName = 'apache.access';
      const apacheAccessDatasetHumanName = 'Apache access logs';
      const apacheIntegrationId = 'apache';

      await PageObjects.observabilityLogsExplorer.navigateTo();

      // Add initial integrations
      await PageObjects.observabilityLogsExplorer.setupInitialIntegrations();

      // Index 10 logs for `logs-apache.access` dataset
      await synthtrace.index(
        getLogsForDataset({ to, count: 10, dataset: apacheAccessDatasetName })
      );

      await PageObjects.datasetQuality.navigateTo();

      await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);

      const integrationNameElements = await PageObjects.datasetQuality.getFlyoutElementsByText(
        '[data-test-subj=datasetQualityFlyoutFieldValue]',
        apacheIntegrationId
      );

      expect(integrationNameElements.length).to.eql(1);
    });

    it('goes to log explorer page when open button is clicked', async () => {
      const testDatasetName = datasetNames[2];
      await PageObjects.datasetQuality.openDatasetFlyout(testDatasetName);

      await (await PageObjects.datasetQuality.getFlyoutLogsExplorerButton()).click();

      // Confirm dataset selector text in observability logs explorer
      const datasetSelectorText =
        await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButtonText();
      expect(datasetSelectorText).to.eql(testDatasetName);
    });
  });
}
