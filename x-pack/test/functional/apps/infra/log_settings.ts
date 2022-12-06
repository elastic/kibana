/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestMachine, createTestModel } from '@xstate/test';
import expect from '@kbn/expect';
import { DATES } from './constants';
import { FtrProviderContext } from '../../ftr_provider_context';

const COMMON_REQUEST_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

const logSettingsTestMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2UDKYAu2CWAdlLACpzYCyAhgMYAWhYAdLNlQE7YDEBVAbnihVsYEqgAy6WAFU8AbQAMAXUSgADqlh58qAqpAAPRAEYAbAGYmAThs2A7AFYHxgBxPzpgDQgAniZcALEwOCqEKVsYOdnbmAEwusQC+id5omDj4RKTk1PSMTGkY2OxgVAC2FHiwWkQAkgQQeDRwAApUMFw0yE0A1li4hMQAEqUQYOzihD2KKkggGlo6enNGCBYKTOZWCqbxzg4BsVax3n4IrkEhYRFRMfFJKSCFGYPZrLkMBMzPA1ltHfQqEQwPUxgYAHLlMBtXDjAgzfQLbR4XT6VbrTbbXZuSKHY6nRAuSwBWx2UxkhQBVxxZKpdD9TLEMjvWifb70l5-dpgADq2joAGE6ECYLAuLB+GAGa8EXMkUs0YgMVsdntcUcTr4TOZLLYbEcHNtHFFko8CKgxvA5j9GW9KKzGIjNMjUStEABaLxahCe2lPDm-Jk5B1fFhsThOxYo5agVaHAnnQJMMIKWKxcwKcwuYyxAJ2P0217M+15UOFYqlCpVGpQUFNVrcyMumOGRDmBymJh2VyOAJUlzhWJes4XZNhNMZrM5vMFgO24sffKFrkwJsKt0IFwJJimFyONNblwRAIJ4weMdhUzGBT7Bxp2fpQN2xdluevf68-lCkVwNfRxUIO2uoOOYkQZlYcRpnYJ7elu1hmKYBxHuExh4qaiRAA */
  createTestMachine({
    schema: {
      events: {} as
        | { type: 'navigateToLogsUi' }
        | { type: 'clickSettingsHeaderLink' }
        | { type: 'changeIndexNamePattern' }
        | { type: 'saveSettings' },
    },
    initial: 'start',
    states: {
      start: {
        on: {
          navigateToLogsUi: {
            target: 'logStreamMissingIndicesPage',
          },
        },
      },
      logStreamMissingIndicesPage: {
        on: {
          clickSettingsHeaderLink: {
            target: 'logSettingsPage',
          },
        },
      },
      logSettingsPage: {
        on: {
          changeIndexNamePattern: {
            target: 'logSettingsPageWithChanges',
          },
        },
      },
      logSettingsPageWithChanges: {
        on: {
          saveSettings: {
            target: 'logSettingsPage',
          },
        },
      },
    },
    id: 'logSettingsTestMachine',
  });

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const logsUi = getService('logsUi');
  const infraSourceConfigurationForm = getService('infraSourceConfigurationForm');
  const pageObjects = getPageObjects(['common', 'header', 'infraLogs', 'infraLogsSettings']);
  const retry = getService('retry');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  const logSettingsTestModel = createTestModel(logSettingsTestMachine, {
    logger: {
      log: log.debug.bind(log),
      error: log.error.bind(log),
    },
  });

  describe('Log Settings', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });
    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    logSettingsTestModel.getPaths().forEach((path) => {
      it(path.description, async () => {
        await path.test({
          events: {
            navigateToLogsUi: async () => {
              await pageObjects.infraLogs.navigateTo();
            },
            clickSettingsHeaderLink: async () => {
              await pageObjects.infraLogs.navigateToTab('settings');
            },
          },
          states: {
            logStreamMissingIndicesPage: async () => {
              await pageObjects.infraLogs.getMissingIndicesPage();
            },
            logSettingsPage: async () => {
              await pageObjects.header.waitUntilLoadingHasFinished();
              await pageObjects.infraLogsSettings.getPage();
            },
          },
        });
      });
    });

    // describe('Allows indices configuration', () => {
    //   const logPosition = {
    //     start: DATES.metricsAndLogs.stream.startWithData,
    //     end: DATES.metricsAndLogs.stream.endWithData,
    //   };
    //   const formattedLocalStart = new Date(logPosition.start).toLocaleDateString('en-US', {
    //     month: 'short',
    //     day: 'numeric',
    //     year: 'numeric',
    //   });

    //   before(async () => {
    //     await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    //   });
    //   after(async () => {
    //     await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    //   });

    //   it('renders the correct page title', async () => {
    //     await pageObjects.infraLogs.navigateToTab('settings');

    //     await pageObjects.header.waitUntilLoadingHasFinished();

    //     retry.try(async () => {
    //       const documentTitle = await browser.getTitle();
    //       expect(documentTitle).to.contain('Settings - Logs - Observability - Elastic');
    //     });
    //   });

    //   it('can change the log indices to a pattern that matches nothing', async () => {
    //     await pageObjects.infraLogs.navigateToTab('settings');

    //     await retry.try(async () => {
    //       await infraSourceConfigurationForm.getForm();
    //     });

    //     await pageObjects.header.waitUntilLoadingHasFinished();

    //     const nameInput = await infraSourceConfigurationForm.getNameInput();
    //     await nameInput.clearValueWithKeyboard({ charByChar: true });
    //     await nameInput.type('Modified Source');

    //     const logIndicesInput = await infraSourceConfigurationForm.getLogIndicesInput();
    //     await logIndicesInput.clearValueWithKeyboard({ charByChar: true });
    //     await logIndicesInput.type('does-not-exist-*');

    //     await infraSourceConfigurationForm.saveConfiguration();
    //   });

    //   it('renders the no indices screen when no indices match the pattern', async () => {
    //     await logsUi.logStreamPage.navigateTo();

    //     await retry.try(async () => {
    //       await logsUi.logStreamPage.getNoDataPage();
    //     });
    //   });

    //   it('can change the log indices back to a pattern that matches something', async () => {
    //     await pageObjects.infraLogs.navigateToTab('settings');

    //     await retry.try(async () => {
    //       await infraSourceConfigurationForm.getForm();
    //     });

    //     await pageObjects.header.waitUntilLoadingHasFinished();

    //     const logIndicesInput = await infraSourceConfigurationForm.getLogIndicesInput();
    //     await logIndicesInput.clearValueWithKeyboard({ charByChar: true });
    //     await logIndicesInput.type('filebeat-*');

    //     await infraSourceConfigurationForm.saveConfiguration();
    //   });

    //   it('renders the default log columns with their headers', async () => {
    //     await logsUi.logStreamPage.navigateTo({ logPosition });

    //     await retry.try(async () => {
    //       const columnHeaderLabels = await logsUi.logStreamPage.getColumnHeaderLabels();

    //       expect(columnHeaderLabels).to.eql([formattedLocalStart, 'event.dataset', 'Message']);
    //     });

    //     const logStreamEntries = await logsUi.logStreamPage.getStreamEntries();
    //     expect(logStreamEntries.length).to.be.greaterThan(0);

    //     const firstLogStreamEntry = logStreamEntries[0];
    //     const logStreamEntryColumns = await logsUi.logStreamPage.getLogColumnsOfStreamEntry(
    //       firstLogStreamEntry
    //     );

    //     expect(logStreamEntryColumns).to.have.length(3);
    //   });

    //   it('records telemetry for logs', async () => {
    //     await logsUi.logStreamPage.navigateTo({ logPosition });

    //     await logsUi.logStreamPage.getStreamEntries();

    //     const [{ stats }] = await supertest
    //       .post(`/api/telemetry/v2/clusters/_stats`)
    //       .set(COMMON_REQUEST_HEADERS)
    //       .set('Accept', 'application/json')
    //       .send({
    //         unencrypted: true,
    //         refreshCache: true,
    //       })
    //       .expect(200)
    //       .then((res: any) => res.body);

    //     expect(stats.stack_stats.kibana.plugins.infraops.last_24_hours.hits.logs).to.be.greaterThan(
    //       0
    //     );
    //   });

    //   it('can change the log columns', async () => {
    //     await pageObjects.infraLogs.navigateToTab('settings');

    //     await retry.try(async () => {
    //       await infraSourceConfigurationForm.getForm();
    //     });

    //     await infraSourceConfigurationForm.removeAllLogColumns();
    //     await infraSourceConfigurationForm.addTimestampLogColumn();
    //     await infraSourceConfigurationForm.addFieldLogColumn('host.name');

    //     await infraSourceConfigurationForm.saveConfiguration();
    //   });

    //   it('renders the changed log columns with their headers', async () => {
    //     await logsUi.logStreamPage.navigateTo({ logPosition });

    //     await retry.try(async () => {
    //       const columnHeaderLabels = await logsUi.logStreamPage.getColumnHeaderLabels();

    //       expect(columnHeaderLabels).to.eql([formattedLocalStart, 'host.name']);
    //     });

    //     const logStreamEntries = await logsUi.logStreamPage.getStreamEntries();

    //     expect(logStreamEntries.length).to.be.greaterThan(0);

    //     const firstLogStreamEntry = logStreamEntries[0];
    //     const logStreamEntryColumns = await logsUi.logStreamPage.getLogColumnsOfStreamEntry(
    //       firstLogStreamEntry
    //     );

    //     expect(logStreamEntryColumns).to.have.length(2);
    //   });
    // });
  });
};
