/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'src/core/server';
import { schema, TypeOf } from '@kbn/config-schema';
import { curry, times } from 'lodash';
import { ES_TEST_INDEX_NAME } from '../../../../lib';
import { FixtureStartDeps, FixtureSetupDeps } from './plugin';
import {
  RuleType,
  AlertInstanceState,
  AlertInstanceContext,
  RuleTypeState,
  RuleTypeParams,
} from '../../../../../../../plugins/alerting/server';

export const EscapableStrings = {
  escapableBold: '*bold*',
  escapableBacktic: 'back`tic',
  escapableBackticBold: '`*bold*`',
  escapableHtml: '<&>',
  escapableDoubleQuote: '"double quote"',
  escapableLineFeed: 'line\x0afeed',
};

export const DeepContextVariables = {
  objectA: {
    stringB: 'B',
    arrayC: [
      { stringD: 'D1', numberE: 42 },
      { stringD: 'D2', numberE: 43 },
    ],
    objectF: {
      stringG: 'G',
      nullG: null,
      undefinedG: undefined,
    },
  },
  stringH: 'H',
  arrayI: [44, 45],
  nullJ: null,
  undefinedK: undefined,
};

function getAlwaysFiringAlertType() {
  const paramsSchema = schema.object({
    index: schema.string(),
    reference: schema.string(),
    groupsToScheduleActionsInSeries: schema.maybe(schema.arrayOf(schema.nullable(schema.string()))),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  interface State extends RuleTypeState {
    groupInSeriesIndex?: number;
  }
  interface InstanceState extends AlertInstanceState {
    instanceStateValue: boolean;
  }
  interface InstanceContext extends AlertInstanceContext {
    instanceContextValue: boolean;
  }
  const result: RuleType<
    ParamsType & RuleTypeParams,
    never, // Only use if defining useSavedObjectReferences hook
    State,
    InstanceState,
    InstanceContext,
    'default' | 'other'
  > = {
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
    minimumLicenseRequired: 'basic',
    isExportable: true,
    actionVariables: {
      state: [{ name: 'instanceStateValue', description: 'the instance state value' }],
      params: [{ name: 'instanceParamsValue', description: 'the instance params value' }],
      context: [{ name: 'instanceContextValue', description: 'the instance context value' }],
    },
    executor: curry(alwaysFiringExecutor)(),
  };
  return result;
}

async function alwaysFiringExecutor(alertExecutorOptions: any) {
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
    rule,
  } = alertExecutorOptions;
  let group: string | null = 'default';
  let subgroup: string | null = null;
  const alertInfo = { alertId, spaceId, namespace, name, tags, createdBy, updatedBy, ...rule };

  if (params.groupsToScheduleActionsInSeries) {
    const index = state.groupInSeriesIndex || 0;
    const [scheduledGroup, scheduledSubgroup] = (
      params.groupsToScheduleActionsInSeries[index] ?? ''
    ).split(':');

    group = scheduledGroup;
    subgroup = scheduledSubgroup;
  }

  if (group) {
    const instance = services.alertFactory.create('1').replaceState({ instanceStateValue: true });

    if (subgroup) {
      instance.scheduleActionsWithSubGroup(group, subgroup, {
        instanceContextValue: true,
      });
    } else {
      instance.scheduleActions(group, {
        instanceContextValue: true,
      });
    }
  }

  await services.scopedClusterClient.asCurrentUser.index({
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
}

function getCumulativeFiringAlertType() {
  interface State extends RuleTypeState {
    runCount?: number;
  }
  interface InstanceState extends AlertInstanceState {
    instanceStateValue: boolean;
  }
  const result: RuleType<{}, {}, State, InstanceState, {}, 'default' | 'other'> = {
    id: 'test.cumulative-firing',
    name: 'Test: Cumulative Firing',
    actionGroups: [
      { id: 'default', name: 'Default' },
      { id: 'other', name: 'Other' },
    ],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor(alertExecutorOptions) {
      const { services, state } = alertExecutorOptions;
      const group = 'default';

      const runCount = (state.runCount || 0) + 1;

      times(runCount, (index) => {
        services.alertFactory
          .create(`instance-${index}`)
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
  interface State extends RuleTypeState {
    globalStateValue: boolean;
  }
  const result: RuleType<ParamsType, never, State, {}, {}, 'default'> = {
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
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor({ services, params, state }) {
      await services.scopedClusterClient.asCurrentUser.index({
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
  const result: RuleType<ParamsType, never, {}, {}, {}, 'default'> = {
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
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor({ services, params, state }) {
      await services.scopedClusterClient.asCurrentUser.index({
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
  const paramsSchema = schema.object({
    callClusterAuthorizationIndex: schema.string(),
    savedObjectsClientType: schema.string(),
    savedObjectsClientId: schema.string(),
    index: schema.string(),
    reference: schema.string(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  const result: RuleType<ParamsType, never, {}, {}, {}, 'default'> = {
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
    minimumLicenseRequired: 'basic',
    isExportable: true,
    validate: {
      params: paramsSchema,
    },
    async executor({ services, params, state }) {
      // Call cluster
      let callClusterSuccess = false;
      let callClusterError;
      try {
        await services.scopedClusterClient.asCurrentUser.index({
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
      const scopedClusterClient = services.scopedClusterClient;
      let callScopedClusterSuccess = false;
      let callScopedClusterError;
      try {
        await scopedClusterClient.asCurrentUser.index({
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
      await services.scopedClusterClient.asCurrentUser.index({
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
  const result: RuleType<ParamsType, never, {}, {}, {}, 'default'> = {
    id: 'test.validation',
    name: 'Test: Validation',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    producer: 'alertsFixture',
    minimumLicenseRequired: 'basic',
    isExportable: true,
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
    pattern: schema.recordOf(
      schema.string(),
      schema.arrayOf(schema.oneOf([schema.boolean(), schema.string()]))
    ),
    reference: schema.maybe(schema.string()),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  interface State extends RuleTypeState {
    patternIndex?: number;
  }
  const result: RuleType<ParamsType, never, State, {}, {}, 'default'> = {
    id: 'test.patternFiring',
    name: 'Test: Firing on a Pattern',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor(alertExecutorOptions) {
      const { services, state, params } = alertExecutorOptions;
      const pattern = params.pattern;
      if (typeof pattern !== 'object') throw new Error('pattern is not an object');
      let maxPatternLength = 0;
      for (const [instanceId, instancePattern] of Object.entries(pattern)) {
        if (!Array.isArray(instancePattern)) {
          throw new Error(`pattern for instance ${instanceId} is not an array`);
        }
        maxPatternLength = Math.max(maxPatternLength, instancePattern.length);
      }

      if (params.reference) {
        await services.scopedClusterClient.asCurrentUser.index({
          index: ES_TEST_INDEX_NAME,
          refresh: 'wait_for',
          body: {
            reference: params.reference,
            source: 'alert:test.patternFiring',
            ...alertExecutorOptions,
          },
        });
      }

      // get the pattern index, return if past it
      const patternIndex = state.patternIndex ?? 0;
      if (patternIndex >= maxPatternLength) {
        return { patternIndex };
      }

      // fire if pattern says to
      for (const [instanceId, instancePattern] of Object.entries(pattern)) {
        const scheduleByPattern = instancePattern[patternIndex];
        if (scheduleByPattern === true) {
          services.alertFactory.create(instanceId).scheduleActions('default', {
            ...EscapableStrings,
            deep: DeepContextVariables,
          });
        } else if (typeof scheduleByPattern === 'string') {
          services.alertFactory
            .create(instanceId)
            .scheduleActionsWithSubGroup('default', scheduleByPattern);
        }
      }

      return {
        patternIndex: patternIndex + 1,
      };
    },
  };
  return result;
}

function getPatternSuccessOrFailureAlertType() {
  const paramsSchema = schema.object({
    pattern: schema.arrayOf(schema.oneOf([schema.boolean(), schema.string()])),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  interface State extends RuleTypeState {
    patternIndex?: number;
  }
  const result: RuleType<ParamsType, never, State, {}, {}, 'default'> = {
    id: 'test.patternSuccessOrFailure',
    name: 'Test: Succeeding or failing on a Pattern',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor(alertExecutorOptions) {
      const { state, params } = alertExecutorOptions;
      const pattern = params.pattern;
      if (!Array.isArray(pattern)) throw new Error('pattern is not an array');

      // get the pattern index, return if past it
      const patternIndex = state.patternIndex ?? 0;
      if (patternIndex >= pattern.length) {
        return { patternIndex };
      }

      if (!pattern[patternIndex]) {
        throw new Error('Failed to execute alert type');
      }

      return {
        patternIndex: patternIndex + 1,
      };
    },
  };
  return result;
}

function getLongRunningPatternRuleType(cancelAlertsOnRuleTimeout: boolean = true) {
  let globalPatternIndex = 0;
  const paramsSchema = schema.object({
    pattern: schema.arrayOf(schema.boolean()),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  interface State extends RuleTypeState {
    patternIndex?: number;
  }
  const result: RuleType<ParamsType, never, State, {}, {}, 'default'> = {
    id: `test.patternLongRunning${
      cancelAlertsOnRuleTimeout === true ? '.cancelAlertsOnRuleTimeout' : ''
    }`,
    name: 'Test: Run Long on a Pattern',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    ruleTaskTimeout: '3s',
    cancelAlertsOnRuleTimeout,
    async executor(ruleExecutorOptions) {
      const { services, params } = ruleExecutorOptions;
      const pattern = params.pattern;
      if (!Array.isArray(pattern)) {
        throw new Error(`pattern is not an array`);
      }

      // get the pattern index, return if past it
      if (globalPatternIndex >= pattern.length) {
        globalPatternIndex = 0;
        return {};
      }

      services.alertFactory.create('alert').scheduleActions('default', {});

      // run long if pattern says to
      if (pattern[globalPatternIndex++] === true) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
      return {};
    },
  };
  return result;
}

function getCancellableRuleType() {
  const paramsSchema = schema.object({
    doLongSearch: schema.boolean(),
    doLongPostProcessing: schema.boolean(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  const result: RuleType<ParamsType, never, {}, {}, {}, 'default'> = {
    id: 'test.cancellableRule',
    name: 'Test: Rule That Implements Cancellation',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    ruleTaskTimeout: '3s',
    async executor(ruleExecutorOptions) {
      const { services, params } = ruleExecutorOptions;
      const doLongSearch = params.doLongSearch;
      const doLongPostProcessing = params.doLongPostProcessing;

      const aggs = doLongSearch
        ? {
            delay: {
              shard_delay: {
                value: '10s',
              },
            },
          }
        : {};

      const query = {
        index: ES_TEST_INDEX_NAME,
        body: {
          query: {
            bool: {
              filter: {
                match_all: {},
              },
            },
          },
          ...(aggs ? { aggs } : {}),
        },
      };

      await services.scopedClusterClient.asCurrentUser.search(query as any);

      if (doLongPostProcessing) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }

      if (services.shouldStopExecution()) {
        throw new Error('execution short circuited!');
      }
    },
  };
  return result;
}

export function defineAlertTypes(
  core: CoreSetup<FixtureStartDeps>,
  { alerting }: Pick<FixtureSetupDeps, 'alerting'>
) {
  const noopAlertType: RuleType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.noop',
    name: 'Test: Noop',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor() {},
  };
  const goldNoopAlertType: RuleType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.gold.noop',
    name: 'Test: Noop',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'gold',
    isExportable: true,
    async executor() {},
  };
  const onlyContextVariablesAlertType: RuleType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.onlyContextVariables',
    name: 'Test: Only Context Variables',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    actionVariables: {
      context: [{ name: 'aContextVariable', description: 'this is a context variable' }],
    },
    async executor() {},
  };
  const onlyStateVariablesAlertType: RuleType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.onlyStateVariables',
    name: 'Test: Only State Variables',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    actionVariables: {
      state: [{ name: 'aStateVariable', description: 'this is a state variable' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor() {},
  };
  const throwAlertType: RuleType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.throw',
    name: 'Test: Throw',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor() {
      throw new Error('this alert is intended to fail');
    },
  };
  function getLongRunningRuleType() {
    const paramsSchema = schema.object({
      delay: schema.maybe(schema.number({ defaultValue: 5000 })),
    });
    type ParamsType = TypeOf<typeof paramsSchema>;

    const result: RuleType<ParamsType, {}, {}, {}, {}, 'default'> = {
      id: 'test.longRunning',
      name: 'Test: Long Running',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      producer: 'alertsFixture',
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      async executor(ruleExecutorOptions) {
        const { params } = ruleExecutorOptions;
        await new Promise((resolve) => setTimeout(resolve, params.delay ?? 5000));
      },
    };
    return result;
  }
  const exampleAlwaysFiringAlertType: RuleType<{}, {}, {}, {}, {}, 'small' | 'medium' | 'large'> = {
    id: 'example.always-firing',
    name: 'Always firing',
    actionGroups: [
      { id: 'small', name: 'Small t-shirt' },
      { id: 'medium', name: 'Medium t-shirt' },
      { id: 'large', name: 'Large t-shirt' },
    ],
    defaultActionGroupId: 'small',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor() {},
    producer: 'alertsFixture',
  };
  const multipleSearchesRuleType: RuleType<
    { numSearches: number; delay: string },
    {},
    {},
    {},
    {},
    'default'
  > = {
    id: 'test.multipleSearches',
    name: 'Test: MultipleSearches',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor(ruleExecutorOptions) {
      const { services, params } = ruleExecutorOptions;
      const numSearches = params.numSearches ?? 1;
      const delay = params.delay ?? '10s';

      const query = {
        index: ES_TEST_INDEX_NAME,
        body: {
          query: {
            bool: {
              filter: {
                match_all: {},
              },
            },
          },
          aggs: {
            delay: {
              shard_delay: {
                value: delay,
              },
            },
          },
        },
      };

      let i: number = 0;
      for (i = 0; i < numSearches; ++i) {
        await services.scopedClusterClient.asCurrentUser.search(query as any);
      }
    },
  };

  alerting.registerType(getAlwaysFiringAlertType());
  alerting.registerType(getCumulativeFiringAlertType());
  alerting.registerType(getNeverFiringAlertType());
  alerting.registerType(getFailingAlertType());
  alerting.registerType(getValidationAlertType());
  alerting.registerType(getAuthorizationAlertType(core));
  alerting.registerType(noopAlertType);
  alerting.registerType(onlyContextVariablesAlertType);
  alerting.registerType(onlyStateVariablesAlertType);
  alerting.registerType(getPatternFiringAlertType());
  alerting.registerType(throwAlertType);
  alerting.registerType(getLongRunningRuleType());
  alerting.registerType(goldNoopAlertType);
  alerting.registerType(exampleAlwaysFiringAlertType);
  alerting.registerType(multipleSearchesRuleType);
  alerting.registerType(getLongRunningPatternRuleType());
  alerting.registerType(getLongRunningPatternRuleType(false));
  alerting.registerType(getCancellableRuleType());
  alerting.registerType(getPatternSuccessOrFailureAlertType());
}
