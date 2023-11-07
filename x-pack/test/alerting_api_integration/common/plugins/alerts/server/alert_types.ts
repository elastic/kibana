/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@kbn/logging';
import { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import { schema, TypeOf } from '@kbn/config-schema';
import { curry, range, times } from 'lodash';
import {
  RuleType,
  AlertInstanceState,
  AlertInstanceContext,
  RuleTypeState,
  RuleTypeParams,
} from '@kbn/alerting-plugin/server';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { FixtureStartDeps, FixtureSetupDeps } from './plugin';

export const EscapableStrings = {
  escapableBold: '*bold*',
  escapableBacktic: 'back`tic',
  escapableBackticBold: '`*bold*`',
  escapableHtml: '<&>',
  escapableDoubleQuote: '"double quote"',
  escapableLineFeed: 'line\x0afeed',
  escapableLink: 'https://te_st.com/',
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
  dateL: '2023-04-20T04:13:17.858Z',
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
    category: 'kibana',
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
  const { services, params, state, spaceId, namespace, rule } = alertExecutorOptions;
  let group: string | null = 'default';
  const alertInfo = { spaceId, namespace, ...rule };

  if (params.groupsToScheduleActionsInSeries) {
    const index = state.groupInSeriesIndex || 0;
    const [scheduledGroup] = (params.groupsToScheduleActionsInSeries[index] ?? '').split(':');

    group = scheduledGroup;
  }

  if (group) {
    const instance = services.alertFactory.create('1').replaceState({ instanceStateValue: true });

    instance.scheduleActions(group, {
      instanceContextValue: true,
    });
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
    state: {
      globalStateValue: true,
      groupInSeriesIndex: (state.groupInSeriesIndex || 0) + 1,
    },
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
    category: 'kibana',
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
        state: {
          runCount,
        },
      };
    },
    validate: {
      params: schema.any(),
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
    category: 'kibana',
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
        state: {
          globalStateValue: true,
        },
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
    category: 'kibana',
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

function getExceedsAlertLimitRuleType() {
  const paramsSchema = schema.object({
    index: schema.string(),
    getsLimit: schema.boolean(),
    reportsLimitReached: schema.boolean(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  const result: RuleType<ParamsType, never, {}, {}, {}, 'default'> = {
    id: 'test.exceedsAlertLimit',
    name: 'Test: ExceedsAlertLimit',
    validate: {
      params: paramsSchema,
    },
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    category: 'kibana',
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor({ services, params, state }) {
      let limit: number | null = null;
      if (params.getsLimit) {
        limit = services.alertFactory.alertLimit.getValue();
      }

      const alertsToCreate = limit ? limit : 25;

      range(alertsToCreate)
        .map(() => uuidv4())
        .forEach((id: string) => {
          services.alertFactory.create(id).scheduleActions('default');
        });

      if (params.reportsLimitReached) {
        services.alertFactory.alertLimit.setLimitReached(true);
      }

      // Index something
      await services.scopedClusterClient.asCurrentUser.index({
        index: params.index,
        refresh: 'wait_for',
        body: {
          numAlerts: alertsToCreate,
        },
      });

      return { state: {} };
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
    category: 'kibana',
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

      return { state: {} };
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
    category: 'kibana',
    producer: 'alertsFixture',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    defaultActionGroupId: 'default',
    validate: {
      params: paramsSchema,
    },
    async executor() {
      return { state: {} };
    },
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
    category: 'kibana',
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
        return { state: { patternIndex } };
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
          services.alertFactory.create(instanceId).scheduleActions('default', scheduleByPattern);
        }
      }

      return {
        state: {
          patternIndex: patternIndex + 1,
        },
      };
    },
    validate: {
      params: paramsSchema,
    },
  };
  return result;
}

function getPatternFiringAlertsAsDataRuleType() {
  const paramsSchema = schema.object({
    pattern: schema.recordOf(
      schema.string(),
      schema.arrayOf(schema.oneOf([schema.boolean(), schema.string()]))
    ),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  interface State extends RuleTypeState {
    patternIndex?: number;
  }
  const result: RuleType<
    ParamsType,
    never,
    State,
    {},
    {},
    'default',
    'recovered',
    { patternIndex: number; instancePattern: boolean[] }
  > = {
    id: 'test.patternFiringAad',
    name: 'Test: Firing on a Pattern and writing Alerts as Data',
    actionGroups: [{ id: 'default', name: 'Default' }],
    category: 'kibana',
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    doesSetRecoveryContext: true,
    validate: {
      params: paramsSchema,
    },
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

      const alertsClient = services.alertsClient;
      if (!alertsClient) {
        throw new Error(`Expected alertsClient to be defined but it is not`);
      }

      // get the pattern index, return if past it
      const patternIndex = state.patternIndex ?? 0;
      if (patternIndex >= maxPatternLength) {
        return { state: { patternIndex } };
      }

      // fire if pattern says to
      for (const [instanceId, instancePattern] of Object.entries(pattern)) {
        const scheduleByPattern = instancePattern[patternIndex];
        if (scheduleByPattern === true) {
          alertsClient.report({
            id: instanceId,
            actionGroup: 'default',
            state: { patternIndex },
            payload: { patternIndex, instancePattern: instancePattern as boolean[] },
          });
        } else if (typeof scheduleByPattern === 'string') {
          alertsClient.report({
            id: instanceId,
            actionGroup: 'default',
            state: { patternIndex },
            payload: { patternIndex, instancePattern: [true] },
          });
        }
      }

      // set recovery payload
      for (const recoveredAlert of alertsClient.getRecoveredAlerts()) {
        alertsClient.setAlertData({
          id: recoveredAlert.alert.getId(),
          payload: { patternIndex: -1, instancePattern: [] },
        });
      }

      return {
        state: {
          patternIndex: patternIndex + 1,
        },
      };
    },
    alerts: {
      context: 'test.patternfiring',
      shouldWrite: true,
      mappings: {
        fieldMap: {
          patternIndex: {
            required: false,
            type: 'long',
          },
          instancePattern: {
            required: false,
            type: 'boolean',
            array: true,
          },
        },
      },
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
    category: 'kibana',
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
        return { state: { patternIndex } };
      }

      if (!pattern[patternIndex]) {
        throw new Error('Failed to execute alert type');
      }

      return {
        state: {
          patternIndex: patternIndex + 1,
        },
      };
    },
    validate: {
      params: paramsSchema,
    },
  };
  return result;
}

function getPatternFiringAutoRecoverFalseAlertType() {
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
    id: 'test.patternFiringAutoRecoverFalse',
    name: 'Test: Firing on a Pattern with Auto Recover: false',
    actionGroups: [{ id: 'default', name: 'Default' }],
    category: 'kibana',
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    autoRecoverAlerts: false,
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
            source: 'alert:test.patternFiringAutoRecoverFalse',
            ...alertExecutorOptions,
          },
        });
      }

      // get the pattern index, return if past it
      const patternIndex = state.patternIndex ?? 0;
      if (patternIndex >= maxPatternLength) {
        return { state: { patternIndex } };
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
          services.alertFactory.create(instanceId).scheduleActions('default', scheduleByPattern);
        }
      }

      return {
        state: {
          patternIndex: patternIndex + 1,
        },
      };
    },
    validate: {
      params: paramsSchema,
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
    category: 'kibana',
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
        return { state: {} };
      }

      services.alertFactory.create('alert').scheduleActions('default', {});

      // run long if pattern says to
      if (pattern[globalPatternIndex++] === true) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
      return { state: {} };
    },
    validate: {
      params: paramsSchema,
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
    category: 'kibana',
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

      return { state: {} };
    },
    validate: {
      params: paramsSchema,
    },
  };
  return result;
}

