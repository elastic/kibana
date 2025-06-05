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

  enum INDEX_MODE {
    STANDARD = 'Standard',
    LOGSDB = 'LogsDB',
    TIME_SERIES = 'Time series',
  }

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
        await testSubjects.click('reloadButton');
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

    describe('Modify data streams index mode', () => {
      const TEST_DS_NAME = 'test-ds';
      const setIndexModeTemplate = async (settings: object) => {
        await es.indices.putIndexTemplate({
          name: `index_template_${TEST_DS_NAME}`,
          index_patterns: [TEST_DS_NAME],
          data_stream: {},
          template: {
            settings,
          },
        });
        await es.indices.createDataStream({
          name: TEST_DS_NAME,
        });
        await testSubjects.click('reloadButton');
      };

      const verifyIndexModeIsOrigin = async (indexModeName: string) => {
        // Open details flyout of data stream
        await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME);
        // Check that index mode detail exists and its label is origin
        expect(await testSubjects.exists('indexModeDetail')).to.be(true);
        expect(await testSubjects.getVisibleText('indexModeDetail')).to.be(indexModeName);
        // Close flyout
        await testSubjects.click('closeDetailsButton');
        // Navigate to the templates tab
        await pageObjects.indexManagement.changeTabs('templatesTab');
        await pageObjects.header.waitUntilLoadingHasFinished();
        // Edit template
        await pageObjects.indexManagement.clickIndexTemplateNameLink(
          `index_template_${TEST_DS_NAME}`
        );
        await testSubjects.click('manageTemplateButton');
        await testSubjects.click('editIndexTemplateButton');

        // Verify index mode is origin
        expect(await testSubjects.getVisibleText('indexModeField')).to.be(indexModeName);
      };

      const changeIndexMode = async (indexModeSelector: string) => {
        // Modify index mode
        await testSubjects.click('indexModeField');
        await testSubjects.click(indexModeSelector);
      };

      const verifyModeHasBeenChanged = async (indexModeName: string) => {
        expect(await testSubjects.getVisibleText('indexModeValue')).to.be(indexModeName);

        // Click update template
        await pageObjects.indexManagement.clickNextButton();
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify index mode and close detail tab
        expect(await testSubjects.getVisibleText('indexModeValue')).to.be(indexModeName);
        await testSubjects.click('closeDetailsButton');

        // Perform rollover so that index mode of data stream is updated
        await es.indices.rollover({
          alias: TEST_DS_NAME,
        });

        // Navigate to the data streams tab
        await pageObjects.indexManagement.changeTabs('data_streamsTab');
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Open data stream
        await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME);
        // Check that index mode detail exists and its label is destination index mode
        expect(await testSubjects.exists('indexModeDetail')).to.be(true);
        expect(await testSubjects.getVisibleText('indexModeDetail')).to.be(indexModeName);
        // Close flyout
        await testSubjects.click('closeDetailsButton');
      };

      afterEach(async () => {
        await log.debug('Cleaning up created data stream');

        try {
          await es.indices.deleteDataStream({ name: TEST_DS_NAME });
          await es.indices.deleteIndexTemplate({
            name: `index_template_${TEST_DS_NAME}`,
          });
        } catch (e) {
          log.debug('Error deleting test data stream');
          throw e;
        }
      });

      it('allows to upgrade data stream from standard to logsdb index mode', async () => {
        await setIndexModeTemplate({
          mode: 'standard',
        });
        await verifyIndexModeIsOrigin(INDEX_MODE.STANDARD);

        await changeIndexMode('index_mode_logsdb');
        // Navigate to the last step of the wizard
        await testSubjects.click('formWizardStep-5');
        await pageObjects.header.waitUntilLoadingHasFinished();

        await verifyModeHasBeenChanged(INDEX_MODE.LOGSDB);
      });

      it('allows to downgrade data stream from logsdb to standard index mode', async () => {
        await setIndexModeTemplate({
          mode: 'logsdb',
        });
        await verifyIndexModeIsOrigin(INDEX_MODE.LOGSDB);

        await changeIndexMode('index_mode_standard');
        // Navigate to the last step of the wizard
        await testSubjects.click('formWizardStep-5');
        await pageObjects.header.waitUntilLoadingHasFinished();

        await verifyModeHasBeenChanged(INDEX_MODE.STANDARD);
      });

      // Fails because of https://github.com/elastic/elasticsearch/issues/126473
      it.skip('allows to upgrade data stream from time series to logsdb index mode', async () => {
        await setIndexModeTemplate({
          mode: 'time_series',
          routing_path: 'test',
        });
        await verifyIndexModeIsOrigin(INDEX_MODE.TIME_SERIES);

        await changeIndexMode('index_mode_logsdb');

        await testSubjects.click('formWizardStep-2');
        await pageObjects.header.waitUntilLoadingHasFinished();
        // Modify Index settings
        await testSubjects.setValue('kibanaCodeEditor', '{}', {
          clearWithKeyboard: true,
        });
        // Navigate to the last step of the wizard
        await testSubjects.click('formWizardStep-5');
        await pageObjects.header.waitUntilLoadingHasFinished();

        await verifyModeHasBeenChanged(INDEX_MODE.LOGSDB);
      });

      // Fails because of https://github.com/elastic/elasticsearch/issues/126473
      it.skip('allows to downgrade data stream from logsdb to time series index mode', async () => {
        await setIndexModeTemplate({
          mode: 'logsdb',
        });
        await verifyIndexModeIsOrigin(INDEX_MODE.LOGSDB);

        await changeIndexMode('index_mode_time_series');

        await testSubjects.click('formWizardStep-2');
        await pageObjects.header.waitUntilLoadingHasFinished();
        // Modify Index settings
        await testSubjects.setValue(
          'kibanaCodeEditor',
          JSON.stringify({ index: { mode: 'time_series', routing_path: 'test' } }),
          {
            clearWithKeyboard: true,
          }
        );
        // Navigate to the last step of the wizard
        await testSubjects.click('formWizardStep-5');
        await pageObjects.header.waitUntilLoadingHasFinished();

        await verifyModeHasBeenChanged(INDEX_MODE.TIME_SERIES);
      });
    });
  });
};
