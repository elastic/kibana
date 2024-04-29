/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { datasetNames, defaultNamespace, getInitialTestLogs, getLogsForDataset } from './data';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'observabilityLogsExplorer',
    'datasetQuality',
    'svlCommonNavigation',
    'svlCommonPage',
  ]);
  const synthtrace = getService('svlLogsSynthtraceClient');
  const testSubjects = getService('testSubjects');
  const to = '2024-01-01T12:00:00.000Z';

  describe('Dataset quality table filters', () => {
    before(async () => {
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      await PageObjects.svlCommonPage.loginWithRole('admin');
      await PageObjects.datasetQuality.navigateTo();
    });

    after(async () => {
      await synthtrace.clean();
      await PageObjects.observabilityLogsExplorer.removeInstalledPackages();
    });

    it('hides inactive datasets when toggled', async () => {
      const initialRows = await PageObjects.datasetQuality.getDatasetTableRows();
      expect(initialRows.length).to.eql(3);

      await PageObjects.datasetQuality.toggleShowInactiveDatasets();

      const afterToggleRows = await PageObjects.datasetQuality.getDatasetTableRows();
      expect(afterToggleRows.length).to.eql(1);

      await PageObjects.datasetQuality.toggleShowInactiveDatasets();

      const afterReToggleRows = await PageObjects.datasetQuality.getDatasetTableRows();
      expect(afterReToggleRows.length).to.eql(3);
    });

    it('shows full dataset names when toggled', async () => {
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols['Dataset Name'];
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();
      expect(datasetNameColCellTexts).to.eql(datasetNames);

      await PageObjects.datasetQuality.toggleShowFullDatasetNames();

      const datasetNameColCellTextsAfterToggle = await datasetNameCol.getCellTexts();
      const duplicateNames = datasetNames.map((name) => `${name}\n${name}`);
      expect(datasetNameColCellTextsAfterToggle).to.eql(duplicateNames);

      await PageObjects.datasetQuality.toggleShowFullDatasetNames();
      const datasetNameColCellTextsAfterReToggle = await datasetNameCol.getCellTexts();
      expect(datasetNameColCellTextsAfterReToggle).to.eql(datasetNames);
    });

    it('searches the datasets', async () => {
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols['Dataset Name'];
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();
      expect(datasetNameColCellTexts).to.eql(datasetNames);

      // Search for a dataset
      await testSubjects.setValue(
        PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFilterBarFieldSearch,
        datasetNames[2]
      );

      const colsAfterSearch = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameColAfterSearch = colsAfterSearch['Dataset Name'];
      const datasetNameColCellTextsAfterSearch = await datasetNameColAfterSearch.getCellTexts();
      expect(datasetNameColCellTextsAfterSearch).to.eql([datasetNames[2]]);
      await testSubjects.setValue(
        PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFilterBarFieldSearch,
        ''
      );
    });

    it('filters for integration', async () => {
      const apacheAccessDatasetName = 'apache.access';
      const apacheAccessDatasetHumanName = 'Apache access logs';
      const apacheIntegrationName = 'Apache HTTP Server';

      await PageObjects.observabilityLogsExplorer.navigateTo();

      // Add initial integrations
      await PageObjects.observabilityLogsExplorer.setupInitialIntegrations();

      // Index 10 logs for `logs-apache.access` dataset
      await synthtrace.index(
        getLogsForDataset({ to, count: 10, dataset: apacheAccessDatasetName })
      );

      await PageObjects.datasetQuality.navigateTo();

      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols['Dataset Name'];
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();
      expect(datasetNameColCellTexts).to.eql([apacheAccessDatasetHumanName, ...datasetNames]);

      // Filter for integration
      await PageObjects.datasetQuality.filterForIntegrations([apacheIntegrationName]);

      const colsAfterFilter = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameColAfterFilter = colsAfterFilter['Dataset Name'];
      const datasetNameColCellTextsAfterFilter = await datasetNameColAfterFilter.getCellTexts();
      expect(datasetNameColCellTextsAfterFilter).to.eql([apacheAccessDatasetHumanName]);
    });

    it('filters for namespace', async () => {
      const apacheAccessDatasetName = 'apache.access';
      const datasetNamespace = 'prod';

      await PageObjects.observabilityLogsExplorer.navigateTo();

      // Add initial integrations
      await PageObjects.observabilityLogsExplorer.setupInitialIntegrations();

      // Index 10 logs for `logs-apache.access` dataset
      await synthtrace.index(
        getLogsForDataset({
          to,
          count: 10,
          dataset: apacheAccessDatasetName,
          namespace: datasetNamespace,
        })
      );

      await PageObjects.datasetQuality.navigateTo();

      // Get default namespaces
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const namespaceCol = cols.Namespace;
      const namespaceColCellTexts = await namespaceCol.getCellTexts();
      expect(namespaceColCellTexts).to.contain(defaultNamespace);

      // Filter for prod namespace
      await PageObjects.datasetQuality.filterForNamespaces([datasetNamespace]);

      const colsAfterFilter = await PageObjects.datasetQuality.parseDatasetTable();
      const namespaceColAfterFilter = colsAfterFilter.Namespace;
      const namespaceColCellTextsAfterFilter = await namespaceColAfterFilter.getCellTexts();

      expect(namespaceColCellTextsAfterFilter).to.eql([datasetNamespace]);
    });
  });
}
