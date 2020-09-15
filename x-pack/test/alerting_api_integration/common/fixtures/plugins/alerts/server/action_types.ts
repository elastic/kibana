/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { schema, TypeOf } from '@kbn/config-schema';
import { FixtureStartDeps, FixtureSetupDeps } from './plugin';
import { ActionType } from '../../../../../../../plugins/actions/server';

export function defineActionTypes(
  core: CoreSetup<FixtureStartDeps>,
  { actions }: Pick<FixtureSetupDeps, 'actions'>
) {
  // Action types
  const noopActionType: ActionType = {
    id: 'test.noop',
    name: 'Test: Noop',
    minimumLicenseRequired: 'gold',
    async executor() {
      return { status: 'ok', actionId: '' };
    },
  };
  const throwActionType: ActionType = {
    id: 'test.throw',
    name: 'Test: Throw',
    minimumLicenseRequired: 'gold',
    async executor() {
      throw new Error('this action is intended to fail');
    },
  };
  actions.registerType(noopActionType);
  actions.registerType(throwActionType);
  actions.registerType(getIndexRecordActionType());
  actions.registerType(getFailingActionType());
  actions.registerType(getRateLimitedActionType());
  actions.registerType(getAuthorizationActionType(core));
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
    validate: {
      params: paramsSchema,
      config: configSchema,
      secrets: secretsSchema,
    },
    async executor({ config, secrets, params, services, actionId }) {
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
    validate: {
      params: paramsSchema,
    },
    async executor({ config, secrets, params, services }) {
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
    maxAttempts: 2,
    validate: {
      params: paramsSchema,
    },
    async executor({ config, params, services }) {
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
  return result;
}

function getAuthorizationActionType(core: CoreSetup<FixtureStartDeps>) {
  const clusterClient = core.elasticsearch.legacy.client;
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
    validate: {
      params: paramsSchema,
    },
    async executor({ params, services, actionId }) {
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
