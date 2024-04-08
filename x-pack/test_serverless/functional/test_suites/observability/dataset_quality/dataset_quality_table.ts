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
  const retry = getService('retry');
  const to = '2024-01-01T12:00:00.000Z';

  describe('Dataset quality table', () => {
    before(async () => {
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      await PageObjects.svlCommonPage.loginWithRole('admin');
      await PageObjects.datasetQuality.navigateTo();
    });

    after(async () => {
      await synthtrace.clean();
      await PageObjects.observabilityLogsExplorer.removeInstalledPackages();
    });

    it('shows the right number of rows in correct order', async () => {
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols['Dataset Name'];
      await datasetNameCol.sort('descending');
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();
      expect(datasetNameColCellTexts).to.eql([...datasetNames].reverse());

      const namespaceCol = cols.Namespace;
      const namespaceColCellTexts = await namespaceCol.getCellTexts();
      expect(namespaceColCellTexts).to.eql([defaultNamespace, defaultNamespace, defaultNamespace]);

      const degradedDocsCol = cols['Degraded Docs'];
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
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols['Dataset Name'];
      await datasetNameCol.sort('ascending');

      const degradedDocsCol = cols['Degraded Docs'];
      const degradedDocsColCellTexts = await degradedDocsCol.getCellTexts();
      expect(degradedDocsColCellTexts).to.eql(['0%', '0%', '0%']);

      // Index malformed document with current timestamp
      await synthtrace.index(
        getLogsForDataset({
          to: Date.now(),
          count: 1,
          dataset: datasetNames[2],
          isMalformed: true,
        })
      );

      // Set time range to Last 5 minute
      const filtersContainer = await testSubjects.find(
        PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFiltersContainer
      );
      await PageObjects.datasetQuality.setDatePickerLastXUnits(filtersContainer, 5, 'm');

      const updatedDegradedDocsColCellTexts = await degradedDocsCol.getCellTexts();
      expect(updatedDegradedDocsColCellTexts[2]).to.not.eql('0%');
    });

    it('shows the updated size of the index', async () => {
      const testDatasetIndex = 2;
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols['Dataset Name'];
      await datasetNameCol.sort('ascending');
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();

      const datasetToUpdateRowIndex = datasetNameColCellTexts.findIndex(
        (dName: string) => dName === datasetNames[testDatasetIndex]
      );

      const sizeColCellTexts = await cols.Size.getCellTexts();
      const beforeSize = sizeColCellTexts[datasetToUpdateRowIndex];

      // Index documents with current timestamp
      await synthtrace.index(
        getLogsForDataset({
          to: Date.now(),
          count: 4,
          dataset: datasetNames[testDatasetIndex],
          isMalformed: false,
        })
      );

      const colsAfterUpdate = await PageObjects.datasetQuality.parseDatasetTable();

      // Assert that size has changed
      await retry.tryForTime(15000, async () => {
        // Refresh the table
        await PageObjects.datasetQuality.refreshTable();
        const updatedSizeColCellTexts = await colsAfterUpdate.Size.getCellTexts();
        expect(updatedSizeColCellTexts[datasetToUpdateRowIndex]).to.not.eql(beforeSize);
      });
    });

    it('sorts by dataset name', async () => {
      // const header = await PageObjects.datasetQuality.getDatasetTableHeader('Dataset Name');
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      expect(Object.keys(cols).length).to.eql(7);

      const datasetNameCol = cols['Dataset Name'];

      // Sort ascending
      await datasetNameCol.sort('ascending');
      const cellTexts = await datasetNameCol.getCellTexts();

      const datasetNamesAsc = [...datasetNames].sort();

      expect(cellTexts).to.eql(datasetNamesAsc);
    });

    it('shows dataset from integration', async () => {
      const apacheAccessDatasetName = 'apache.access';
      const apacheAccessDatasetHumanName = 'Apache access logs';

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

      // Sort ascending
      await datasetNameCol.sort('ascending');
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();

      const datasetNamesAsc = [...datasetNames, apacheAccessDatasetHumanName].sort();

      // Assert there are 4 rows
      expect(datasetNameColCellTexts.length).to.eql(4);

      expect(datasetNameColCellTexts).to.eql(datasetNamesAsc);
    });

    it('goes to log explorer page when opened', async () => {
      const rowIndexToOpen = 1;
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols['Dataset Name'];
      const actionsCol = cols.Actions;

      const datasetName = (await datasetNameCol.getCellTexts())[rowIndexToOpen];
      await (await actionsCol.getCellChildren('a'))[rowIndexToOpen].click(); // Click "Open"

      // Confirm dataset selector text in observability logs explorer
      const datasetSelectorText =
        await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButtonText();
      expect(datasetSelectorText).to.eql(datasetName);
    });

    it('shows the last activity when in time range', async () => {
      await PageObjects.datasetQuality.navigateTo();
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const lastActivityCol = cols['Last Activity'];
      const datasetNameCol = cols['Dataset Name'];

      // Set time range to Last 1 minute
      const filtersContainer = await testSubjects.find(
        PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFiltersContainer
      );

      await PageObjects.datasetQuality.setDatePickerLastXUnits(filtersContainer, 1, 's');
      const lastActivityColCellTexts = await lastActivityCol.getCellTexts();
      expect(lastActivityColCellTexts).to.eql([
        PageObjects.datasetQuality.texts.noActivityText,
        PageObjects.datasetQuality.texts.noActivityText,
        PageObjects.datasetQuality.texts.noActivityText,
        PageObjects.datasetQuality.texts.noActivityText,
      ]);

      const datasetToUpdate = datasetNames[0];
      await synthtrace.index(
        getLogsForDataset({ to: new Date().toISOString(), count: 1, dataset: datasetToUpdate })
      );
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();
      const datasetToUpdateRowIndex = datasetNameColCellTexts.findIndex(
        (dName: string) => dName === datasetToUpdate
      );

      await PageObjects.datasetQuality.setDatePickerLastXUnits(filtersContainer, 1, 'h');

      await retry.tryForTime(5000, async () => {
        const updatedLastActivityColCellTexts = await lastActivityCol.getCellTexts();
        expect(updatedLastActivityColCellTexts[datasetToUpdateRowIndex]).to.not.eql(
          PageObjects.datasetQuality.texts.noActivityText
        );
      });
    });

    it('hides inactive datasets', async () => {
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
