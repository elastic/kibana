/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const infraLogStream = getService('infraLogStream');
  const infraSourceConfigurationForm = getService('infraSourceConfigurationForm');
  const pageObjects = getPageObjects(['common', 'infraLogs']);

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
        await pageObjects.common.navigateToActualUrl('infraLogs', 'logs/settings');
        await infraSourceConfigurationForm.getForm();

        const nameInput = await infraSourceConfigurationForm.getNameInput();
        await nameInput.clearValueWithKeyboard({ charByChar: true });
        await nameInput.type('Modified Source');

        const logIndicesInput = await infraSourceConfigurationForm.getLogIndicesInput();
        await logIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await logIndicesInput.type('does-not-exist-*');

        await infraSourceConfigurationForm.saveConfiguration();
      });

      it('renders the no indices screen when no indices match the pattern', async () => {
        await pageObjects.common.navigateToActualUrl('infraLogs', 'logs/stream');
        await pageObjects.infraLogs.getNoLogsIndicesPrompt();
      });

      it('can change the log indices back to a pattern that matches something', async () => {
        await pageObjects.common.navigateToActualUrl('infraLogs', 'logs/settings');
        await infraSourceConfigurationForm.getForm();

        const logIndicesInput = await infraSourceConfigurationForm.getLogIndicesInput();
        await logIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await logIndicesInput.type('filebeat-*');

        await infraSourceConfigurationForm.saveConfiguration();
      });

      it('renders the default log columns with their headers', async () => {
        await pageObjects.common.navigateToActualUrl('infraLogs', 'logs/stream');
        const columnHeaderLabels = await infraLogStream.getColumnHeaderLabels();

        expect(columnHeaderLabels).to.eql(['Timestamp', 'event.dataset', 'Message']);

        const logStreamEntries = await infraLogStream.getStreamEntries();
        expect(logStreamEntries.length).to.be.greaterThan(0);

        const firstLogStreamEntry = logStreamEntries[0];
        const logStreamEntryColumns = await infraLogStream.getLogColumnsOfStreamEntry(
          firstLogStreamEntry
        );

        expect(logStreamEntryColumns).to.have.length(3);
      });

      it('can change the log columns', async () => {
        await pageObjects.common.navigateToActualUrl('infraLogs', 'logs/settings');
        await infraSourceConfigurationForm.getForm();

        await infraSourceConfigurationForm.removeAllLogColumns();
        await infraSourceConfigurationForm.addTimestampLogColumn();
        await infraSourceConfigurationForm.addFieldLogColumn('host.name');

        // await infraSourceConfigurationForm.moveLogColumn(0, 1);

        await infraSourceConfigurationForm.saveConfiguration();
      });

      it('renders the changed log columns with their headers', async () => {
        await pageObjects.common.navigateToActualUrl('infraLogs', 'logs/stream');
        const columnHeaderLabels = await infraLogStream.getColumnHeaderLabels();

        // TODO: make test more robust
        // expect(columnHeaderLabels).to.eql(['host.name', 'Timestamp']);
        expect(columnHeaderLabels).to.eql(['Timestamp', 'host.name']);

        const logStreamEntries = await infraLogStream.getStreamEntries();

        expect(logStreamEntries.length).to.be.greaterThan(0);

        const firstLogStreamEntry = logStreamEntries[0];
        const logStreamEntryColumns = await infraLogStream.getLogColumnsOfStreamEntry(
          firstLogStreamEntry
        );

        expect(logStreamEntryColumns).to.have.length(2);
      });
    });
  });
};
