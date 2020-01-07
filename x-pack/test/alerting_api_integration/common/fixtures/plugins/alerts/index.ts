/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { AlertExecutorOptions, AlertType } from '../../../../../../legacy/plugins/alerting';
import { ActionTypeExecutorOptions, ActionType } from '../../../../../../legacy/plugins/actions';

// eslint-disable-next-line import/no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    require: ['actions', 'alerting', 'elasticsearch'],
    name: 'alerts',
    init(server: any) {
      server.plugins.xpack_main.registerFeature({
        id: 'alerting',
        name: 'Alerting',
        app: ['alerting', 'kibana'],
        privileges: {
          all: {
            savedObject: {
              all: ['alert'],
              read: [],
            },
            ui: [],
            api: ['alerting-read', 'alerting-all'],
          },
          read: {
            savedObject: {
              all: [],
              read: ['alert'],
            },
            ui: [],
            api: ['alerting-read'],
          },
        },
      });

      // Action types
      const noopActionType: ActionType = {
        id: 'test.noop',
        name: 'Test: Noop',
        async executor() {
          return { status: 'ok', actionId: '' };
        },
      };
      const indexRecordActionType: ActionType = {
        id: 'test.index-record',
        name: 'Test: Index Record',
        validate: {
          params: schema.object({
            index: schema.string(),
            reference: schema.string(),
            message: schema.string(),
          }),
          config: schema.object({
            unencrypted: schema.string(),
          }),
          secrets: schema.object({
            encrypted: schema.string(),
          }),
        },
        async executor({ config, secrets, params, services }: ActionTypeExecutorOptions) {
          return await services.callCluster('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              params,
              config,
              secrets,
              reference: params.reference,
              source: 'action:test.index-record',
            },
          });
        },
      };
      const failingActionType: ActionType = {
        id: 'test.failing',
        name: 'Test: Failing',
        validate: {
          params: schema.object({
            index: schema.string(),
            reference: schema.string(),
          }),
        },
        async executor({ config, secrets, params, services }: ActionTypeExecutorOptions) {
          await services.callCluster('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              params,
              config,
              secrets,
              reference: params.reference,
              source: 'action:test.failing',
            },
          });
          throw new Error('Failed to execute action type');
        },
      };
      const rateLimitedActionType: ActionType = {
        id: 'test.rate-limit',
        name: 'Test: Rate Limit',
        maxAttempts: 2,
        validate: {
          params: schema.object({
            index: schema.string(),
            reference: schema.string(),
            retryAt: schema.number(),
          }),
        },
        async executor({ config, params, services }: ActionTypeExecutorOptions) {
          await services.callCluster('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              params,
              config,
              reference: params.reference,
              source: 'action:test.rate-limit',
            },
          });
          return {
            status: 'error',
            retry: new Date(params.retryAt),
            actionId: '',
          };
        },
      };
      const authorizationActionType: ActionType = {
        id: 'test.authorization',
        name: 'Test: Authorization',
        validate: {
          params: schema.object({
            callClusterAuthorizationIndex: schema.string(),
            savedObjectsClientType: schema.string(),
            savedObjectsClientId: schema.string(),
            index: schema.string(),
            reference: schema.string(),
          }),
        },
        async executor({ params, services }: ActionTypeExecutorOptions) {
          // Call cluster
          let callClusterSuccess = false;
          let callClusterError;
          try {
            await services.callCluster('index', {
              index: params.callClusterAuthorizationIndex,
              refresh: 'wait_for',
              body: {
                param1: 'test',
              },
            });
            callClusterSuccess = true;
          } catch (e) {
            callClusterError = e;
          }
          // Saved objects client
          let savedObjectsClientSuccess = false;
          let savedObjectsClientError;
          try {
            await services.savedObjectsClient.get(
              params.savedObjectsClientType,
              params.savedObjectsClientId
            );
            savedObjectsClientSuccess = true;
          } catch (e) {
            savedObjectsClientError = e;
          }
          // Save the result
          await services.callCluster('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              state: {
                callClusterSuccess,
                callClusterError,
                savedObjectsClientSuccess,
                savedObjectsClientError,
              },
              params,
              reference: params.reference,
              source: 'action:test.authorization',
            },
          });
          return {
            status: 'ok',
            actionId: '',
          };
        },
      };
      server.plugins.actions.setup.registerType(noopActionType);
      server.plugins.actions.setup.registerType(indexRecordActionType);
      server.plugins.actions.setup.registerType(failingActionType);
      server.plugins.actions.setup.registerType(rateLimitedActionType);
      server.plugins.actions.setup.registerType(authorizationActionType);

      // Alert types
      const alwaysFiringAlertType: AlertType = {
        id: 'test.always-firing',
        name: 'Test: Always Firing',
        actionGroups: ['default', 'other'],
        async executor(alertExecutorOptions: AlertExecutorOptions) {
          const {
            services,
            params,
            state,
            alertId,
            spaceId,
            namespace,
            name,
            tags,
            createdBy,
            updatedBy,
          } = alertExecutorOptions;
          let group = 'default';
          const alertInfo = { alertId, spaceId, namespace, name, tags, createdBy, updatedBy };

          if (params.groupsToScheduleActionsInSeries) {
            const index = state.groupInSeriesIndex || 0;
            group = params.groupsToScheduleActionsInSeries[index];
          }

          if (group) {
            services
              .alertInstanceFactory('1')
              .replaceState({ instanceStateValue: true })
              .scheduleActions(group, {
                instanceContextValue: true,
              });
          }
          await services.callCluster('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              state,
              params,
              reference: params.reference,
              source: 'alert:test.always-firing',
              alertInfo,
            },
          });
          return {
            globalStateValue: true,
            groupInSeriesIndex: (state.groupInSeriesIndex || 0) + 1,
          };
        },
      };
      const neverFiringAlertType: AlertType = {
        id: 'test.never-firing',
        name: 'Test: Never firing',
        actionGroups: [],
        async executor({ services, params, state }: AlertExecutorOptions) {
          await services.callCluster('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              state,
              params,
              reference: params.reference,
              source: 'alert:test.never-firing',
            },
          });
          return {
            globalStateValue: true,
          };
        },
      };
      const failingAlertType: AlertType = {
        id: 'test.failing',
        name: 'Test: Failing',
        actionGroups: [],
        async executor({ services, params, state }: AlertExecutorOptions) {
          await services.callCluster('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              state,
              params,
              reference: params.reference,
              source: 'alert:test.failing',
            },
          });
          throw new Error('Failed to execute alert type');
        },
      };
      const authorizationAlertType: AlertType = {
        id: 'test.authorization',
        name: 'Test: Authorization',
        actionGroups: [],
        validate: {
          params: schema.object({
            callClusterAuthorizationIndex: schema.string(),
            savedObjectsClientType: schema.string(),
            savedObjectsClientId: schema.string(),
            index: schema.string(),
            reference: schema.string(),
          }),
        },
        async executor({ services, params, state }: AlertExecutorOptions) {
          // Call cluster
          let callClusterSuccess = false;
          let callClusterError;
          try {
            await services.callCluster('index', {
              index: params.callClusterAuthorizationIndex,
              refresh: 'wait_for',
              body: {
                param1: 'test',
              },
            });
            callClusterSuccess = true;
          } catch (e) {
            callClusterError = e;
          }
          // Saved objects client
          let savedObjectsClientSuccess = false;
          let savedObjectsClientError;
          try {
            await services.savedObjectsClient.get(
              params.savedObjectsClientType,
              params.savedObjectsClientId
            );
            savedObjectsClientSuccess = true;
          } catch (e) {
            savedObjectsClientError = e;
          }
          // Save the result
          await services.callCluster('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              state: {
                callClusterSuccess,
                callClusterError,
                savedObjectsClientSuccess,
                savedObjectsClientError,
              },
              params,
              reference: params.reference,
              source: 'alert:test.authorization',
            },
          });
        },
      };
      const validationAlertType: AlertType = {
        id: 'test.validation',
        name: 'Test: Validation',
        actionGroups: [],
        validate: {
          params: schema.object({
            param1: schema.string(),
          }),
        },
        async executor({ services, params, state }: AlertExecutorOptions) {},
      };
      const noopAlertType: AlertType = {
        id: 'test.noop',
        name: 'Test: Noop',
        actionGroups: ['default'],
        async executor({ services, params, state }: AlertExecutorOptions) {},
      };
      server.plugins.alerting.setup.registerType(alwaysFiringAlertType);
      server.plugins.alerting.setup.registerType(neverFiringAlertType);
      server.plugins.alerting.setup.registerType(failingAlertType);
      server.plugins.alerting.setup.registerType(validationAlertType);
      server.plugins.alerting.setup.registerType(authorizationAlertType);
      server.plugins.alerting.setup.registerType(noopAlertType);
    },
  });
}
