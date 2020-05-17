/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { times } from 'lodash';
import { PluginSetupContract as ActionsPluginSetup } from '../../../../../../../plugins/actions/server/plugin';
import { PluginSetupContract as AlertingPluginSetup } from '../../../../../../../plugins/alerting/server/plugin';
import { EncryptedSavedObjectsPluginStart } from '../../../../../../../plugins/encrypted_saved_objects/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../../../../../../plugins/features/server';
import { ActionType, ActionTypeExecutorOptions } from '../../../../../../../plugins/actions/server';
import { AlertType, AlertExecutorOptions } from '../../../../../../../plugins/alerting/server';

interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
  actions: ActionsPluginSetup;
  alerting: AlertingPluginSetup;
}

interface FixtureStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  public setup(
    core: CoreSetup<FixtureStartDeps>,
    { features, actions, alerting }: FixtureSetupDeps
  ) {
    const clusterClient = core.elasticsearch.adminClient;
    features.registerFeature({
      id: 'alerting',
      name: 'Alerting',
      app: ['alerting', 'kibana'],
      privileges: {
        all: {
          app: ['alerting', 'kibana'],
          savedObject: {
            all: ['alert'],
            read: [],
          },
          ui: [],
          api: ['alerting-read', 'alerting-all'],
        },
        read: {
          app: ['alerting', 'kibana'],
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
      minimumLicenseRequired: 'gold',
      async executor() {
        return { status: 'ok', actionId: '' };
      },
    };
    const indexRecordActionType: ActionType = {
      id: 'test.index-record',
      name: 'Test: Index Record',
      minimumLicenseRequired: 'gold',
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
      minimumLicenseRequired: 'gold',
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
      minimumLicenseRequired: 'gold',
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
      minimumLicenseRequired: 'gold',
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
        // Call scoped cluster
        const callScopedCluster = services.getScopedCallCluster(clusterClient);
        let callScopedClusterSuccess = false;
        let callScopedClusterError;
        try {
          await callScopedCluster('index', {
            index: params.callClusterAuthorizationIndex,
            refresh: 'wait_for',
            body: {
              param1: 'test',
            },
          });
          callScopedClusterSuccess = true;
        } catch (e) {
          callScopedClusterError = e;
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
              callScopedClusterSuccess,
              callScopedClusterError,
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
    actions.registerType(noopActionType);
    actions.registerType(indexRecordActionType);
    actions.registerType(failingActionType);
    actions.registerType(rateLimitedActionType);
    actions.registerType(authorizationActionType);

    const alwaysFiringAlertType: AlertType = {
      id: 'test.always-firing',
      name: 'Test: Always Firing',
      actionGroups: [
        { id: 'default', name: 'Default' },
        { id: 'other', name: 'Other' },
      ],
      producer: 'alerting',
      defaultActionGroupId: 'default',
      actionVariables: {
        state: [{ name: 'instanceStateValue', description: 'the instance state value' }],
        context: [{ name: 'instanceContextValue', description: 'the instance context value' }],
      },
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
      producer: 'alerting',
      defaultActionGroupId: 'default',
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
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      producer: 'alerting',
      defaultActionGroupId: 'default',
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
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      producer: 'alerting',
      defaultActionGroupId: 'default',
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
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      producer: 'alerting',
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
        // Call scoped cluster
        const callScopedCluster = services.getScopedCallCluster(clusterClient);
        let callScopedClusterSuccess = false;
        let callScopedClusterError;
        try {
          await callScopedCluster('index', {
            index: params.callClusterAuthorizationIndex,
            refresh: 'wait_for',
            body: {
              param1: 'test',
            },
          });
          callScopedClusterSuccess = true;
        } catch (e) {
          callScopedClusterError = e;
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
              callScopedClusterSuccess,
              callScopedClusterError,
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
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      producer: 'alerting',
      defaultActionGroupId: 'default',
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
      producer: 'alerting',
      defaultActionGroupId: 'default',
      async executor({ services, params, state }: AlertExecutorOptions) {},
    };
    const onlyContextVariablesAlertType: AlertType = {
      id: 'test.onlyContextVariables',
      name: 'Test: Only Context Variables',
      actionGroups: [{ id: 'default', name: 'Default' }],
      producer: 'alerting',
      defaultActionGroupId: 'default',
      actionVariables: {
        context: [{ name: 'aContextVariable', description: 'this is a context variable' }],
      },
      async executor(opts: AlertExecutorOptions) {},
    };
    const onlyStateVariablesAlertType: AlertType = {
      id: 'test.onlyStateVariables',
      name: 'Test: Only State Variables',
      actionGroups: [{ id: 'default', name: 'Default' }],
      producer: 'alerting',
      defaultActionGroupId: 'default',
      actionVariables: {
        state: [{ name: 'aStateVariable', description: 'this is a state variable' }],
      },
      async executor(opts: AlertExecutorOptions) {},
    };
    alerting.registerType(alwaysFiringAlertType);
    alerting.registerType(cumulativeFiringAlertType);
    alerting.registerType(neverFiringAlertType);
    alerting.registerType(failingAlertType);
    alerting.registerType(validationAlertType);
    alerting.registerType(authorizationAlertType);
    alerting.registerType(noopAlertType);
    alerting.registerType(onlyContextVariablesAlertType);
    alerting.registerType(onlyStateVariablesAlertType);
  }

  public start() {}
  public stop() {}
}
