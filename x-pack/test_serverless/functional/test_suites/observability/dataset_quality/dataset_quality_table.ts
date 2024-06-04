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
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
    'svlCommonNavigation',
    'svlCommonPage',
  ]);
  const synthtrace = getService('svlLogsSynthtraceClient');
  const testSubjects = getService('testSubjects');
  const to = '2024-01-01T12:00:00.000Z';

  describe('Dataset quality table', function () {
    this.tags(['failsOnMKI']); // Failing https://github.com/elastic/kibana/issues/183495

    before(async () => {
      await PageObjects.svlCommonPage.loginWithRole('admin');
      await PageObjects.datasetQuality.navigateTo();
    });

    afterEach(async () => {
      await synthtrace.clean();
    });

    it('shows the right number of rows in correct order', async () => {
      // Ingest Data and refresh the table
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      await PageObjects.datasetQuality.refreshTable();

      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols['Dataset Name'];
      await datasetNameCol.sort('descending');
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();
      expect(datasetNameColCellTexts).to.eql([...datasetNames].reverse());

      const namespaceCol = cols.Namespace;
      const namespaceColCellTexts = await namespaceCol.getCellTexts();
      expect(namespaceColCellTexts).to.eql([defaultNamespace, defaultNamespace, defaultNamespace]);

      const degradedDocsCol = cols['Degraded Docs (%)'];
      const degradedDocsColCellTexts = await degradedDocsCol.getCellTexts();
      expect(degradedDocsColCellTexts).to.eql(['0%', '0%', '0%']);

      const lastActivityCol = cols['Last Activity'];
      const lastActivityColCellTexts = await lastActivityCol.getCellTexts();
      expect(lastActivityColCellTexts).to.eql([
        PageObjects.datasetQuality.texts.noActivityText,
        PageObjects.datasetQuality.texts.noActivityText,
        PageObjects.datasetQuality.texts.noActivityText,
      ]);
    });

    it('shows degraded docs percentage', async () => {
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      await PageObjects.datasetQuality.refreshTable();
      const existingDegradedDocsPercentage = ['0%', '0%', '0%'];

      const cols = await PageObjects.datasetQuality.parseDatasetTable();

      const degradedDocsCol = cols['Degraded Docs (%)'];
      const degradedDocsColCellTexts = await degradedDocsCol.getCellTexts();
      expect(degradedDocsColCellTexts).to.eql(existingDegradedDocsPercentage);

      // Index malformed document with current timestamp
      await synthtrace.index(
        getLogsForDataset({
          to: new Date().toISOString(),
          count: 1,
          dataset: datasetNames[2],
          isMalformed: true,
        })
      );

      await PageObjects.datasetQuality.refreshTable();

      const updatedDegradedDocsColCellTexts = await degradedDocsCol.getCellTexts();
      expect(updatedDegradedDocsColCellTexts).to.not.eql(existingDegradedDocsPercentage);
    });

    it('shows dataset from integration', async () => {
      const apacheAccessDatasetName = 'apache.access';
      const apacheAccessDatasetHumanName = 'Apache access logs';
      const pkg = {
        name: 'apache',
        version: '1.14.0',
      };

      // Install Apache package
      await PageObjects.observabilityLogsExplorer.installPackage(pkg);

      // Index 10 logs for `logs-apache.access` dataset
      await synthtrace.index(
        getLogsForDataset({ to, count: 10, dataset: apacheAccessDatasetName })
      );

      // Navigation to Logs Explorer is required to setup the human name for Dataset
      await PageObjects.observabilityLogsExplorer.navigateTo();
      await PageObjects.datasetQuality.navigateTo();

      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols['Dataset Name'];

      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();

      const datasetNamesAsc = [...datasetNames, apacheAccessDatasetHumanName].sort();

      // Assert there is 1 row for Apache access logs dataset
      expect(datasetNameColCellTexts.length).to.eql(1);

      expect(datasetNameColCellTexts[0]).to.eql(apacheAccessDatasetHumanName);

      await PageObjects.observabilityLogsExplorer.uninstallPackage(pkg);
    });

    it('goes to log explorer page when opened', async () => {
      await synthtrace.index(getLogsForDataset({ to, count: 10, dataset: datasetNames[0] }));
      await PageObjects.datasetQuality.refreshTable();
      const rowIndexToOpen = 0;
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols['Dataset Name'];
      const actionsCol = cols.Actions;

      const datasetName = (await datasetNameCol.getCellTexts())[rowIndexToOpen];
      await (await actionsCol.getCellChildren('a'))[rowIndexToOpen].click(); // Click "Open"

      // Confirm dataset selector text in observability logs explorer
      const datasetSelectorText =
        await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButtonText();
      expect(datasetSelectorText).to.eql(datasetName);
      await PageObjects.datasetQuality.navigateTo();
    });

    it('shows the last activity when in time range', async () => {
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      await PageObjects.datasetQuality.refreshTable();

      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const lastActivityCol = cols['Last Activity'];
      const datasetNameCol = cols['Dataset Name'];

      // Set time range to Last 1 minute
      const filtersContainer = await testSubjects.find(
        PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFiltersContainer
      );

      await PageObjects.datasetQuality.setDatePickerLastXUnits(filtersContainer, 1, 'h');
      const lastActivityColCellTexts = await lastActivityCol.getCellTexts();
      expect(lastActivityColCellTexts).to.eql([
        PageObjects.datasetQuality.texts.noActivityText,
        PageObjects.datasetQuality.texts.noActivityText,
        PageObjects.datasetQuality.texts.noActivityText,
      ]);

      const datasetToUpdate = datasetNames[0];
      await synthtrace.index(
        getLogsForDataset({ to: new Date().toISOString(), count: 1, dataset: datasetToUpdate })
      );

      await PageObjects.datasetQuality.refreshTable();

      const updatedLastActivityColCellTexts = await lastActivityCol.getCellTexts();
      expect(updatedLastActivityColCellTexts[0]).to.not.eql(
        PageObjects.datasetQuality.texts.noActivityText
      );
    });

    it('hides inactive datasets', async () => {
      // Load inactive Datasets
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      // Make 1 dataset active
      await synthtrace.index(
        getLogsForDataset({ to: new Date().toISOString(), count: 1, dataset: datasetNames[0] })
      );
      await PageObjects.datasetQuality.refreshTable();

      // Get number of rows with Last Activity not equal to "No activity in the selected timeframe"
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const lastActivityCol = cols['Last Activity'];
      const lastActivityColCellTexts = await lastActivityCol.getCellTexts();
      const activeDatasets = lastActivityColCellTexts.filter(
        (activity) => activity !== PageObjects.datasetQuality.texts.noActivityText
      );

      await PageObjects.datasetQuality.toggleShowInactiveDatasets();
      const rows = await PageObjects.datasetQuality.getDatasetTableRows();
      expect(rows.length).to.eql(activeDatasets.length);
    });
  });
}
