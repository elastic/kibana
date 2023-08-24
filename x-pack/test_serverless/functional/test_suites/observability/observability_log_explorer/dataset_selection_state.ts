/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'observabilityLogExplorer']);

  describe('DatasetSelection initialization and update', () => {
    describe('when the "index" query param does not exist', () => {
      it('should initialize the "All log datasets" selection', async () => {
        await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });
        const datasetSelectionTitle =
          await PageObjects.observabilityLogExplorer.getDatasetSelectorButtonText();

        expect(datasetSelectionTitle).to.be('All log datasets');
      });
    });

    describe('when the "index" query param exist', () => {
      it('should decode and restore the selection from a valid encoded index', async () => {
        const azureActivitylogsIndex =
          'BQZwpgNmDGAuCWB7AdgLmAEwIay+W6yWAtmKgOQSIDmIAtFgF4CuATmAHRZzwBu8sAJ5VadAFTkANAlhRU3BPyEiQASklFS8lu2kC55AII6wAAgAyNEFN5hWIJGnIBGDgFYOAJgDM5deCgeFAAVQQAHMgdkaihVIA===';
        await PageObjects.common.navigateToApp('discover', {
          hash: `/p/log-explorer?_a=(index:${encodeURIComponent(azureActivitylogsIndex)})`,
        });

        const datasetSelectionTitle =
          await PageObjects.observabilityLogExplorer.getDatasetSelectorButtonText();

        expect(datasetSelectionTitle).to.be('[Azure Logs] activitylogs');
      });

      it('should fallback to "All log datasets" selection and notify the user for an invalid encoded index', async () => {
        const invalidEncodedIndex = 'invalid-encoded-index';
        await PageObjects.common.navigateToApp('discover', {
          hash: `/p/log-explorer?_a=(index:${encodeURIComponent(invalidEncodedIndex)})`,
        });

        const datasetSelectionTitle =
          await PageObjects.observabilityLogExplorer.getDatasetSelectorButtonText();

        await PageObjects.observabilityLogExplorer.assertRestoreFailureToastExist();
        expect(datasetSelectionTitle).to.be('All log datasets');
      });
    });

    describe('when navigating back and forth on the page history', () => {
      it('should decode and restore the selection for the current index', async () => {
        await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });
        const allDatasetSelectionTitle =
          await PageObjects.observabilityLogExplorer.getDatasetSelectorButtonText();
        expect(allDatasetSelectionTitle).to.be('All log datasets');

        const azureActivitylogsIndex =
          'BQZwpgNmDGAuCWB7AdgLmAEwIay+W6yWAtmKgOQSIDmIAtFgF4CuATmAHRZzwBu8sAJ5VadAFTkANAlhRU3BPyEiQASklFS8lu2kC55AII6wAAgAyNEFN5hWIJGnIBGDgFYOAJgDM5deCgeFAAVQQAHMgdkaihVIA===';
        await PageObjects.common.navigateToApp('discover', {
          hash: `/p/log-explorer?_a=(index:${encodeURIComponent(
            azureActivitylogsIndex
          )})&controlPanels=()`,
        });
        const azureDatasetSelectionTitle =
          await PageObjects.observabilityLogExplorer.getDatasetSelectorButtonText();
        expect(azureDatasetSelectionTitle).to.be('[Azure Logs] activitylogs');

        // Go back to previous page selection
        await retry.try(async () => {
          await browser.goBack();
          const backNavigationDatasetSelectionTitle =
            await PageObjects.observabilityLogExplorer.getDatasetSelectorButtonText();
          expect(backNavigationDatasetSelectionTitle).to.be('All log datasets');
        });

        // Go forward to previous page selection
        await retry.try(async () => {
          await browser.goForward();
          const forwardNavigationDatasetSelectionTitle =
            await PageObjects.observabilityLogExplorer.getDatasetSelectorButtonText();
          expect(forwardNavigationDatasetSelectionTitle).to.be('[Azure Logs] activitylogs');
        });
      });
    });
  });
}
