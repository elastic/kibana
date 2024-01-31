/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/server';
import { schema, TypeOf } from '@kbn/config-schema';
import { ActionType } from '@kbn/actions-plugin/server';
import { FixtureStartDeps, FixtureSetupDeps } from './plugin';
import {
  getTestSubActionConnector,
  getTestSubActionConnectorWithoutSubActions,
} from './sub_action_connector';

export function defineActionTypes(
  core: CoreSetup<FixtureStartDeps>,
  { actions }: Pick<FixtureSetupDeps, 'actions'>
) {
  // Action types
  const noopActionType: ActionType = {
    id: 'test.noop',
    name: 'Test: Noop',
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({}, { defaultValue: {} }) },
      secrets: { schema: schema.object({}, { defaultValue: {} }) },
      params: { schema: schema.object({}, { defaultValue: {} }) },
    },
    async executor() {
      return { status: 'ok', actionId: '' };
    },
  };

  const throwActionType: ActionType = {
    id: 'test.throw',
    name: 'Test: Throw',
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({}, { defaultValue: {} }) },
      secrets: { schema: schema.object({}, { defaultValue: {} }) },
      params: { schema: schema.object({}, { defaultValue: {} }) },
    },
    async executor() {
      // add a delay so the execution time is non-zero
      await new Promise((r) => setTimeout(r, 1000));
      throw new Error('this action is intended to fail');
    },
  };

  const cappedActionType: ActionType = {
    id: 'test.capped',
    name: 'Test: Capped',
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({}, { defaultValue: {} }) },
      secrets: { schema: schema.object({}, { defaultValue: {} }) },
      params: { schema: schema.object({}, { defaultValue: {} }) },
    },
    async executor() {
      return { status: 'ok', actionId: '' };
    },
  };

  actions.registerType(noopActionType);
  actions.registerType(throwActionType);
  actions.registerType(cappedActionType);
  actions.registerType(getIndexRecordActionType());
  actions.registerType(getDelayedActionType());
  actions.registerType(getFailingActionType());
  actions.registerType(getRateLimitedActionType());
  actions.registerType(getNoAttemptsRateLimitedActionType());
  actions.registerType(getAuthorizationActionType(core));
  actions.registerType(getExcludedActionType());

  /**
   * System actions
   */
  actions.registerType(getSystemActionType());
  actions.registerType(getSystemActionTypeWithKibanaPrivileges());
  actions.registerType(getSystemActionTypeWithConnectorAdapter());

  /** Sub action framework */

  actions.registerSubActionConnectorType(getTestSubActionConnector(actions));
  actions.registerSubActionConnectorType(getTestSubActionConnectorWithoutSubActions(actions));
}

