/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestModel } from '@xstate/test';
// import expect from '@kbn/expect';
import { assign, createMachine } from 'xstate';
import equal from 'fast-deep-equal';
// import { DATES } from './constants';
import { LOGS_INDEX_PATTERN } from '@kbn/infra-plugin/common/constants';
import { defaultSourceConfiguration } from '@kbn/infra-plugin/common/source_configuration/defaults';
import { FtrProviderContext } from '../../ftr_provider_context';
import type {
  LogStreamPageTestMachineEvent,
  LogStreamPageTestMachineTypestate,
} from '../../page_objects/infra_logs_page';
import {
  LogsSettingsPageTestMachineEvent,
  LogsSettingsPageTestMachineTypestate,
} from '../../page_objects/infra_logs_settings_page';

// const COMMON_REQUEST_HEADERS = {
//   'kbn-xsrf': 'some-xsrf-token',
// };
// const logPosition = {
//   start: DATES.metricsAndLogs.stream.startWithData,
//   end: DATES.metricsAndLogs.stream.endWithData,
// };
// const formattedLocalStart = new Date(logPosition.start).toLocaleDateString('en-US', {
//   month: 'short',
//   day: 'numeric',
//   year: 'numeric',
// });

type TestMachineEvent = LogStreamPageTestMachineEvent | LogsSettingsPageTestMachineEvent;

type TestMachineTypestate =
  | LogStreamPageTestMachineTypestate
  | LogsSettingsPageTestMachineTypestate;

