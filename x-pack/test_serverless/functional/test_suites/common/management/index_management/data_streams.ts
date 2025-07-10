/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'indexManagement', 'header']);
  const browser = getService('browser');
  const security = getService('security');
  const log = getService('log');
  const es = getService('es');
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');

  const TEST_DS_NAME = 'test-ds-1';

  enum INDEX_MODE {
    STANDARD = 'Standard',
    LOGSDB = 'LogsDB',
    TIME_SERIES = 'Time series',
  }

  // Failing: See https://github.com/elastic/kibana/issues/205316
  describe.skip('Data Streams', () => {
    before(async () => {
      log.debug('Creating required data stream');
      try {
        await es.cluster.putComponentTemplate({
          name: `${TEST_DS_NAME}_mapping`,
          template: {
            settings: { mode: undefined },
            mappings: {
              properties: {
                '@timestamp': {
                  type: 'date',
                },
              },
            },
          },
        });

        await es.indices.putIndexTemplate({
          name: `index_template_${TEST_DS_NAME}`,
          index_patterns: [TEST_DS_NAME],
          data_stream: {},
          composed_of: [`${TEST_DS_NAME}_mapping`],
          _meta: {
            description: `Template for ${TEST_DS_NAME} testing index`,
          },
        });

        await es.indices.createDataStream({
          name: TEST_DS_NAME,
        });
      } catch (e) {
        log.debug('[Setup error] Error creating test data stream');
        throw e;
      }

      await security.testUser.setRoles(['index_management_user']);
      await pageObjects.svlCommonPage.loginAsAdmin();
      await pageObjects.common.navigateToApp('indexManagement');
      // Navigate to the indices tab
      await pageObjects.indexManagement.changeTabs('data_streamsTab');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      log.debug('Cleaning up created data stream');

      try {
        await es.indices.deleteDataStream({ name: TEST_DS_NAME });
        await es.indices.deleteIndexTemplate({
          name: `index_template_${TEST_DS_NAME}`,
        });
        await es.cluster.deleteComponentTemplate({
          name: `${TEST_DS_NAME}_mapping`,
        });
      } catch (e) {
        log.debug('[Teardown error] Error deleting test data stream');
        throw e;
      }
    });

    it('renders the data streams tab', async () => {
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/data_streams`);
    });

    it('shows the details flyout when clicking on a data stream', async () => {
      // Open details flyout
      await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME);
      // Verify url is stateful
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/data_streams/${TEST_DS_NAME}`);
      // Assert that flyout is opened
      expect(await testSubjects.exists('dataStreamDetailPanel')).to.be(true);
      // Close flyout
      await testSubjects.click('closeDetailsButton');
    });

    describe('data retention', function () {
      // failsOnMKI, see https://github.com/elastic/kibana/issues/181242
      this.tags(['failsOnMKI']);
      it('allows to update data retention', async () => {
        // Open details flyout
        await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME);
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
      });

      describe('Project level data retention checks - security solution', () => {
        this.tags(['skipSvlOblt', 'skipSvlSearch']);

        it('shows project data retention in the datastreams list', async () => {
          expect(await testSubjects.exists('projectLevelRetentionCallout')).to.be(true);
          expect(await testSubjects.exists('cloudLinkButton')).to.be(true);
        });
      });

      it('disabling data retention in serverless is not allowed', async () => {
        // Open details flyout
        await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME);
        // Open the edit retention dialog
        await testSubjects.click('manageDataStreamButton');
        await testSubjects.click('editDataRetentionButton');

        expect(await testSubjects.exists('dataRetentionEnabledField')).to.be(false);
      });
    });

    describe('Modify data streams index mode', () => {
      const TEST_DS_NAME_INDEX_MODE = 'test-ds';
      const setIndexModeTemplate = async (settings: object) => {
        await es.indices.putIndexTemplate({
          name: `index_template_${TEST_DS_NAME_INDEX_MODE}`,
          index_patterns: [TEST_DS_NAME_INDEX_MODE],
          data_stream: {},
          template: {
            settings,
          },
        });
        await es.indices.createDataStream({
          name: TEST_DS_NAME_INDEX_MODE,
        });
        await testSubjects.click('reloadButton');
      };

      const verifyIndexModeIsOrigin = async (indexModeName: string) => {
        // Open details flyout of data stream
        await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_INDEX_MODE);
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
          `index_template_${TEST_DS_NAME_INDEX_MODE}`
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
          alias: TEST_DS_NAME_INDEX_MODE,
        });

        // Navigate to the data streams tab
        await pageObjects.indexManagement.changeTabs('data_streamsTab');
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Open data stream
        await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_INDEX_MODE);
        // Check that index mode detail exists and its label is destination index mode
        expect(await testSubjects.exists('indexModeDetail')).to.be(true);
        expect(await testSubjects.getVisibleText('indexModeDetail')).to.be(indexModeName);
        // Close flyout
        await testSubjects.click('closeDetailsButton');
      };

      before(async () => {
        await pageObjects.common.navigateToApp('indexManagement');
        // Navigate to the indices tab
        await pageObjects.indexManagement.changeTabs('data_streamsTab');
        await pageObjects.header.waitUntilLoadingHasFinished();
      });

      afterEach(async () => {
        await log.debug('Cleaning up created data stream');

        try {
          await es.indices.deleteDataStream({ name: TEST_DS_NAME_INDEX_MODE });
          await es.indices.deleteIndexTemplate({
            name: `index_template_${TEST_DS_NAME_INDEX_MODE}`,
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

        await verifyModeHasBeenChanged(INDEX_MODE.TIME_SERIES);
      });
    });
  });
};