function getAlwaysFiringAlertAsDataRuleType(
  logger: Logger,
  { ruleRegistry }: Pick<FixtureSetupDeps, 'ruleRegistry'>
) {
  const paramsSchema = schema.object({
    index: schema.string(),
    reference: schema.string(),
  });

  const ruleDataClient = ruleRegistry.ruleDataService.initializeIndex({
    feature: AlertConsumers.OBSERVABILITY,
    registrationContext: 'observability.test.alerts',
    dataset: ruleRegistry.dataset.alerts,
    componentTemplateRefs: [],
    componentTemplates: [
      {
        name: 'mappings',
      },
    ],
  });

  const createLifecycleRuleType = ruleRegistry.createLifecycleRuleTypeFactory({
    logger,
    ruleDataClient,
  });

  return createLifecycleRuleType({
    id: 'test.always-firing-alert-as-data',
    name: 'Test: Always Firing Alert As Data',
    actionGroups: [{ id: 'default', name: 'Default' }],
    validate: {
      params: paramsSchema,
    },
    category: 'kibana',
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor(ruleExecutorOptions) {
      const { services, params, state, spaceId, namespace, rule } = ruleExecutorOptions;
      const ruleInfo = { spaceId, namespace, ...rule };

      services
        .alertWithLifecycle({
          id: '1',
          fields: {},
        })
        .scheduleActions('default');

      services
        .alertWithLifecycle({
          id: '2',
          fields: {},
        })
        .scheduleActions('default');

      await services.scopedClusterClient.asCurrentUser.index({
        index: params.index,
        refresh: 'wait_for',
        body: {
          state,
          params,
          reference: params.reference,
          source: 'rule:test.always-firing-alert-as-data',
          ruleInfo,
        },
      });

      return { state: {} };
    },
    alerts: {
      context: 'observability.test.alerts',
      mappings: {
        fieldMap: {},
      },
      useLegacyAlerts: true,
    },
  });
}

