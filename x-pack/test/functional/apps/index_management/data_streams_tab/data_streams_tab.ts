/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'indexManagement', 'header']);
  const toasts = getService('toasts');
  const log = getService('log');
  const browser = getService('browser');
  const es = getService('es');
  const security = getService('security');
  const testSubjects = getService('testSubjects');

  const TEST_DS_NAME_1 = 'test-ds-1';
  const TEST_DS_NAME_2 = 'test-ds-2';
  const TEST_DATA_STREAM_NAMES = [TEST_DS_NAME_1, TEST_DS_NAME_2];

  describe('Data streams tab', function () {
    before(async () => {
      await log.debug('Creating required data stream');
      try {
        for (const dataStreamName of TEST_DATA_STREAM_NAMES) {
          await es.indices.putIndexTemplate({
            name: `${dataStreamName}_index_template`,
            index_patterns: [dataStreamName],
            data_stream: {},
            _meta: {
              description: `Template for ${dataStreamName} testing index`,
            },
            template: {
              settings: { mode: undefined },
              mappings: {
                properties: {
                  '@timestamp': {
                    type: 'date',
                  },
                },
              },
              lifecycle: {
                // @ts-expect-error @elastic/elasticsearch enabled prop is not typed yet
                enabled: true,
              },
            },
          });

          await es.indices.createDataStream({
            name: dataStreamName,
          });
        }
      } catch (e) {
        log.debug('[Setup error] Error creating test data stream');
        throw e;
      }

      await log.debug('Navigating to the data streams tab');
      await security.testUser.setRoles(['index_management_user']);
      await pageObjects.common.navigateToApp('indexManagement');
      // Navigate to the data streams tab
      await pageObjects.indexManagement.changeTabs('data_streamsTab');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await log.debug('Cleaning up created data stream');

      try {
        for (const dataStreamName of TEST_DATA_STREAM_NAMES) {
          await es.indices.deleteDataStream({ name: dataStreamName });
          await es.indices.deleteIndexTemplate({
            name: `${dataStreamName}_index_template`,
          });
        }
      } catch (e) {
        log.debug('[Teardown error] Error deleting test data stream');
        throw e;
      }
    });

    it('shows the details flyout when clicking on a data stream', async () => {
      // Open details flyout
      await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
      // Verify url is stateful
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/data_streams/${TEST_DS_NAME_1}`);
      // Assert that flyout is opened
      expect(await testSubjects.exists('dataStreamDetailPanel')).to.be(true);
      // Close flyout
      await testSubjects.click('closeDetailsButton');
    });

    describe('shows the correct index mode in the details flyout', function () {
      it('standard index mode', async () => {
        // Open details flyout of existing data stream - it has standard index mode
        await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
        // Check that index mode detail exists and its label is "Standard"
        expect(await testSubjects.exists('indexModeDetail')).to.be(true);
        expect(await testSubjects.getVisibleText('indexModeDetail')).to.be('Standard');
        // Close flyout
        await testSubjects.click('closeDetailsButton');
      });

      it('logsdb index mode', async () => {
        // Create an index template with a logsdb index mode
        await es.indices.putIndexTemplate({
          name: `logsdb_index_template`,
          index_patterns: ['test-logsdb'],
          data_stream: {},
          template: {
            settings: { mode: 'logsdb' },
          },
        });
        // Create a data stream matching the index pattern of the index template above
        await es.indices.createDataStream({
          name: 'test-logsdb',
        });
        await browser.refresh();
        // Open details flyout of data stream
        await pageObjects.indexManagement.clickDataStreamNameLink('test-logsdb');
        // Check that index mode detail exists and its label is "LogsDB"
        expect(await testSubjects.exists('indexModeDetail')).to.be(true);
        expect(await testSubjects.getVisibleText('indexModeDetail')).to.be('LogsDB');
        // Close flyout
        await testSubjects.click('closeDetailsButton');
        // Delete data stream and index template
        await es.indices.deleteDataStream({ name: 'test-logsdb' });
        await es.indices.deleteIndexTemplate({
          name: `logsdb_index_template`,
        });
      });
    });

    describe('data retention modal', function () {
      describe('from details panel', function () {
        it('allows to update data retention', async () => {
          // Open details flyout
          await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
          // Open the edit retention dialog
          await testSubjects.click('manageDataStreamButton');
          await testSubjects.click('editDataRetentionButton');

          // Disable infinite retention
          await testSubjects.click('infiniteRetentionPeriod > input');
          // Set the retention to 7 hours
          await testSubjects.setValue('dataRetentionValue', '7');
          await testSubjects.click('show-filters-button');
          await testSubjects.click('filter-option-h');

          // Submit the form
          await testSubjects.click('saveButton');

          // Expect to see a success toast
          const successToast = await toasts.getElementByIndex(1);
          expect(await successToast.getVisibleText()).to.contain('Data retention updated');
          // Clear up toasts for next test
          await toasts.dismissAll();
        });

        it('allows to disable data retention', async () => {
          // Open details flyout
          await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
          // Open the edit retention dialog
          await testSubjects.click('manageDataStreamButton');
          await testSubjects.click('editDataRetentionButton');

          // Disable infinite retention
          await testSubjects.click('dataRetentionEnabledField > input');

          // Submit the form
          await testSubjects.click('saveButton');

          // Expect to see a success toast
          const successToast = await toasts.getElementByIndex(1);
          expect(await successToast.getVisibleText()).to.contain('Data retention disabled');
          // Clear up toasts for next test
          await toasts.dismissAll();
        });
      });

      describe('bulk edit modal', function () {
        it('allows to update data retention', async () => {
          // Select and manage mutliple data streams
          await pageObjects.indexManagement.clickBulkEditDataRetention(TEST_DATA_STREAM_NAMES);

          // Set the retention to 7 hours
          await testSubjects.setValue('dataRetentionValue', '7');
          await testSubjects.click('show-filters-button');
          await testSubjects.click('filter-option-h');

          // Submit the form
          await testSubjects.click('saveButton');

          // Expect to see a success toast
          const successToast = await toasts.getElementByIndex(1);
          expect(await successToast.getVisibleText()).to.contain(
            'Data retention has been updated for 2 data streams.'
          );
          // Clear up toasts for next test
          await toasts.dismissAll();
        });

        it('allows to disable data retention', async () => {
          // Select and manage mutliple data streams
          await pageObjects.indexManagement.clickBulkEditDataRetention(TEST_DATA_STREAM_NAMES);

          // Disable infinite retention
          await testSubjects.click('dataRetentionEnabledField > input');

          // Submit the form
          await testSubjects.click('saveButton');

          // Expect to see a success toast
          const successToast = await toasts.getElementByIndex(1);
          expect(await successToast.getVisibleText()).to.contain(
            'Data retention has been updated for 2 data streams.'
          );
          // Clear up toasts for next test
          await toasts.dismissAll();
        });
      });
    });
  });
};