function getIndexRecordActionType() {
  const paramsSchema = schema.object({
    index: schema.string(),
    reference: schema.string(),
    message: schema.string(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  const configSchema = schema.object({
    unencrypted: schema.string(),
  });
  type ConfigType = TypeOf<typeof configSchema>;
  const secretsSchema = schema.object({
    encrypted: schema.string(),
  });
  type SecretsType = TypeOf<typeof secretsSchema>;
  const result: ActionType<ConfigType, SecretsType, ParamsType> = {
    id: 'test.index-record',
    name: 'Test: Index Record',
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting'],
    validate: {
      params: {
        schema: paramsSchema,
      },
      config: {
        schema: configSchema,
      },
      secrets: {
        schema: secretsSchema,
      },
    },
    async executor({ config, secrets, params, services, actionId }) {
      await services.scopedClusterClient.index({
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
  return result;
}

function getDelayedActionType() {
  const paramsSchema = schema.object({
    delayInMs: schema.number({ defaultValue: 1000 }),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  const configSchema = schema.object({
    unencrypted: schema.string(),
  });
  type ConfigType = TypeOf<typeof configSchema>;
  const secretsSchema = schema.object({
    encrypted: schema.string(),
  });
  type SecretsType = TypeOf<typeof secretsSchema>;
  const result: ActionType<ConfigType, SecretsType, ParamsType> = {
    id: 'test.delayed',
    name: 'Test: Delayed',
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting'],
    validate: {
      params: {
        schema: paramsSchema,
      },
      config: {
        schema: configSchema,
      },
      secrets: {
        schema: secretsSchema,
      },
    },
    async executor({ config, secrets, params, services, actionId }) {
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, params.delayInMs);
      });
      return { status: 'ok', actionId };
    },
  };
  return result;
}

function getFailingActionType() {
  const paramsSchema = schema.object({
    index: schema.string(),
    reference: schema.string(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  const result: ActionType<{}, {}, ParamsType> = {
    id: 'test.failing',
    name: 'Test: Failing',
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({}, { defaultValue: {} }) },
      secrets: { schema: schema.object({}, { defaultValue: {} }) },
      params: {
        schema: paramsSchema,
      },
    },
    async executor({ config, secrets, params, services }) {
      await services.scopedClusterClient.index({
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
  return result;
}

function getRateLimitedActionType() {
  const paramsSchema = schema.object({
    index: schema.string(),
    reference: schema.string(),
    retryAt: schema.number(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  const result: ActionType<{}, {}, ParamsType> = {
    id: 'test.rate-limit',
    name: 'Test: Rate Limit',
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting'],
    maxAttempts: 2,
    validate: {
      config: { schema: schema.object({}, { defaultValue: {} }) },
      secrets: { schema: schema.object({}, { defaultValue: {} }) },
      params: {
        schema: paramsSchema,
      },
    },
    async executor({ config, params, services }) {
      await services.scopedClusterClient.index({
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
  return result;
}

function getNoAttemptsRateLimitedActionType() {
  const paramsSchema = schema.object({
    index: schema.string(),
    reference: schema.string(),
    retryAt: schema.number(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  const result: ActionType<{}, {}, ParamsType> = {
    id: 'test.no-attempts-rate-limit',
    name: 'Test: Rate Limit',
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting'],
    maxAttempts: 0,
    validate: {
      config: { schema: schema.object({}, { defaultValue: {} }) },
      secrets: { schema: schema.object({}, { defaultValue: {} }) },
      params: {
        schema: paramsSchema,
      },
    },
    async executor({ config, params, services }) {
      await services.scopedClusterClient.index({
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
        message: 'intentional failure from action',
        retry: new Date(params.retryAt),
        actionId: '',
      };
    },
  };
  return result;
}

function getAuthorizationActionType(core: CoreSetup<FixtureStartDeps>) {
  const paramsSchema = schema.object({
    callClusterAuthorizationIndex: schema.string(),
    savedObjectsClientType: schema.string(),
    savedObjectsClientId: schema.string(),
    index: schema.string(),
    reference: schema.string(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  const result: ActionType<{}, {}, ParamsType> = {
    id: 'test.authorization',
    name: 'Test: Authorization',
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({}, { defaultValue: {} }) },
      secrets: { schema: schema.object({}, { defaultValue: {} }) },
      params: {
        schema: paramsSchema,
      },
    },
    async executor({ params, services, actionId }) {
      // Call cluster
      let callClusterSuccess = false;
      let callClusterError;
      try {
        await services.scopedClusterClient.index({
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
        await scopedClusterClient.index({
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
      await services.scopedClusterClient.index({
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
  return result;
}

function getExcludedActionType() {
  const result: ActionType<{}, {}, {}, void> = {
    id: 'test.excluded',
    name: 'Test: Excluded',
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({}, { defaultValue: {} }) },
      secrets: { schema: schema.object({}, { defaultValue: {} }) },
      params: { schema: schema.object({}, { defaultValue: {} }) },
    },
    async executor({ actionId }) {
      return { status: 'ok', actionId };
    },
  };
  return result;
}

function getSystemActionType() {
  const result: ActionType<{}, {}, {}> = {
    id: 'test.system-action',
    name: 'Test system action',
    minimumLicenseRequired: 'platinum',
    supportedFeatureIds: ['alerting'],
    validate: {
      params: {
        schema: schema.any(),
      },
      config: {
        schema: schema.any(),
      },
      secrets: {
        schema: schema.any(),
      },
    },
    isSystemActionType: true,
    async executor({ config, secrets, params, services, actionId }) {
      return { status: 'ok', actionId };
    },
  };

  return result;
}

function getSystemActionTypeWithKibanaPrivileges() {
  const result: ActionType<{}, {}, { index?: string; reference?: string }> = {
    id: 'test.system-action-kibana-privileges',
    name: 'Test system action with kibana privileges',
    minimumLicenseRequired: 'platinum',
    supportedFeatureIds: ['alerting'],
    /**
     * Requires all access to the case feature
     * in Stack management
     */
    getKibanaPrivileges: () => ['cases:cases/createCase'],
    validate: {
      params: {
        schema: schema.any(),
      },
      config: {
        schema: schema.any(),
      },
      secrets: {
        schema: schema.any(),
      },
    },
    isSystemActionType: true,
    /**
     * The executor writes a doc to the
     * testing index. The test uses the doc
     * to verify that the action is executed
     * correctly
     */
    async executor({ params, services, actionId }) {
      const { index, reference } = params;

      if (index == null || reference == null) {
        return { status: 'ok', actionId };
      }

      await services.scopedClusterClient.index({
        index,
        refresh: 'wait_for',
        body: {
          params,
          reference,
          source: 'action:test.system-action-kibana-privileges',
        },
      });

      return { status: 'ok', actionId };
    },
  };

  return result;
}

function getSystemActionTypeWithConnectorAdapter() {
  const result: ActionType<
    {},
    {},
    { myParam: string; injected: string; index?: string; reference?: string }
  > = {
    id: 'test.system-action-connector-adapter',
    name: 'Test system action with a connector adapter set',
    minimumLicenseRequired: 'platinum',
    supportedFeatureIds: ['alerting'],
    validate: {
      params: {
        /**
         * The injected params will be set by the
         * connector adapter while executing the action.
         *
         * Adapter: x-pack/test/alerting_api_integration/common/plugins/alerts/server/connector_adapters.ts
         */
        schema: schema.object({
          myParam: schema.string(),
          injected: schema.string(),
          index: schema.maybe(schema.string()),
          reference: schema.maybe(schema.string()),
        }),
      },

      config: {
        schema: schema.any(),
      },
      secrets: {
        schema: schema.any(),
      },
    },
    isSystemActionType: true,
    /**
     * The executor writes a doc to the
     * testing index. The test uses the doc
     * to verify that the action is executed
     * correctly
     */
    async executor({ params, services, actionId }) {
      const { index, reference } = params;

      if (index == null || reference == null) {
        return { status: 'ok', actionId };
      }

      await services.scopedClusterClient.index({
        index,
        refresh: 'wait_for',
        body: {
          params,
          reference,
          source: 'action:test.system-action-connector-adapter',
        },
      });

      return { status: 'ok', actionId };
    },
  };

  return result;
}
