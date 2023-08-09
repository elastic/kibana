/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'discoverLogExplorer',
    'unifiedFieldList',
  ]);

  const defaultLogColumns = ['@timestamp', 'message'];

  describe('Columns selection initialization and update', () => {
    before(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.load(
        'x-pack/test/functional/es_archives/discover_log_explorer/data_streams'
      );
      await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/discover_log_explorer/data_streams'
      );
    });

    describe('when the log explorer profile loads', () => {
      it('should initialize the table columns to logs default selection', async () => {
        await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });

        await PageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();

        await retry.try(async () => {
          expect(await PageObjects.discover.getColumnHeaders()).to.eql(defaultLogColumns);
        });
      });

      it('should restore the table columns from the url state if exists', async () => {
        await PageObjects.common.navigateToApp('discover', {
          hash: '/p/log-explorer?_a=(columns:!(message,data_stream.namespace))',
        });

        await PageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();

        await retry.try(async () => {
          expect(await PageObjects.discover.getColumnHeaders()).to.eql([
            ...defaultLogColumns,
            'data_stream.namespace',
          ]);
        });
      });
    });

    describe('when switching dataset using the dataset selector', () => {
      it('should set the table columns to logs default selection', async () => {
        await PageObjects.common.navigateToApp('discover', {
          hash: '/p/log-explorer',
        });

        await PageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();

        await retry.try(async () => {
          expect(await PageObjects.discover.getColumnHeaders()).to.eql(defaultLogColumns);
        });

        // Remove message column, it shows Document since nothing is selected
        await PageObjects.unifiedFieldList.clickFieldListItemRemove('message');
        await retry.try(async () => {
          expect(await PageObjects.discover.getColumnHeaders()).to.eql(['@timestamp', 'Document']);
        });

        // Switch to other dataset and verify columns are restored
        await PageObjects.discoverLogExplorer.openDatasetSelector();
        const button = await PageObjects.discoverLogExplorer.getUnmanagedDatasetsButton();
        await button.click();

        await retry.try(async () => {
          const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();
          menuEntries[0].click();
        });

        await retry.try(async () => {
          expect(await PageObjects.discover.getColumnHeaders()).to.eql(defaultLogColumns);
        });
      });

      it('should keep the current table columns selection if exists', async () => {
        await PageObjects.common.navigateToApp('discover', {
          hash: '/p/log-explorer?_a=(columns:!(message,data_stream.namespace))',
        });

        await PageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();

        await retry.try(async () => {
          expect(await PageObjects.discover.getColumnHeaders()).to.eql([
            ...defaultLogColumns,
            'data_stream.namespace',
          ]);
        });

        await PageObjects.discoverLogExplorer.openDatasetSelector();
        const button = await PageObjects.discoverLogExplorer.getUnmanagedDatasetsButton();
        await button.click();

        await retry.try(async () => {
          const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();
          menuEntries[0].click();
        });

        await retry.try(async () => {
          expect(await PageObjects.discover.getColumnHeaders()).to.eql([
            ...defaultLogColumns,
            'data_stream.namespace',
          ]);
        });
      });
    });
  });
}
