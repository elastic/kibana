/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { times } from 'lodash';
import { schema } from '@kbn/config-schema';
import { AlertExecutorOptions, AlertType } from '../../../../../../plugins/alerting/server';
import { ActionTypeExecutorOptions, ActionType } from '../../../../../../plugins/actions/server';

// eslint-disable-next-line import/no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    require: ['xpack_main', 'actions', 'alerting', 'elasticsearch'],
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
        async executor({ config, secrets, params, services, actionId }: ActionTypeExecutorOptions) {
          await services.callCluster('index', {
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
          return { status: 'ok', actionId };
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
          throw new Error(`expected failure for ${params.index} ${params.reference}`);
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
        async executor({ params, services, actionId }: ActionTypeExecutorOptions) {
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
            actionId,
            status: 'ok',
          };
        },
      };
      server.newPlatform.setup.plugins.actions.registerType(noopActionType);
      server.newPlatform.setup.plugins.actions.registerType(indexRecordActionType);
      server.newPlatform.setup.plugins.actions.registerType(failingActionType);
      server.newPlatform.setup.plugins.actions.registerType(rateLimitedActionType);
      server.newPlatform.setup.plugins.actions.registerType(authorizationActionType);

      // Alert types
      const alwaysFiringAlertType: AlertType = {
        id: 'test.always-firing',
        name: 'Test: Always Firing',
        actionGroups: [
          { id: 'default', name: 'Default' },
          { id: 'other', name: 'Other' },
        ],
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
      // Alert types
      const cumulativeFiringAlertType: AlertType = {
        id: 'test.cumulative-firing',
        name: 'Test: Cumulative Firing',
        actionGroups: [
          { id: 'default', name: 'Default' },
          { id: 'other', name: 'Other' },
        ],
        async executor(alertExecutorOptions: AlertExecutorOptions) {
          const { services, state } = alertExecutorOptions;
          const group = 'default';

          const runCount = (state.runCount || 0) + 1;

          times(runCount, index => {
            services
              .alertInstanceFactory(`instance-${index}`)
              .replaceState({ instanceStateValue: true })
              .scheduleActions(group);
          });

          return {
            runCount,
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
        actionGroups: [{ id: 'default', name: 'Default' }],
        async executor({ services, params, state }: AlertExecutorOptions) {},
      };
      server.newPlatform.setup.plugins.alerting.registerType(alwaysFiringAlertType);
      server.newPlatform.setup.plugins.alerting.registerType(cumulativeFiringAlertType);
      server.newPlatform.setup.plugins.alerting.registerType(neverFiringAlertType);
      server.newPlatform.setup.plugins.alerting.registerType(failingAlertType);
      server.newPlatform.setup.plugins.alerting.registerType(validationAlertType);
      server.newPlatform.setup.plugins.alerting.registerType(authorizationAlertType);
      server.newPlatform.setup.plugins.alerting.registerType(noopAlertType);
    },
  });
}
