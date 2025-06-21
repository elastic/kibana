/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { OBSERVABILITY_ENABLE_LOGS_STREAM } from '@kbn/management-settings-ids';
import { DATES } from '../constants';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const logsUi = getService('logsUi');
  const infraSourceConfigurationForm = getService('infraSourceConfigurationForm');
  const pageObjects = getPageObjects(['common', 'header', 'infraLogs']);
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');

  describe('Logs Source Configuration', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.update({ [OBSERVABILITY_ENABLE_LOGS_STREAM]: true });
    });
    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.update({ [OBSERVABILITY_ENABLE_LOGS_STREAM]: false });
    });

    describe('Allows indices configuration', () => {
      const logFilter = {
        timeRange: {
          from: DATES.metricsAndLogs.stream.startWithData,
          to: DATES.metricsAndLogs.stream.endWithData,
        },
      };

      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });

      it('renders the correct page title', async () => {
        await pageObjects.infraLogs.navigateToTab('settings');

        await pageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          const documentTitle = await browser.getTitle();
          expect(documentTitle).to.contain('Settings - Logs - Observability - Elastic');
        });
      });

      it('can change the log indices to a pattern that matches nothing', async () => {
        await pageObjects.infraLogs.navigateToTab('settings');

        await retry.try(async () => {
          await infraSourceConfigurationForm.getForm();
        });

        await pageObjects.header.waitUntilLoadingHasFinished();

        await infraSourceConfigurationForm.selectIndicesPanel();

        const nameInput = await infraSourceConfigurationForm.getNameInput();
        await nameInput.clearValueWithKeyboard({ charByChar: true });
        await nameInput.type('Modified Source');

        const logIndicesInput = await infraSourceConfigurationForm.getLogIndicesInput();
        await logIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await logIndicesInput.type('does-not-exist-*');

        await infraSourceConfigurationForm.saveConfiguration();
      });

      it('renders the no indices screen when no indices match the pattern', async () => {
        // We will still navigate to the log stream page, but it should redirect to Log Explorer.
        // This way this test, serves 2 purposes:
        await logsUi.logStreamPage.navigateTo();

        await retry.tryForTime(5 * 1000, async () => {
          await testSubjects.existOrFail('discoverNoResults');
        });
      });

      it('can change the log indices back to a pattern that matches something', async () => {
        await pageObjects.infraLogs.navigateToTab('settings');

        await retry.try(async () => {
          await infraSourceConfigurationForm.getForm();
        });

        await pageObjects.header.waitUntilLoadingHasFinished();

        const logIndicesInput = await infraSourceConfigurationForm.getLogIndicesInput();
        await logIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await logIndicesInput.type('filebeat-*');

        await infraSourceConfigurationForm.saveConfiguration();
      });

      it('renders the default log columns with their headers', async () => {
        await logsUi.logStreamPage.navigateTo({ logFilter });

        await dataGrid.waitForDataTableToLoad();
        const columnHeaders = await dataGrid.getHeaders();

        expect(columnHeaders).to.eql([
          'Select column',
          'Actions columnActionsActions',
          '@timestamp ',
          'Summary',
        ]);
      });

      it('can change the log columns', async () => {
        await pageObjects.infraLogs.navigateToTab('settings');

        await retry.try(async () => {
          await infraSourceConfigurationForm.getForm();
        });

        await infraSourceConfigurationForm.removeAllLogColumns();
        await infraSourceConfigurationForm.addTimestampLogColumn();
        await infraSourceConfigurationForm.addFieldLogColumn('host.name');

        await infraSourceConfigurationForm.saveConfiguration();
      });

      it('renders the changed log columns with their headers', async () => {
        await logsUi.logStreamPage.navigateTo({ logFilter });

        await dataGrid.waitForDataTableToLoad();
        const columnHeaders = await dataGrid.getHeaders();

        expect(columnHeaders).to.eql([
          'Select column',
          'Actions columnActionsActions',
          '@timestamp ',
          'Summary',
        ]);

        await testSubjects.click('field-host.name');
        await testSubjects.click('fieldPopoverHeader_addField-host.name');

        await dataGrid.waitForDataTableToLoad();
        const updatedColumnHeaders = await dataGrid.getHeaders();

        expect(updatedColumnHeaders).to.eql([
          'Select column',
          'Actions columnActionsActions',
          '@timestamp ',
          'Keywordhost.name',
        ]);
      });
    });
  });
};