function getWaitingRuleType(logger: Logger) {
  const ParamsType = schema.object({
    source: schema.string(),
    alerts: schema.number(),
  });
  type ParamsType = TypeOf<typeof ParamsType>;
  interface State extends RuleTypeState {
    runCount?: number;
  }
  const id = 'test.waitingRule';

  const result: RuleType<
    ParamsType,
    never,
    State,
    {},
    {},
    'default',
    'recovered',
    { runCount: number }
  > = {
    id,
    name: 'Test: Rule that waits for a signal before finishing',
    actionGroups: [{ id: 'default', name: 'Default' }],
    category: 'kibana',
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    doesSetRecoveryContext: true,
    validate: { params: ParamsType },
    alerts: {
      context: id.toLowerCase(),
      shouldWrite: true,
      mappings: {
        fieldMap: {
          runCount: { required: false, type: 'long' },
        },
      },
    },
    async executor(alertExecutorOptions) {
      const { services, state, params } = alertExecutorOptions;
      const { source, alerts } = params;

      const alertsClient = services.alertsClient;
      if (!alertsClient) throw new Error(`Expected alertsClient!`);

      const runCount = (state.runCount || 0) + 1;
      const es = services.scopedClusterClient.asInternalUser;

      await sendSignal(logger, es, id, source, `rule-starting-${runCount}`);
      await waitForSignal(logger, es, id, source, `rule-complete-${runCount}`);

      for (let i = 0; i < alerts; i++) {
        alertsClient.report({
          id: `alert-${i}`,
          actionGroup: 'default',
          payload: { runCount },
        });
      }

      return { state: { runCount } };
    },
  };

  return result;
}

async function sendSignal(
  logger: Logger,
  es: ElasticsearchClient,
  id: string,
  source: string,
  reference: string
) {
  logger.info(`rule type ${id} sending signal ${reference}`);
  await es.index({ index: ES_TEST_INDEX_NAME, refresh: 'true', body: { source, reference } });
}

