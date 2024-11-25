/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { OBSERVABILITY_ENABLE_LOGS_STREAM } from '@kbn/management-settings-ids';
import { DATES } from '../constants';

import { FtrProviderContext } from '../../../ftr_provider_context';

const COMMON_REQUEST_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const logsUi = getService('logsUi');
  const infraSourceConfigurationForm = getService('infraSourceConfigurationForm');
  const pageObjects = getPageObjects(['common', 'header', 'infraLogs']);
  const retry = getService('retry');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

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
      const formattedLocalStart = new Date(logFilter.timeRange.from).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

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

        await pageObjects.header.waitUntilLoadingHasFinished();

        const logIndicesInput = await infraSourceConfigurationForm.getLogIndicesInput();
        await logIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await logIndicesInput.type('filebeat-*');

        await infraSourceConfigurationForm.saveConfiguration();
      });

      it('renders the default log columns with their headers', async () => {
        await logsUi.logStreamPage.navigateTo({ logFilter });

        await retry.try(async () => {
          const columnHeaderLabels = await logsUi.logStreamPage.getColumnHeaderLabels();

          expect(columnHeaderLabels).to.eql([formattedLocalStart, 'event.dataset', 'Message']);
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
        await logsUi.logStreamPage.navigateTo({ logFilter });

        await logsUi.logStreamPage.getStreamEntries();

        const [{ stats }] = await supertest
          .post(`/internal/telemetry/clusters/_stats`)
          .set(COMMON_REQUEST_HEADERS)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
        await logsUi.logStreamPage.navigateTo({ logFilter });

        await retry.try(async () => {
          const columnHeaderLabels = await logsUi.logStreamPage.getColumnHeaderLabels();

          expect(columnHeaderLabels).to.eql([formattedLocalStart, 'host.name']);
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
