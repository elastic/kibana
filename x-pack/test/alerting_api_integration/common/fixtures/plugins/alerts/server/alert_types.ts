/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { times } from 'lodash';
import { FixtureStartDeps, FixtureSetupDeps } from './plugin';
import { AlertType, AlertExecutorOptions } from '../../../../../../../plugins/alerts/server';

export function defineAlertTypes(
  core: CoreSetup<FixtureStartDeps>,
  { alerts }: Pick<FixtureSetupDeps, 'alerts'>
) {
  const clusterClient = core.elasticsearch.legacy.client;
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

      times(runCount, (index) => {
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
  alerts.registerType(alwaysFiringAlertType);
  alerts.registerType(cumulativeFiringAlertType);
  alerts.registerType(neverFiringAlertType);
  alerts.registerType(failingAlertType);
  alerts.registerType(validationAlertType);
  alerts.registerType(authorizationAlertType);
  alerts.registerType(noopAlertType);
  alerts.registerType(onlyContextVariablesAlertType);
  alerts.registerType(onlyStateVariablesAlertType);
}
