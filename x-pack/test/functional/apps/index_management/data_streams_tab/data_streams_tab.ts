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

  const TEST_DS_NAME = 'test-ds-1';

  describe('Data streams tab', function () {
    before(async () => {
      await log.debug('Creating required data stream');
      try {
        await es.indices.putIndexTemplate({
          name: `${TEST_DS_NAME}_index_template`,
          index_patterns: [TEST_DS_NAME],
          data_stream: {},
          _meta: {
            description: `Template for ${TEST_DS_NAME} testing index`,
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
          name: TEST_DS_NAME,
        });
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
        await es.indices.deleteDataStream({ name: TEST_DS_NAME });
        await es.indices.deleteIndexTemplate({
          name: `${TEST_DS_NAME}_index_template`,
        });
      } catch (e) {
        log.debug('[Teardown error] Error deleting test data stream');
        throw e;
      }
    });

    it('shows the details flyout when clicking on a data stream', async () => {
      // Open details flyout
      await pageObjects.indexManagement.clickDataStreamAt(0);
      // Verify url is stateful
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/data_streams/${TEST_DS_NAME}`);
      // Assert that flyout is opened
      expect(await testSubjects.exists('dataStreamDetailPanel')).to.be(true);
      // Close flyout
      await testSubjects.click('closeDetailsButton');
    });

    it('allows to update data retention', async () => {
      // Open details flyout
      await pageObjects.indexManagement.clickDataStreamAt(0);
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
      const successToast = await toasts.getToastElement(1);
      expect(await successToast.getVisibleText()).to.contain('Data retention updated');
    });

    it('allows to disable data retention', async () => {
      // Open details flyout
      await pageObjects.indexManagement.clickDataStreamAt(0);
      // Open the edit retention dialog
      await testSubjects.click('manageDataStreamButton');
      await testSubjects.click('editDataRetentionButton');

      // Disable infinite retention
      await testSubjects.click('dataRetentionEnabledField > input');

      // Submit the form
      await testSubjects.click('saveButton');

      // Expect to see a success toast
      const successToast = await toasts.getToastElement(1);
      expect(await successToast.getVisibleText()).to.contain('Data retention disabled');
    });
  });
};
