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
import { FtrProviderContext } from '../../ftr_provider_context';
import type {
  LogStreamPageTestMachineEvent,
  LogStreamPageTestMachineTypestate,
} from '../../page_objects/infra_logs_page';
import {
  LogsSettingsPageTestMachineEvent,
  LogsSettingsPageTestMachineTypestate,
} from '../../page_objects/infra_logs_settings_page';

const COMMON_REQUEST_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

type TestMachineEvent = LogStreamPageTestMachineEvent | LogsSettingsPageTestMachineEvent;

type TestMachineTypestate =
  | LogStreamPageTestMachineTypestate
  | LogsSettingsPageTestMachineTypestate;

type TestMachineContext = TestMachineTypestate['context'];

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

  const createLogSettingsTestMachine = (initialContext: TestMachineContext) =>
    /** @xstate-layout N4IgpgJg5mDOIC5QBsD2UDKYAu2CWAdlLACpzYCyAhgMYAWhYAdLNlQE7YDEBVAbnihVsYEqgAy6WAFU8AbQAMAXUSgADqlh58qAqpAAPRAEYAbAGYmAThtWArAoBMC4woWnHAFgA0IAJ4mAByeTJ62jnZWYaZ2AOwAvvG+aJg4+ESk5NT0jEy6kpjY7GBUALYUeLBaRACSBBB4NHAAClQwXDTIjQDWWLiExAASJRBg7OKE3YoqSCAaWjp6s0YIMZaO5p7mTo5WCoFW5na+AQjGwaHhkdFxicnofenEZKzZDATM+Q9pA7CtMEwAO7aOjSAj0KhESCPX4dOiQmB1UYGABKYAAZmMwOCwNN9PNtHhdPoVsZHBsmOZYtTto5YodjHZzCdEF5YkwaUdYoEuYEFLFTHcQCkYRkXpRaO9PgQCqLiP9mMDsHQAMLwqEQOWwLiwfhgLV42YExYkkzmc5MNx01xmQKmPmmFlnTyOUKeYzGWLmzx2qymCxCkU-MVZSW5L6pfoZBVAkFgiEarVwhFgJFgVEYrE4uTGGbqTSE4nLEwRV3c8xWAVeOz+rxOo52awKOyef32luRYyJJIgAioUbwWZBqPPUM5D74gsm4sIAC0jv8iFn5lddjsgR5zZXFcZnkD3xHmVeYY+LDYnEnCyJS1AKxdTvOllsUV2h3dYTs+8jTyPEvH0tlIoSnKSpqigJFGhaNowEvQsb0MRAjlMDlzlMakwnpdDYgfHlrFsF0bE2YwPy-LVxTecMZQPH8FVg6db0QA4QiZMkjjtNCBSsJ0W2sd1PWMbZAkZCJPx7Ycf3Ik8AOo34YyVUFwXVGBNWDYg6OvU0EBfJgWI2dd-WpUwuMXBA6QUS4bCccwOKsYi9zEmSQ2Pf88io79ZOg2NlTVFMVMPdSiwYs42zw2yFBsYiLGM04zIsqwzI3cwDmpbt4iAA */
    createMachine<TestMachineContext, TestMachineEvent, TestMachineTypestate>(
      {
        predictableActionArguments: true,
        context: initialContext,
        initial: 'start',
        states: {
          start: {
            on: {
              navigateToLogsUi: {
                target: 'onLogStreamMissingIndicesPage',
              },
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
                  changeIndexReference: [
                    {
                      target: 'withChangedSettings',
                      actions: 'storeChangedLogView',
                      cond: 'areSettingsDifferent',
                    },
                    {
                      target: 'withUnchangedSettings',
                      internal: true,
                    },
                  ],
                },
              },

              withChangedSettings: {
                on: {
                  saveSettings: {
                    target: 'withUnchangedSettings',
                    actions: 'applyChangedLogView',
                  },
                },
              },
            },

            initial: 'withUnchangedSettings',
          },
        },
        id: 'logSettingsTestMachine',
      },
      {
        actions: {
          storeChangedLogView: assign((context, event) =>
            event.type === 'changeIndexReference'
              ? {
                  changedLogView: {
                    ...('changedLogView' in context ? context.changedLogView : {}),
                    logIndices: event.newIndexReference,
                  },
                }
              : {}
          ),
          applyChangedLogView: assign((context, event) =>
            event.type === 'saveSettings' && 'changedLogView' in context
              ? {
                  logView: context.changedLogView,
                  changedLogView: undefined,
                }
              : {}
          ),
        },
        guards: {
          areSettingsDifferent: (context, event) =>
            event.type === 'changeIndexReference' &&
            !equal(context.logView.logIndices, event.newIndexReference),
        },
      }
    );

  const logSettingsTestModel = createTestModel(
    createLogSettingsTestMachine({
      logView: {
        logIndices: {
          type: 'index_name',
          indexName: 'logs-*',
        },
      },
    }),
    {
      logger: {
        log: log.info.bind(log),
        error: log.error.bind(log),
      },
      eventCases: {
        changeIndexReference: [
          { newIndexReference: { type: 'index_name', indexName: 'does-not-match-*' } },
        ],
      },
    }
  );

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
