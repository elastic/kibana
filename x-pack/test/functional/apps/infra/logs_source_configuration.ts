/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const logsUi = getService('logsUi');
  const infraSourceConfigurationForm = getService('infraSourceConfigurationForm');
  const pageObjects = getPageObjects(['common', 'infraLogs']);
  const retry = getService('retry');

  describe('Logs Source Configuration', function() {
    this.tags('smoke');

    before(async () => {
      await esArchiver.load('empty_kibana');
    });
    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    describe('Allows indices configuration', () => {
      before(async () => {
        await esArchiver.load('infra/metrics_and_logs');
      });
      after(async () => {
        await esArchiver.unload('infra/metrics_and_logs');
      });

      it('can change the log indices to a pattern that matches nothing', async () => {
        await pageObjects.infraLogs.navigateToTab('settings');

        await retry.try(async () => {
          await infraSourceConfigurationForm.getForm();
        });

        const nameInput = await infraSourceConfigurationForm.getNameInput();
        await nameInput.clearValueWithKeyboard({ charByChar: true });
        await nameInput.type('Modified Source');

        const logIndicesInput = await infraSourceConfigurationForm.getLogIndicesInput();
        await logIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await logIndicesInput.type('does-not-exist-*');

        await infraSourceConfigurationForm.saveConfiguration();
      });

      it('renders the no indices screen when no indices match the pattern', async () => {
        await logsUi.logStreamPage.navigateTo();

        await retry.try(async () => {
          await logsUi.logStreamPage.getNoLogsIndicesPrompt();
        });
      });

      it('can change the log indices back to a pattern that matches something', async () => {
        await pageObjects.infraLogs.navigateToTab('settings');

        await retry.try(async () => {
          await infraSourceConfigurationForm.getForm();
        });

        const logIndicesInput = await infraSourceConfigurationForm.getLogIndicesInput();
        await logIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await logIndicesInput.type('filebeat-*');

        await infraSourceConfigurationForm.saveConfiguration();
      });

      it('renders the default log columns with their headers', async () => {
        await logsUi.logStreamPage.navigateTo();

        await retry.try(async () => {
          const columnHeaderLabels = await logsUi.logStreamPage.getColumnHeaderLabels();

          expect(columnHeaderLabels).to.eql(['Oct 17, 2018', 'event.dataset', 'Message']);
        });

        const logStreamEntries = await logsUi.logStreamPage.getStreamEntries();
        expect(logStreamEntries.length).to.be.greaterThan(0);

        const firstLogStreamEntry = logStreamEntries[0];
        const logStreamEntryColumns = await logsUi.logStreamPage.getLogColumnsOfStreamEntry(
          firstLogStreamEntry
        );

        expect(logStreamEntryColumns).to.have.length(3);
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
        await logsUi.logStreamPage.navigateTo();

        await retry.try(async () => {
          const columnHeaderLabels = await logsUi.logStreamPage.getColumnHeaderLabels();

          expect(columnHeaderLabels).to.eql(['Oct 17, 2018', 'host.name']);
        });

        const logStreamEntries = await logsUi.logStreamPage.getStreamEntries();

        expect(logStreamEntries.length).to.be.greaterThan(0);

        const firstLogStreamEntry = logStreamEntries[0];
        const logStreamEntryColumns = await logsUi.logStreamPage.getLogColumnsOfStreamEntry(
          firstLogStreamEntry
        );

        expect(logStreamEntryColumns).to.have.length(2);
      });
    });
  });
};
