/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DatasetQualityFtrProviderContext } from './config';
import { datasetNames, getInitialTestLogs, getLogsForDataset, productionNamespace } from './data';

export default function ({ getService, getPageObjects }: DatasetQualityFtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
  ]);
  const synthtrace = getService('logSynthtraceEsClient');
  const testSubjects = getService('testSubjects');
  const to = '2024-01-01T12:00:00.000Z';
  const apacheAccessDatasetName = 'apache.access';
  const apacheAccessDatasetHumanName = 'Apache access logs';
  const apacheIntegrationName = 'Apache HTTP Server';
  const pkg = {
    name: 'apache',
    version: '1.14.0',
  };
  const allDatasetNames = [apacheAccessDatasetHumanName, ...datasetNames];

  describe('Dataset quality table filters', () => {
    before(async () => {
      // Install Integration and ingest logs for it
      await PageObjects.observabilityLogsExplorer.installPackage(pkg);
      // Ingest basic logs
      await synthtrace.index([
        // Ingest basic logs
        getInitialTestLogs({ to, count: 4 }),
        // Ingest Degraded Logs
        getLogsForDataset({
          to: new Date().toISOString(),
          count: 1,
          dataset: datasetNames[2],
          isMalformed: true,
        }),
        // Index 10 logs for `logs-apache.access` dataset
        getLogsForDataset({
          to,
          count: 10,
          dataset: apacheAccessDatasetName,
          namespace: productionNamespace,
        }),
      ]);
      await PageObjects.datasetQuality.navigateTo();
    });

    after(async () => {
      await PageObjects.observabilityLogsExplorer.uninstallPackage(pkg);
      await synthtrace.clean();
    });

    it('shows full dataset names when toggled', async () => {
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols['Data Set Name'];
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();
      expect(datasetNameColCellTexts).to.eql(allDatasetNames);

      await PageObjects.datasetQuality.toggleShowFullDatasetNames();

      const datasetNameColCellTextsAfterToggle = await datasetNameCol.getCellTexts();
      const duplicateNames = [
        `${apacheAccessDatasetHumanName}\n${apacheAccessDatasetName}`,
        ...datasetNames.map((name) => `${name}\n${name}`),
      ];

      expect(datasetNameColCellTextsAfterToggle).to.eql(duplicateNames);

      // resetting the toggle
      await PageObjects.datasetQuality.toggleShowFullDatasetNames();
      const datasetNameColCellTextsAfterReToggle = await datasetNameCol.getCellTexts();
      expect(datasetNameColCellTextsAfterReToggle).to.eql(allDatasetNames);
    });

    it('searches the datasets', async () => {
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols['Data Set Name'];
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();
      expect(datasetNameColCellTexts).to.eql(allDatasetNames);

      // Search for a dataset
      await testSubjects.setValue(
        PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFilterBarFieldSearch,
        datasetNames[2]
      );

      const colsAfterSearch = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameColAfterSearch = colsAfterSearch['Data Set Name'];
      const datasetNameColCellTextsAfterSearch = await datasetNameColAfterSearch.getCellTexts();
      expect(datasetNameColCellTextsAfterSearch).to.eql([datasetNames[2]]);

      // Reset the search field
      await testSubjects.click('clearSearchButton');
    });

    it('filters for integration', async () => {
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols['Data Set Name'];
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();
      expect(datasetNameColCellTexts).to.eql(allDatasetNames);

      // Filter for integration
      await PageObjects.datasetQuality.filterForIntegrations([apacheIntegrationName]);

      const colsAfterFilter = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameColAfterFilter = colsAfterFilter['Data Set Name'];
      const datasetNameColCellTextsAfterFilter = await datasetNameColAfterFilter.getCellTexts();

      expect(datasetNameColCellTextsAfterFilter).to.eql([apacheAccessDatasetHumanName]);
      // Reset the filter by selecting from the dropdown again
      await PageObjects.datasetQuality.filterForIntegrations([apacheIntegrationName]);
    });

    it('filters for namespace', async () => {
      // Get default namespaces
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const namespaceCol = cols.Namespace;
      const namespaceColCellTexts = await namespaceCol.getCellTexts();
      expect(namespaceColCellTexts).to.contain(productionNamespace);

      // Filter for production namespace
      await PageObjects.datasetQuality.filterForNamespaces([productionNamespace]);

      const colsAfterFilter = await PageObjects.datasetQuality.parseDatasetTable();
      const namespaceColAfterFilter = colsAfterFilter.Namespace;
      const namespaceColCellTextsAfterFilter = await namespaceColAfterFilter.getCellTexts();

      expect(namespaceColCellTextsAfterFilter).to.eql([productionNamespace]);
      // Reset the namespace by selecting from the dropdown again
      await PageObjects.datasetQuality.filterForNamespaces([productionNamespace]);
    });

    it('filters for quality', async () => {
      const expectedQuality = 'Poor';
      // Get default quality
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetQuality = cols['Data Set Quality'];
      const datasetQualityCellTexts = await datasetQuality.getCellTexts();
      expect(datasetQualityCellTexts).to.contain(expectedQuality);

      // Filter for Poor quality
      await PageObjects.datasetQuality.filterForQualities([expectedQuality]);

      const colsAfterFilter = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetQualityAfterFilter = colsAfterFilter['Data Set Quality'];
      const datasetQualityCellTextsAfterFilter = await datasetQualityAfterFilter.getCellTexts();

      expect(datasetQualityCellTextsAfterFilter).to.eql([expectedQuality]);

      // Reset the namespace by selecting from the dropdown again
      await PageObjects.datasetQuality.filterForQualities([expectedQuality]);
    });
  });
}