type TestMachineContext = TestMachineTypestate['context'];

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  // const browser = getService('browser');
  // const logsUi = getService('logsUi');
  // const infraSourceConfigurationForm = getService('infraSourceConfigurationForm');
  const pageObjects = getPageObjects(['common', 'header', 'infraLogs', 'infraLogsSettings']);
  // const retry = getService('retry');
  // const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  const createLogSettingsTestMachine = (initialContext: TestMachineContext) =>
    /** @xstate-layout N4IgpgJg5mDOIC5QBsD2UDKYAu2CWAdlLACpzYCyAhgMYAWhYAdLNlQE7YDEBVAbnihVsYEqgAy6WAFU8AbQAMAXUSgADqlh58qAqpAAPRAFoAjAHYmAFgAcp0wGYATFYBsATgXnXXhwBoQAE9EUxsHJndI9ysLJxcFGwBWAF9kgLRMHHwiUnJqekYWNk4efkFhUQkpWTlTFSQQDS0dPQajBESmRPMHRI8HSNdzBSGrAOCEJ3dXJjDHd0SbGycwxK9U9PQsXEJiMlZ8hgJmXUlMbHYwKgBbCjxYLSIASQIIPBo4AAUqGC4aZHeAGtttliAAJK4QMDscSEQGKerqTTaPC6fTtVyJcJOBxWBwKOKeGzuXrjEI2KzWKJORLRabdDYgDIg3a5A60I4nAhnFk5b6-f5AnkXK7XAByZSELVhBHhyn0TRRaLaiFcpicTAcyw8Cgc9nc9lMZI6rhsTC8FPMpixYR8VkZzKyrP2lA5hVOWydfJ+YD+AJogOFlxuEoEUtR3LhtURjWRLXRIVcGqcCnsCnc5is3UzRqCiD6ZotVitNocPhSaSZnp2ORdh3d3OroNg-OYAHdtHRpAR6FQiJBecQ-nQ+zAXlCDAAlMAAM2hYB7YARCrjEYTCHVutmbis0WttKxiWNLks5h6eoWc0x9srjprezybuOTA9mXvLZ9TA72C7PZH-YgQdYGHUcwAAYVQZAAFdrgIWBlwaRV4xVDcXDNbp8TcSJDXcY0HHMDVTCGXpTBGGxhiSB0m2dR8CmfV8gNbL9OzA-8YEAr0h1gfgwCAhCkWaNcUMcBJzQJDwSUSexD2NRxKXcJZnFI8xEisBRaVcKi32bOsny5INRVbP0gSAiEqChGEo3lRDV2VUAMSxJgcTxLMMwNXobGPaZZj1AZFmWVZ1lvaja1ozkX0bbTWSY786FY0COPfED+3HMAp1nedF342NBLswxyXU801MiWliQsWTcQiRSsSmRInFCBwHC0oDdLo-SQuIGKWLYgdOOA3t+wg6DYPg6yBKVVp7PJKYqRiJxzDCbxyM8vMEHwwjiKzGkKXmmxUkrAhUCheAGjvHSwsYFdcsm-KEGMRqFFmaYvHm60SVCMZVuMcjzXsYiaXxVwgeavrWvC1gOGwK6JvXYwVg1YkfAIkt3opWSfCpSIbC8LwDQ8TTgqi0L2TaiKDJuO4Hl2cd3i+H1oeQqa1r6JgrRsIZMzcs9i1ksIIiiKwphJGJdwrTYiYfEnwoYvrWwZoSmeJSksXVDygbPDxjUe2wwhcewekSKTbBpEH3zBhseVlz9Yu7Ab2KA+W8vaaINRVnFFnV7xcNW+btaiAkyzPA0rBvcWWou+jIsY63uoSh2bOu9ciKB-mDXTYPXAGY9hkx9xfcU4kz1N86pYtrYRRuOWE5hlCYlMJhHHmzP8VKqZXC8mY5j8pYVl6fbkiAA */
    createMachine<TestMachineContext, TestMachineEvent, TestMachineTypestate>(
      {
        predictableActionArguments: true,
        context: initialContext,
        initial: 'start',
        states: {
          start: {
            entry: 'restoreInitialContext',
            on: {
              navigateToLogsUi: [
                {
                  target: 'onLogStreamMissingIndicesPage',
                  cond: 'areIndicesMissing',
                },
                'onLogStreamPage',
              ],
            },
          },

          onLogStreamMissingIndicesPage: {
            on: {
              clickSettingsHeaderLink: {
                target: 'onLogSettingsPage',
              },
            },
          },

          onLogSettingsPage: {
            states: {
              withUnchangedSettings: {
                on: {
                  changeIndexReference: {
                    target: 'withChangedSettings',
                    actions: 'storeChangedIndexReference',
                    cond: 'canChangeIndexReference',
                  },

                  changeColumns: {
                    target: 'withChangedSettings',
                    cond: 'canChangeColumns',
                    actions: 'storeChangedColumns',
                  },
                },
              },

              withChangedSettings: {
                on: {
                  saveSettings: {
                    target: 'withUnchangedSettings',
                    actions: 'applyChangedLogView',
                  },

                  changeIndexReference: {
                    target: 'withChangedSettings',
                    internal: true,
                    cond: 'canChangeIndexReference',
                    actions: 'storeChangedIndexReference',
                  },

                  changeColumns: {
                    target: 'withChangedSettings',
                    internal: true,
                    cond: 'canChangeColumns',
                    actions: 'storeChangedColumns',
                  },
                },
              },
            },

            initial: 'withUnchangedSettings',

            on: {
              clickLogStreamNavigationLink: [
                {
                  target: 'onLogStreamMissingIndicesPage',
                  cond: 'areIndicesMissing',
                },
                'onLogStreamPage',
              ],
            },

            exit: 'discardChangedLogView',
          },

          onLogStreamPage: {
            on: {
              clickSettingsHeaderLink: 'onLogSettingsPage',
            },
          },
        },
        id: 'logSettingsTestMachine',
      },
      {
        actions: {
          restoreInitialContext: assign(() => initialContext),
          storeChangedIndexReference: assign((context, event) =>
            event.type === 'changeIndexReference'
              ? {
                  changedLogView: {
                    ...('changedLogView' in context ? context.changedLogView : {}),
                    logIndices: event.newIndexReference,
                    expectedIndexStatus: event.expextedIndexStatus,
                  },
                }
              : {}
          ),
          storeChangedColumns: assign((context, event) =>
            event.type === 'changeColumns'
              ? {
                  changedLogView: {
                    ...('changedLogView' in context ? context.changedLogView : {}),
                    columns: event.newColumns,
                  },
                }
              : {}
          ),
          applyChangedLogView: assign((context, event) =>
            event.type === 'saveSettings' && 'changedLogView' in context
              ? {
                  logView: {
                    ...context.logView,
                    ...context.changedLogView,
                  },
                  changedLogView: undefined,
                }
              : {}
          ),
          discardChangedLogView: assign((context, _event) =>
            'changedLogView' in context
              ? {
                  changedLogView: undefined,
                }
              : {}
          ),
        },
        guards: {
          canChangeIndexReference: (context, event) =>
            event.type === 'changeIndexReference' &&
            !equal(context.logView.logIndices, event.newIndexReference) &&
            !(
              'changedLogView' in context &&
              equal(context.changedLogView?.logIndices, event.newIndexReference)
            ),
          canChangeColumns: (context, event) =>
            context.logView.expectedIndexStatus !== 'missing' &&
            event.type === 'changeColumns' &&
            !equal(context.logView.columns, event.newColumns) &&
            !(
              'changedLogView' in context &&
              equal(context.changedLogView?.columns, event.newColumns)
            ),
          areIndicesMissing: (context) => context.logView.expectedIndexStatus === 'missing',
        },
      }
    );

  const logSettingsTestModel = createTestModel(
    createLogSettingsTestMachine({
      logView: {
        logIndices: {
          type: 'index_name',
          indexName: LOGS_INDEX_PATTERN,
        },
        expectedIndexStatus: 'available',
        columns: defaultSourceConfiguration.logColumns,
      },
      changedLogView: undefined,
    }),
    {
      logger: {
        log: log.info.bind(log),
        error: log.error.bind(log),
      },
      eventCases: {
        changeIndexReference: [
          {
            newIndexReference: { type: 'index_name', indexName: 'does-not-match-*' },
            expextedIndexStatus: 'missing',
          },
          {
            newIndexReference: { type: 'index_name', indexName: 'filebeat-*' },
            expextedIndexStatus: 'available',
          },
        ],
        changeColumns: [
          {
            newColumns: [
              { timestampColumn: { id: 'TS' } },
              { fieldColumn: { id: 'HOSTNAME', field: 'host.name' } },
            ],
          },
        ],
      },
    }
  );

  describe('Log Settings', function () {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.clean({ types: ['infrastructure-monitoring-log-view'] });
    });
    afterEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.clean({ types: ['infrastructure-monitoring-log-view'] });
    });

    const testPaths = logSettingsTestModel.getPaths();

    testPaths.forEach((path) => {
      it(path.description, async () => {
        await path.test({
          events: {
            ...pageObjects.infraLogs.modelTransitionEffects,
            ...pageObjects.infraLogsSettings.modelTransitionEffects,
          },
          states: {
            ...pageObjects.infraLogs.modelStateAssertions,
            ...pageObjects.infraLogsSettings.modelStateAssertions,
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
