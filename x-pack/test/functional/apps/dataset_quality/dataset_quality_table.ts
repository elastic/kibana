/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IndexTemplateName } from '@kbn/apm-synthtrace/src/lib/logs/custom_logsdb_index_templates';
import { DatasetQualityFtrProviderContext } from './config';
import {
  createFailedLogRecord,
  datasetNames,
  defaultNamespace,
  getInitialTestLogs,
  getLogsForDataset,
  processors,
  productionNamespace,
} from './data';

export default function ({ getService, getPageObjects }: DatasetQualityFtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
  ]);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const synthtrace = getService('logSynthtraceEsClient');
  const to = '2024-01-01T12:00:00.000Z';
  const apacheAccessDatasetName = 'apache.access';
  const apacheAccessDatasetHumanName = 'Apache access logs';
  const pkg = {
    name: 'apache',
    version: '1.14.0',
  };

  const failedDatasetName = datasetNames[1];

  describe('Dataset quality table', function () {
    // This disables the forward-compatibility test for Elasticsearch 8.19 with Kibana and ES 9.0.
    // These versions are not expected to work together. Note: Failure store is not available in ES 9.0,
    // and running these tests will result in an "unknown index privilege [read_failure_store]" error.
    this.onlyEsVersion('8.19 || >=9.1');

    before(async () => {
      // Install Integration and ingest logs for it
      await PageObjects.observabilityLogsExplorer.installPackage(pkg);

      await synthtrace.createCustomPipeline(processors, 'synth.2@pipeline');
      await synthtrace.createComponentTemplate({
        name: 'synth.2@custom',
        dataStreamOptions: {
          failure_store: {
            enabled: true,
          },
        },
      });
      await synthtrace.createIndexTemplate(IndexTemplateName.Synht2);

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
        createFailedLogRecord({
          to: new Date().toISOString(),
          count: 2,
          dataset: failedDatasetName,
        }),
        getLogsForDataset({
          to: new Date().toISOString(),
          count: 4,
          dataset: failedDatasetName,
        }),
      ]);
      await PageObjects.datasetQuality.navigateTo();
    });

    after(async () => {
      await synthtrace.clean();
      await PageObjects.observabilityLogsExplorer.uninstallPackage(pkg);
      await synthtrace.deleteIndexTemplate(IndexTemplateName.Synht2);
      await synthtrace.deleteComponentTemplate('synth.2@custom');
      await synthtrace.deleteCustomPipeline('synth.2@pipeline');
    });

    it('shows sort by dataset name and show namespace', async () => {
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols[PageObjects.datasetQuality.texts.datasetNameColumn];
      await datasetNameCol.sort('descending');
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();
      expect(datasetNameColCellTexts).to.eql(
        [apacheAccessDatasetHumanName, ...datasetNames].reverse()
      );

      const namespaceCol = cols.Namespace;
      const namespaceColCellTexts = await namespaceCol.getCellTexts();
      expect(namespaceColCellTexts).to.eql([
        defaultNamespace,
        defaultNamespace,
        defaultNamespace,
        productionNamespace,
      ]);

      // Cleaning the sort
      await datasetNameCol.sort('ascending');
    });

    it('shows the last activity', async () => {
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const lastActivityCol = cols[PageObjects.datasetQuality.texts.datasetLastActivityColumn];
      const activityCells = await lastActivityCol.getCellTexts();
      const degradedActivityCell = activityCells[activityCells.length - 1];
      const failedActivityCell = activityCells[activityCells.length - 2];
      const restActivityCells = activityCells.slice(0, -2);

      // The following lastActivity cells should have data
      expect(degradedActivityCell).to.not.eql(PageObjects.datasetQuality.texts.noActivityText);
      expect(failedActivityCell).to.not.eql(PageObjects.datasetQuality.texts.noActivityText);
      // The rest of the rows must show no activity
      expect(restActivityCells).to.eql([
        PageObjects.datasetQuality.texts.noActivityText,
        PageObjects.datasetQuality.texts.noActivityText,
      ]);
    });

    it('shows degraded docs percentage', async () => {
      const cols = await PageObjects.datasetQuality.parseDatasetTable();

      const degradedDocsCol = cols[PageObjects.datasetQuality.texts.datasetDegradedDocsColumn];
      const degradedDocsColCellTexts = await degradedDocsCol.getCellTexts();
      expect(degradedDocsColCellTexts).to.eql(['0%', '0%', '0%', '100%']);
    });

    it('shows the value in the size column', async () => {
      const cols = await PageObjects.datasetQuality.parseDatasetTable();

      const sizeColCellTexts = await cols.Size.getCellTexts();
      const sizeGreaterThanZero = sizeColCellTexts[3];
      const sizeEqualToZero = sizeColCellTexts[1];

      expect(sizeGreaterThanZero).to.not.eql('0.0 KB');
      expect(sizeEqualToZero).to.eql('0.0 B');
    });

    it('shows dataset from integration', async () => {
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols[PageObjects.datasetQuality.texts.datasetNameColumn];

      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();

      expect(datasetNameColCellTexts[0]).to.eql(apacheAccessDatasetHumanName);
    });

    it('goes to log explorer page when opened', async () => {
      const rowIndexToOpen = 1;
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols[PageObjects.datasetQuality.texts.datasetNameColumn];
      const actionsCol = cols.Actions;

      const datasetName = (await datasetNameCol.getCellTexts())[rowIndexToOpen];
      await (await actionsCol.getCellChildren('a'))[rowIndexToOpen].click(); // Click "Open"

      // Confirm dataset selector text in observability logs explorer
      await retry.try(async () => {
        const datasetSelectorText =
          await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButtonText();
        expect(datasetSelectorText).to.eql(datasetName);
      });

      // Return to Dataset Quality Page
      await PageObjects.datasetQuality.navigateTo();
    });

    it('hides inactive datasets', async () => {
      // Get number of rows with Last Activity not equal to "No activity in the selected timeframe"
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const lastActivityCol = cols[PageObjects.datasetQuality.texts.datasetLastActivityColumn];
      const lastActivityColCellTexts = await lastActivityCol.getCellTexts();
      const activeDatasets = lastActivityColCellTexts.filter(
        (activity: string) => activity !== PageObjects.datasetQuality.texts.noActivityText
      );

      await PageObjects.datasetQuality.toggleShowInactiveDatasets();
      const rows = await PageObjects.datasetQuality.getDatasetTableRows();
      expect(rows.length).to.eql(activeDatasets.length); // Return to Previous state
      await PageObjects.datasetQuality.toggleShowInactiveDatasets();
    });

    describe('Failed docs', () => {
      it('shows failed docs percentage', async () => {
        const cols = await PageObjects.datasetQuality.parseDatasetTable();

        const failedDocsCol = cols[PageObjects.datasetQuality.texts.datasetFailedDocsColumn];
        const failedDocsColCellTexts = await failedDocsCol.getCellTexts();
        expect(failedDocsColCellTexts).to.eql(['N/A', 'N/A', '20%', 'N/A']);
      });

      it('changes link text on hover when failure store is not enabled', async () => {
        const linkSelector = 'datasetQualitySetFailureStoreLink';
        const links = await testSubjects.findAll(linkSelector);
        expect(links.length).to.be.greaterThan(0);
        const link = links[links.length - 1];

        expect(await link.getVisibleText()).to.eql('N/A');

        await link.moveMouseTo();

        await retry.try(async () => {
          expect(await link.getVisibleText()).to.eql('Set failure store');
        });

        const table = await PageObjects.datasetQuality.getDatasetsTable();
        await table.moveMouseTo();
      });
    });
  });
}