async function waitForSignal(
  logger: Logger,
  es: ElasticsearchClient,
  id: string,
  source: string,
  reference: string
) {
  let docs: unknown[] = [];
  for (let attempt = 0; attempt < 20; attempt++) {
    docs = await getSignalDocs(es, source, reference);
    if (docs.length > 0) {
      logger.info(`rule type ${id} received signal ${reference}`);
      break;
    }

    logger.info(`rule type ${id} waiting for signal ${reference}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (docs.length === 0) {
    throw new Error(`Expected to find docs with source ${source}`);
  }
}

async function getSignalDocs(es: ElasticsearchClient, source: string, reference: string) {
  const body = {
    query: {
      bool: {
        must: [
          {
            term: {
              source,
            },
          },
          {
            term: {
              reference,
            },
          },
        ],
      },
    },
  };
  const params = {
    index: ES_TEST_INDEX_NAME,
    size: 1000,
    _source: false,
    body,
  };
  const result = await es.search(params, { meta: true });
  return result?.body?.hits?.hits || [];
}

export function defineAlertTypes(
  core: CoreSetup<FixtureStartDeps>,
  { alerting, ruleRegistry }: Pick<FixtureSetupDeps, 'alerting' | 'ruleRegistry'>,
  logger: Logger
) {
  const noopAlertType: RuleType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.noop',
    name: 'Test: Noop',
    actionGroups: [{ id: 'default', name: 'Default' }],
    category: 'kibana',
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor() {
      return { state: {} };
    },
    validate: {
      params: schema.any(),
    },
  };
  const goldNoopAlertType: RuleType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.gold.noop',
    name: 'Test: Noop',
    actionGroups: [{ id: 'default', name: 'Default' }],
    category: 'kibana',
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'gold',
    isExportable: true,
    async executor() {
      return { state: {} };
    },
    validate: {
      params: schema.any(),
    },
  };
  const onlyContextVariablesAlertType: RuleType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.onlyContextVariables',
    name: 'Test: Only Context Variables',
    actionGroups: [{ id: 'default', name: 'Default' }],
    category: 'kibana',
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    actionVariables: {
      context: [{ name: 'aContextVariable', description: 'this is a context variable' }],
    },
    async executor() {
      return { state: {} };
    },
    validate: {
      params: schema.any(),
    },
  };
  const onlyStateVariablesAlertType: RuleType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.onlyStateVariables',
    name: 'Test: Only State Variables',
    actionGroups: [{ id: 'default', name: 'Default' }],
    category: 'kibana',
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    actionVariables: {
      state: [{ name: 'aStateVariable', description: 'this is a state variable' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor() {
      return { state: {} };
    },
    validate: {
      params: schema.any(),
    },
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
    category: 'kibana',
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor() {
      throw new Error('this alert is intended to fail');
    },
    validate: {
      params: schema.any(),
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
      category: 'kibana',
      producer: 'alertsFixture',
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      async executor(ruleExecutorOptions) {
        const { params } = ruleExecutorOptions;
        await new Promise((resolve) => setTimeout(resolve, params.delay ?? 5000));
        return { state: {} };
      },
      validate: {
        params: schema.any(),
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
    async executor() {
      return { state: {} };
    },
    category: 'kibana',
    producer: 'alertsFixture',
    validate: {
      params: schema.any(),
    },
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
    category: 'kibana',
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

      return { state: {} };
    },
    validate: {
      params: schema.object({ numSearches: schema.number(), delay: schema.string() }),
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
  alerting.registerType(getExceedsAlertLimitRuleType());
  alerting.registerType(getAlwaysFiringAlertAsDataRuleType(logger, { ruleRegistry }));
  alerting.registerType(getPatternFiringAutoRecoverFalseAlertType());
  alerting.registerType(getPatternFiringAlertsAsDataRuleType());
  alerting.registerType(getWaitingRuleType(logger));
}
