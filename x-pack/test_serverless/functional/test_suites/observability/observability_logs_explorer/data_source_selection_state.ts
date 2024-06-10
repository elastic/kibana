/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { decodeOrThrow, indexPatternRt } from '@kbn/io-ts-utils';
import { DataSourceSelectionPlain } from '@kbn/logs-explorer-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';

const azureActivityDatasetSelection: DataSourceSelectionPlain = {
  selection: {
    dataset: {
      name: decodeOrThrow(indexPatternRt)('logs-azure.activitylogs-*'),
      title: 'activitylogs',
    },
    name: 'azure',
    title: 'Azure Logs',
    version: '1.5.23',
  },
  selectionType: 'single',
};

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const retry = getService('retry');
  const PageObjects = getPageObjects([
    'common',
    'observabilityLogsExplorer',
    'svlCommonPage',
    'header',
  ]);

  describe('dataSourceSelection initialization and update', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginWithRole('viewer');
    });

    after(async () => {
      await PageObjects.svlCommonPage.forceLogout();
    });

    describe('when no dataSourceSelection is given', () => {
      it('should initialize the "All logs" selection', async () => {
        await PageObjects.observabilityLogsExplorer.navigateTo();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const dataSourceSelectionTitle =
          await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButtonText();

        expect(dataSourceSelectionTitle).to.be('All logs');
      });
    });

    describe('when a dataSourceSelection is given', () => {
      it('should decode and restore the selection from a valid parameter', async () => {
        await PageObjects.observabilityLogsExplorer.navigateTo({
          pageState: {
            dataSourceSelection: azureActivityDatasetSelection,
          },
        });
        await PageObjects.header.waitUntilLoadingHasFinished();

        const dataSourceSelectionTitle =
          await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButtonText();

        expect(dataSourceSelectionTitle).to.be('[Azure Logs] activitylogs');
      });

      it('should fallback to the "All logs" selection and notify the user of an invalid parameter', async () => {
        await PageObjects.observabilityLogsExplorer.navigateToWithUncheckedState({
          pageState: {
            v: 2,
            dataSourceSelection: {
              selectionType: 'invalid',
            },
          },
        });
        await PageObjects.header.waitUntilLoadingHasFinished();

        const dataSourceSelectionTitle =
          await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButtonText();

        await PageObjects.observabilityLogsExplorer.assertRestoreFailureToastExist();
        expect(dataSourceSelectionTitle).to.be('All logs');
      });
    });

    describe('when navigating back and forth on the page history', () => {
      it('should decode and restore the selection for the current index', async () => {
        await PageObjects.observabilityLogsExplorer.navigateTo();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const allDatasetSelectionTitle =
          await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButtonText();
        expect(allDatasetSelectionTitle).to.be('All logs');

        await PageObjects.observabilityLogsExplorer.navigateTo({
          pageState: {
            dataSourceSelection: azureActivityDatasetSelection,
          },
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        const azureDatasetSelectionTitle =
          await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButtonText();
        expect(azureDatasetSelectionTitle).to.be('[Azure Logs] activitylogs');

        // Go back to previous page selection
        await retry.try(async () => {
          await browser.goBack();
          await PageObjects.header.waitUntilLoadingHasFinished();
          const backNavigationDatasetSelectionTitle =
            await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButtonText();
          expect(backNavigationDatasetSelectionTitle).to.be('All logs');
        });

        // Go forward to previous page selection
        await retry.try(async () => {
          await browser.goForward();
          await PageObjects.header.waitUntilLoadingHasFinished();
          const forwardNavigationDatasetSelectionTitle =
            await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButtonText();
          expect(forwardNavigationDatasetSelectionTitle).to.be('[Azure Logs] activitylogs');
        });
      });
    });
  });
}
