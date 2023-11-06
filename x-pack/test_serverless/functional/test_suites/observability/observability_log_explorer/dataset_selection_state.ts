/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import rison from '@kbn/rison';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const retry = getService('retry');
  const PageObjects = getPageObjects([
    'common',
    'observabilityLogExplorer',
    'svlCommonPage',
    'header',
  ]);

  describe('DatasetSelection initialization and update', () => {
    before(async () => {
      await PageObjects.svlCommonPage.login();
    });

    after(async () => {
      await PageObjects.svlCommonPage.forceLogout();
    });

    describe('when the "index" query param does not exist', () => {
      it('should initialize the "All logs" selection', async () => {
        await PageObjects.observabilityLogExplorer.navigateTo();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const datasetSelectionTitle =
          await PageObjects.observabilityLogExplorer.getDatasetSelectorButtonText();

        expect(datasetSelectionTitle).to.be('All logs');
      });
    });

    describe('when the "index" query param exists', () => {
      it('should decode and restore the selection from a valid encoded index', async () => {
        const azureActivitylogsIndex =
          'BQZwpgNmDGAuCWB7AdgLmAEwIay+W6yWAtmKgOQSIDmIAtFgF4CuATmAHRZzwBu8sAJ5VadAFTkANAlhRU3BPyEiQASklFS8lu2kC55AII6wAAgAyNEFN5hWIJGnIBGDgFYOAJgDM5deCgeFAAVQQAHMgdkaihVIA===';
        await PageObjects.observabilityLogExplorer.navigateTo({
          search: {
            _a: rison.encode({ index: azureActivitylogsIndex }),
          },
        });
        await PageObjects.header.waitUntilLoadingHasFinished();

        const datasetSelectionTitle =
          await PageObjects.observabilityLogExplorer.getDatasetSelectorButtonText();

        expect(datasetSelectionTitle).to.be('[Azure Logs] activitylogs');
      });

      it('should fallback to the "All logs" selection and notify the user of an invalid encoded index', async () => {
        const invalidEncodedIndex = 'invalid-encoded-index';
        await PageObjects.observabilityLogExplorer.navigateTo({
          search: {
            _a: rison.encode({ index: invalidEncodedIndex }),
          },
        });
        await PageObjects.header.waitUntilLoadingHasFinished();

        const datasetSelectionTitle =
          await PageObjects.observabilityLogExplorer.getDatasetSelectorButtonText();

        await PageObjects.observabilityLogExplorer.assertRestoreFailureToastExist();
        expect(datasetSelectionTitle).to.be('All logs');
      });
    });

    describe('when navigating back and forth on the page history', () => {
      it('should decode and restore the selection for the current index', async () => {
        await PageObjects.observabilityLogExplorer.navigateTo();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const allDatasetSelectionTitle =
          await PageObjects.observabilityLogExplorer.getDatasetSelectorButtonText();
        expect(allDatasetSelectionTitle).to.be('All logs');

        const azureActivitylogsIndex =
          'BQZwpgNmDGAuCWB7AdgLmAEwIay+W6yWAtmKgOQSIDmIAtFgF4CuATmAHRZzwBu8sAJ5VadAFTkANAlhRU3BPyEiQASklFS8lu2kC55AII6wAAgAyNEFN5hWIJGnIBGDgFYOAJgDM5deCgeFAAVQQAHMgdkaihVIA===';
        await PageObjects.observabilityLogExplorer.navigateTo({
          search: {
            _a: rison.encode({ index: azureActivitylogsIndex }),
            controlPanels: rison.encode({}),
          },
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        const azureDatasetSelectionTitle =
          await PageObjects.observabilityLogExplorer.getDatasetSelectorButtonText();
        expect(azureDatasetSelectionTitle).to.be('[Azure Logs] activitylogs');

        // Go back to previous page selection
        await retry.try(async () => {
          await browser.goBack();
          await PageObjects.header.waitUntilLoadingHasFinished();
          const backNavigationDatasetSelectionTitle =
            await PageObjects.observabilityLogExplorer.getDatasetSelectorButtonText();
          expect(backNavigationDatasetSelectionTitle).to.be('All logs');
        });

        // Go forward to previous page selection
        await retry.try(async () => {
          await browser.goForward();
          await PageObjects.header.waitUntilLoadingHasFinished();
          const forwardNavigationDatasetSelectionTitle =
            await PageObjects.observabilityLogExplorer.getDatasetSelectorButtonText();
          expect(forwardNavigationDatasetSelectionTitle).to.be('[Azure Logs] activitylogs');
        });
      });
    });
  });
}
