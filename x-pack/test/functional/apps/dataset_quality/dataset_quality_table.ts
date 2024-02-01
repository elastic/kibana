/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DatasetQualityFtrProviderContext } from './config';
import { datasetNames, defaultNamespace, getInitialTestLogs, getLogsForDataset } from './data';

export default function ({ getService, getPageObjects }: DatasetQualityFtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
  ]);
  const synthtrace = getService('logSynthtraceEsClient');
  const to = '2024-01-01T12:00:00.000Z';

  describe('Dataset quality table', () => {
    before(async () => {
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      await PageObjects.observabilityLogsExplorer.navigateToDatasetQuality();
    });

    after(async () => {
      await synthtrace.clean();
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
      const lastAcivityColCellTexts = await lastActivityCol.getCellTexts();
      expect(lastAcivityColCellTexts).to.eql([
        'Jan 1, 2024 @ 11:59:00.000',
        'Jan 1, 2024 @ 11:59:00.000',
        'Jan 1, 2024 @ 11:59:00.000',
      ]);
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

      await PageObjects.observabilityLogsExplorer.navigateToDatasetQuality();

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
        await PageObjects.observabilityLogsExplorer.getDatasetSelectorButtonText();
      expect(datasetSelectorText).to.eql(datasetName);
    });
  });
}
