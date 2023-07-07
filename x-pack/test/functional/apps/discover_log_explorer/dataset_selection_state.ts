/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discoverLogExplorer']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'doc_table:legacy': false,
  };

  describe('DatasetSelection initialization and update', () => {
    before('initialize tests', async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.update(defaultSettings);
    });

    after('clean up archives', async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.unset('doc_table:legacy');
    });

    describe('when the "index" query param does not exist', () => {
      it('should initialize the "All log datasets" selection', async () => {
        await PageObjects.common.navigateToActualUrl('discover', 'p/log-explorer');
        const datasetSelectionTitle =
          await PageObjects.discoverLogExplorer.getDatasetSelectorButtonText();

        expect(datasetSelectionTitle).to.be('All log datasets');
      });
    });

    describe('when the "index" query param exist', () => {
      it('should decode and restore the selection from a valid encoded index', async () => {
        const azureActivitylogsIndex =
          'BQZwpgNmDGAuCWB7AdgLmAEwIay+W6yWAtmKgOQSIDmIAtFgF4CuATmAHRZzwBu8sAJ5VadAFTkANAlhRU3BPyEiQASklFS8lu0m8wrEEjTkAjBwCsHAEwBmcuvBQeKACqCADmSPJqUVUA==';
        await PageObjects.common.navigateToActualUrl(
          'discover',
          `p/log-explorer?_a=(index:${encodeURIComponent(azureActivitylogsIndex)})`
        );

        const datasetSelectionTitle =
          await PageObjects.discoverLogExplorer.getDatasetSelectorButtonText();

        expect(datasetSelectionTitle).to.be('[azure] activitylogs');
      });

      it('should fallback to "All log datasets" selection and notify the user for an invalid encoded index', async () => {
        const invalidEncodedIndex = 'invalid-encoded-index';
        await PageObjects.common.navigateToActualUrl(
          'discover',
          `p/log-explorer?_a=(index:${encodeURIComponent(invalidEncodedIndex)})`
        );

        const datasetSelectionTitle =
          await PageObjects.discoverLogExplorer.getDatasetSelectorButtonText();

        await PageObjects.discoverLogExplorer.assertRestoreFailureToastExist();
        expect(datasetSelectionTitle).to.be('All log datasets');
      });
    });

    describe('when navigating back and forth on the page history', () => {
      it('should decode and restore the selection for the current index', async () => {
        await PageObjects.common.navigateToActualUrl('discover', 'p/log-explorer');
        const allDatasetSelectionTitle =
          await PageObjects.discoverLogExplorer.getDatasetSelectorButtonText();
        expect(allDatasetSelectionTitle).to.be('All log datasets');

        const azureActivitylogsIndex =
          'BQZwpgNmDGAuCWB7AdgLmAEwIay+W6yWAtmKgOQSIDmIAtFgF4CuATmAHRZzwBu8sAJ5VadAFTkANAlhRU3BPyEiQASklFS8lu0m8wrEEjTkAjBwCsHAEwBmcuvBQeKACqCADmSPJqUVUA==';
        await PageObjects.common.navigateToActualUrl(
          'discover',
          `p/log-explorer?_a=(index:${encodeURIComponent(azureActivitylogsIndex)})`
        );
        const azureDatasetSelectionTitle =
          await PageObjects.discoverLogExplorer.getDatasetSelectorButtonText();
        expect(azureDatasetSelectionTitle).to.be('[azure] activitylogs');

        // Go back to previous page selection
        browser.goBack();
        const backNavigationDatasetSelectionTitle =
          await PageObjects.discoverLogExplorer.getDatasetSelectorButtonText();
        expect(backNavigationDatasetSelectionTitle).to.be('All log datasets');

        // Go forward to previous page selection
        browser.goForward();
        const forwardNavigationDatasetSelectionTitle =
          await PageObjects.discoverLogExplorer.getDatasetSelectorButtonText();
        expect(forwardNavigationDatasetSelectionTitle).to.be('[azure] activitylogs');
      });
    });
  });
}
