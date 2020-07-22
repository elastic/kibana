/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { schema, TypeOf } from '@kbn/config-schema';
import { times } from 'lodash';
import { FixtureStartDeps, FixtureSetupDeps } from './plugin';
import { AlertType } from '../../../../../../../plugins/alerts/server';

export function defineAlertTypes(
  core: CoreSetup<FixtureStartDeps>,
  { alerts }: Pick<FixtureSetupDeps, 'alerts'>
) {
  // Alert types
  const noopAlertType: AlertType = {
    id: 'test.noop',
    name: 'Test: Noop',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    async executor() {},
  };
  const onlyContextVariablesAlertType: AlertType = {
    id: 'test.onlyContextVariables',
    name: 'Test: Only Context Variables',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    actionVariables: {
      context: [{ name: 'aContextVariable', description: 'this is a context variable' }],
    },
    async executor() {},
  };
  const onlyStateVariablesAlertType: AlertType = {
    id: 'test.onlyStateVariables',
    name: 'Test: Only State Variables',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    actionVariables: {
      state: [{ name: 'aStateVariable', description: 'this is a state variable' }],
    },
    async executor() {},
  };
  const throwAlertType: AlertType = {
    id: 'test.throw',
    name: 'Test: Throw',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    producer: 'alerting',
    defaultActionGroupId: 'default',
    async executor() {
      throw new Error('this alert is intended to fail');
    },
  };

  alerts.registerType(getAlwaysFiringAlertType());
  alerts.registerType(getCumulativeFiringAlertType());
  alerts.registerType(getNeverFiringAlertType());
  alerts.registerType(getFailingAlertType());
  alerts.registerType(getValidationAlertType());
  alerts.registerType(getAuthorizationAlertType(core));
  alerts.registerType(noopAlertType);
  alerts.registerType(onlyContextVariablesAlertType);
  alerts.registerType(onlyStateVariablesAlertType);
  alerts.registerType(getPatternFiringAlertType());
  alerts.registerType(throwAlertType);
}

function getAlwaysFiringAlertType() {
  const paramsSchema = schema.object({
    index: schema.string(),
    reference: schema.string(),
    groupsToScheduleActionsInSeries: schema.arrayOf(schema.nullable(schema.string())),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  interface State {
    groupInSeriesIndex?: number;
  }
  interface InstanceState {
    instanceStateValue: boolean;
  }
  interface InstanceContext {
    instanceContextValue: boolean;
  }
  const result: AlertType<ParamsType, State, InstanceState, InstanceContext> = {
    id: 'test.always-firing',
    name: 'Test: Always Firing',
    actionGroups: [
      { id: 'default', name: 'Default' },
      { id: 'other', name: 'Other' },
    ],
    validate: {
      params: paramsSchema,
    },
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    actionVariables: {
      state: [{ name: 'instanceStateValue', description: 'the instance state value' }],
      context: [{ name: 'instanceContextValue', description: 'the instance context value' }],
    },
    async executor(alertExecutorOptions) {
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
      let group: string | null = 'default';
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
  return result;
}

function getCumulativeFiringAlertType() {
  interface State {
    runCount?: number;
  }
  interface InstanceState {
    instanceStateValue: boolean;
  }
  const result: AlertType<{}, State, InstanceState, {}> = {
    id: 'test.cumulative-firing',
    name: 'Test: Cumulative Firing',
    actionGroups: [
      { id: 'default', name: 'Default' },
      { id: 'other', name: 'Other' },
    ],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    async executor(alertExecutorOptions) {
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
  return result;
}

function getNeverFiringAlertType() {
  const paramsSchema = schema.object({
    index: schema.string(),
    reference: schema.string(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  interface State {
    globalStateValue: boolean;
  }
  const result: AlertType<ParamsType, State, {}, {}> = {
    id: 'test.never-firing',
    name: 'Test: Never firing',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    validate: {
      params: paramsSchema,
    },
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    async executor({ services, params, state }) {
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
  return result;
}

function getFailingAlertType() {
  const paramsSchema = schema.object({
    index: schema.string(),
    reference: schema.string(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  const result: AlertType<ParamsType, {}, {}, {}> = {
    id: 'test.failing',
    name: 'Test: Failing',
    validate: {
      params: paramsSchema,
    },
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    async executor({ services, params, state }) {
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
  return result;
}

function getAuthorizationAlertType(core: CoreSetup<FixtureStartDeps>) {
  const clusterClient = core.elasticsearch.legacy.client;
  const paramsSchema = schema.object({
    callClusterAuthorizationIndex: schema.string(),
    savedObjectsClientType: schema.string(),
    savedObjectsClientId: schema.string(),
    index: schema.string(),
    reference: schema.string(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  const result: AlertType<ParamsType, {}, {}, {}> = {
    id: 'test.authorization',
    name: 'Test: Authorization',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    producer: 'alertsFixture',
    validate: {
      params: paramsSchema,
    },
    async executor({ services, params, state }) {
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
      const scopedClusterClient = services.getLegacyScopedClusterClient(clusterClient);
      let callScopedClusterSuccess = false;
      let callScopedClusterError;
      try {
        await scopedClusterClient.callAsCurrentUser('index', {
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
  return result;
}

function getValidationAlertType() {
  const paramsSchema = schema.object({
    param1: schema.string(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  const result: AlertType<ParamsType, {}, {}, {}> = {
    id: 'test.validation',
    name: 'Test: Validation',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    validate: {
      params: paramsSchema,
    },
    async executor() {},
  };
  return result;
}

function getPatternFiringAlertType() {
  const paramsSchema = schema.object({
    pattern: schema.arrayOf(schema.boolean()),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  interface State {
    patternIndex?: number;
  }
  const result: AlertType<ParamsType, State, {}, {}> = {
    id: 'test.patternFiring',
    name: 'Test: Firing on a Pattern',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alerting',
    defaultActionGroupId: 'default',
    async executor(alertExecutorOptions) {
      const { services, state, params } = alertExecutorOptions;
      const pattern = params.pattern;
      if (!Array.isArray(pattern)) throw new Error('pattern is not an array');
      if (pattern.length === 0) throw new Error('pattern is empty');

      // get the pattern index, return if past it
      const patternIndex = state.patternIndex ?? 0;
      if (patternIndex > pattern.length) {
        return { patternIndex };
      }

      // fire if pattern says to
      if (pattern[patternIndex]) {
        services.alertInstanceFactory('instance').scheduleActions('default');
      }

      return {
        patternIndex: (patternIndex + 1) % pattern.length,
      };
    },
  };
  return result;
}
