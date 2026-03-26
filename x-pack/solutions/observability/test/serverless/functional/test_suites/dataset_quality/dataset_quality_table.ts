/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import originalExpect from 'expect';
import { IndexTemplateName } from '@kbn/synthtrace/src/lib/logs/custom_logsdb_index_templates';
import type { FtrProviderContext } from '../../ftr_provider_context';
import {
  datasetNames,
  defaultNamespace,
  getInitialTestLogs,
  getLogsForDataset,
  productionNamespace,
  processors,
} from './data';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
    'svlCommonNavigation',
    'svlCommonPage',
  ]);
  const retry = getService('retry');
  const synthtrace = getService('svlLogsSynthtraceClient');
  const to = '2024-01-01T12:00:00.000Z';
  const apacheAccessDatasetName = 'apache.access';
  const apacheAccessDatasetHumanName = 'Apache access logs';
  const pkg = {
    name: 'apache',
    version: '1.14.0',
  };
  const testSubjects = getService('testSubjects');

  describe('Dataset quality table', function () {
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
      await PageObjects.svlCommonPage.loginAsAdmin();
      await PageObjects.datasetQuality.navigateTo();
      await PageObjects.datasetQuality.waitUntilTableLoaded();
    });

    after(async () => {
      await synthtrace.clean();
      await PageObjects.observabilityLogsExplorer.uninstallPackage(pkg);
    });

    it('shows sort by dataset name and show namespace', async () => {
      const cols = await PageObjects.datasetQuality.parseDatasetTable();
      const datasetNameCol = cols[PageObjects.datasetQuality.texts.datasetNameColumn];
      await datasetNameCol.sort('descending');
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();

      // This is to accomodate for failure if the integration hasn't been loaded successfully
      // Dataset name is shown in this case
      expect([apacheAccessDatasetHumanName, apacheAccessDatasetName]).to.contain(
        datasetNameColCellTexts[datasetNameColCellTexts.length - 1]
      );

      // Check the rest of the array matches the expected pattern
      expect(datasetNameColCellTexts.slice(0, -1)).to.eql([...datasetNames].reverse());

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
      const lastActivityCell = activityCells[activityCells.length - 1];
      const restActivityCells = activityCells.slice(0, -1);

      // The first cell of lastActivity should have data
      expect(lastActivityCell).to.not.eql(PageObjects.datasetQuality.texts.noActivityText);
      // The rest of the rows must show no activity
      expect(restActivityCells).to.eql([
        PageObjects.datasetQuality.texts.noActivityText,
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
      const sizeEqualToZero = sizeColCellTexts[2];

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
        const datasetSelectorText = await PageObjects.discover.getCurrentDataViewId();
        originalExpect(datasetSelectorText).toMatch(datasetName);
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
        (activity) => activity !== PageObjects.datasetQuality.texts.noActivityText
      );

      await PageObjects.datasetQuality.toggleShowInactiveDatasets();
      const rows = await PageObjects.datasetQuality.getDatasetTableRows();
      expect(rows.length).to.eql(activeDatasets.length);
    });

    describe('Failed docs', () => {
      before(async () => {
        await synthtrace.createCustomPipeline(processors, 'synth.no-fs@pipeline');
        await synthtrace.createComponentTemplate({
          name: 'synth.no-fs@custom',
          dataStreamOptions: {
            failure_store: {
              enabled: false,
            },
          },
        });
        await synthtrace.createIndexTemplate(IndexTemplateName.NoFailureStore);

        await synthtrace.index([getLogsForDataset({ to, count: 5, dataset: 'synth.no-fs' })]);

        await PageObjects.datasetQuality.navigateTo();
        await PageObjects.datasetQuality.waitUntilTableLoaded();
      });

      after(async () => {
        await synthtrace.clean();
        await synthtrace.deleteIndexTemplate(IndexTemplateName.NoFailureStore);
        await synthtrace.deleteComponentTemplate('synth.no-fs@custom');
        await synthtrace.deleteCustomPipeline('synth.no-fs@pipeline');
      });
      it('changes link text on hover when failure store is not enabled', async () => {
        const targetDataStreamName = 'logs-synth.no-fs-default';
        const targetLink = `${PageObjects.datasetQuality.testSubjectSelectors.enableFailureStoreFromTableButton}-${targetDataStreamName}`;

        await testSubjects.existOrFail(targetLink);
        const link = await testSubjects.find(targetLink);

        expect(await link.getVisibleText()).to.eql('N/A');

        await link.moveMouseTo();

        await retry.try(async () => {
          expect(await link.getVisibleText()).to.eql('Set failure store');
        });

        const table = await PageObjects.datasetQuality.getDatasetsTable();
        await table.moveMouseTo();
      });

      it('enables failure store through modal and removes link from table', async () => {
        const {
          editFailureStoreModal,
          failureStoreModalSaveButton,
          enableFailureStoreToggle,
          enableFailureStoreFromTableButton,
        } = PageObjects.datasetQuality.testSubjectSelectors;

        const targetDataStreamName = 'logs-synth.no-fs-default';

        const targetLink = `${enableFailureStoreFromTableButton}-${targetDataStreamName}`;
        await testSubjects.existOrFail(targetLink);
        await testSubjects.click(targetLink);

        await testSubjects.existOrFail(editFailureStoreModal);

        await testSubjects.click(enableFailureStoreToggle);
        await testSubjects.clickWhenNotDisabled(failureStoreModalSaveButton);
        await testSubjects.missingOrFail(editFailureStoreModal);

        await testSubjects.missingOrFail(targetLink);
      });
    });
  });
}
