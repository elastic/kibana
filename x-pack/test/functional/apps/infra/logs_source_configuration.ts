/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DATES } from './constants';

import { FtrProviderContext } from '../../ftr_provider_context';

const COMMON_REQUEST_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const logsUi = getService('logsUi');
  const infraSourceConfigurationForm = getService('infraSourceConfigurationForm');
  const pageObjects = getPageObjects(['common', 'infraLogs']);
  const retry = getService('retry');
  const supertest = getService('supertest');

  describe('Logs Source Configuration', function () {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
    });

    describe('Allows indices configuration', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
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
          await logsUi.logStreamPage.getNoDataPage();
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
        await logsUi.logStreamPage.navigateTo({
          logPosition: {
            start: DATES.metricsAndLogs.stream.startWithData,
            end: DATES.metricsAndLogs.stream.endWithData,
          },
        });

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

      it('records telemetry for logs', async () => {
        await logsUi.logStreamPage.navigateTo({
          logPosition: {
            start: DATES.metricsAndLogs.stream.startWithData,
            end: DATES.metricsAndLogs.stream.endWithData,
          },
        });

        await logsUi.logStreamPage.getStreamEntries();

        const [{ stats }] = await supertest
          .post(`/api/telemetry/v2/clusters/_stats`)
          .set(COMMON_REQUEST_HEADERS)
          .set('Accept', 'application/json')
          .send({
            unencrypted: true,
            refreshCache: true,
          })
          .expect(200)
          .then((res: any) => res.body);

        expect(stats.stack_stats.kibana.plugins.infraops.last_24_hours.hits.logs).to.be.greaterThan(
          0
        );
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
        await logsUi.logStreamPage.navigateTo({
          logPosition: {
            start: DATES.metricsAndLogs.stream.startWithData,
            end: DATES.metricsAndLogs.stream.endWithData,
          },
        });

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
