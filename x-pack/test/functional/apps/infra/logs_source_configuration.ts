/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) => {
  const esArchiver = getService('esArchiver');
  const infraLogStream = getService('infraLogStream');
  const infraSourceConfigurationFlyout = getService('infraSourceConfigurationFlyout');
  const pageObjects = getPageObjects(['infraLogs']);

  describe('Logs Page', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
    });
    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    describe('with logs present', () => {
      before(async () => {
        await esArchiver.load('infra/metrics_and_logs');
      });
      after(async () => {
        await esArchiver.unload('infra/metrics_and_logs');
      });

      it('renders the log stream', async () => {
        await pageObjects.infraLogs.navigateTo();
        await pageObjects.infraLogs.getLogStream();
      });

      it('can change the log indices to a pattern that matches nothing', async () => {
        await pageObjects.infraLogs.openSourceConfigurationFlyout();
        await infraSourceConfigurationFlyout.switchToIndicesAndFieldsTab();

        const nameInput = await infraSourceConfigurationFlyout.getNameInput();
        await nameInput.clearValueWithKeyboard({ charByChar: true });
        await nameInput.type('Modified Source');

        const logIndicesInput = await infraSourceConfigurationFlyout.getLogIndicesInput();
        await logIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await logIndicesInput.type('does-not-exist-*');

        await infraSourceConfigurationFlyout.saveConfiguration();
        await infraSourceConfigurationFlyout.closeFlyout();
      });

      it('renders the no indices screen when no indices match the pattern', async () => {
        await pageObjects.infraLogs.getNoLogsIndicesPrompt();
      });

      it('can change the log indices back to a pattern that matches something', async () => {
        await pageObjects.infraLogs.openSourceConfigurationFlyout();
        await infraSourceConfigurationFlyout.switchToIndicesAndFieldsTab();

        const logIndicesInput = await infraSourceConfigurationFlyout.getLogIndicesInput();
        await logIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await logIndicesInput.type('filebeat-*');

        await infraSourceConfigurationFlyout.saveConfiguration();
        await infraSourceConfigurationFlyout.closeFlyout();
      });

      it('renders the log stream again', async () => {
        await pageObjects.infraLogs.getLogStream();
      });

      it('renders the default log columns with their headers', async () => {
        const columnHeaderLabels = await infraLogStream.getColumnHeaderLabels();

        expect(columnHeaderLabels).to.eql(['Timestamp', 'event.dataset', 'Message', '']);

        const logStreamEntries = await infraLogStream.getStreamEntries();

        expect(logStreamEntries.length).to.be.greaterThan(0);

        const firstLogStreamEntry = logStreamEntries[0];
        const logStreamEntryColumns = await infraLogStream.getLogColumnsOfStreamEntry(
          firstLogStreamEntry
        );

        expect(logStreamEntryColumns).to.have.length(3);
      });

      it('can change the log columns', async () => {
        await pageObjects.infraLogs.openSourceConfigurationFlyout();
        await infraSourceConfigurationFlyout.switchToLogsTab();

        await infraSourceConfigurationFlyout.removeAllLogColumns();
        await infraSourceConfigurationFlyout.addTimestampLogColumn();
        await infraSourceConfigurationFlyout.addFieldLogColumn('host.name');

        await infraSourceConfigurationFlyout.saveConfiguration();
        await infraSourceConfigurationFlyout.closeFlyout();
      });

      it('renders the changed log columns with their headers', async () => {
        const columnHeaderLabels = await infraLogStream.getColumnHeaderLabels();

        expect(columnHeaderLabels).to.eql(['Timestamp', 'host.name', '']);

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
