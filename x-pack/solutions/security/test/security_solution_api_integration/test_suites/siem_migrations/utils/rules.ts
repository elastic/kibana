/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { replaceParams } from '@kbn/openapi-common/shared';

import {
  SIEM_RULE_MIGRATIONS_ALL_STATS_PATH,
  SIEM_RULE_MIGRATIONS_PATH,
  SIEM_RULE_MIGRATIONS_PREBUILT_RULES_PATH,
  SIEM_RULE_MIGRATION_INSTALL_PATH,
  SIEM_RULE_MIGRATION_PATH,
  SIEM_RULE_MIGRATION_START_PATH,
  SIEM_RULE_MIGRATION_STATS_PATH,
  SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH,
  SIEM_RULE_MIGRATION_STOP_PATH,
  SIEM_RULE_MIGRATIONS_INTEGRATIONS_PATH,
  SIEM_RULE_MIGRATION_RULES_PATH,
  SIEM_RULE_MIGRATIONS_INTEGRATIONS_STATS_PATH,
  SIEM_RULE_MIGRATION_RULES_ENHANCE_PATH,
  SIEM_RULE_MIGRATION_QRADAR_RULES_PATH,
} from '@kbn/security-solution-plugin/common/siem_migrations/constants';
import type {
  CreateQRadarRuleMigrationRulesRequestBody,
  RuleMigrationEnhanceRuleResponse,
} from '@kbn/security-solution-plugin/common/siem_migrations/model/api/rules/rule_migration.gen';
import {
  type CreateRuleMigrationRequestBody,
  type CreateRuleMigrationResponse,
  type RuleMigrationEnhanceRuleRequestBodyInput,
  type GetAllStatsRuleMigrationResponse,
  type GetRuleMigrationIntegrationsResponse,
  type GetRuleMigrationPrebuiltRulesResponse,
  type GetRuleMigrationResponse,
  type GetRuleMigrationRulesRequestQuery,
  type GetRuleMigrationRulesResponse,
  type GetRuleMigrationStatsResponse,
  type InstallMigrationRulesResponse,
  type StartRuleMigrationRequestBody,
  type StartRuleMigrationResponse,
  type StopRuleMigrationResponse,
  type UpdateRuleMigrationRequestBody,
  type UpdateRuleMigrationRulesResponse,
} from '@kbn/security-solution-plugin/common/siem_migrations/model/api/rules/rule_migration.gen';
import { API_VERSIONS } from '@kbn/security-solution-plugin/common/constants';
import { assertStatusCode } from './asserts';
import type { MigrationRequestParams, RequestParams } from './types';

export interface SiemMigrationsAPIErrorResponse {
  status_code: number;
  error: string;
  message: string;
}

export interface CreateRuleMigrationRequestParams extends RequestParams {
  body?: CreateRuleMigrationRequestBody;
}

export interface UpdateRuleMigrationRequestParams extends MigrationRequestParams {
  body: UpdateRuleMigrationRequestBody;
}

export interface GetRuleMigrationRulesParams extends MigrationRequestParams {
  /** Optional query parameters */
  queryParams?: GetRuleMigrationRulesRequestQuery;
}

export interface CreateRuleMigrationRulesParams extends RequestParams {
  /** Optional `id` of migration to add the rules to.
   * The id is necessary only for batching the migration creation in multiple requests */
  migrationId: string;
  /** Optional payload to send */
  payload?: any;
}

export interface CreateRuleMigrationQradarRulesParams extends RequestParams {
  /* The id is necessary only for batching the migration creation in multiple requests */
  migrationId: string;
  payload: CreateQRadarRuleMigrationRulesRequestBody;
}

export interface UpdateRulesParams extends MigrationRequestParams {
  /** Optional payload to send */
  payload?: any;
}

export interface InstallRulesParams extends MigrationRequestParams {
  /** Optional payload to send */
  payload?: any;
}

export type StartMigrationRuleParams = MigrationRequestParams & {
  payload: StartRuleMigrationRequestBody;
};

export interface EnhanceRulesParams extends MigrationRequestParams {
  payload: RuleMigrationEnhanceRuleRequestBodyInput;
}

export const ruleMigrationRouteHelpersFactory = (supertest: SuperTest.Agent) => {
  return {
    create: async ({
      body = { name: 'test migration' },
      expectStatusCode = 200,
    }: CreateRuleMigrationRequestParams): Promise<{
      body: CreateRuleMigrationResponse;
    }> => {
      const response = await supertest
        .put(SIEM_RULE_MIGRATIONS_PATH)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(body);

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    update: async ({
      migrationId,
      body,
      expectStatusCode = 200,
    }: UpdateRuleMigrationRequestParams): Promise<{ body: undefined }> => {
      const response = await supertest
        .patch(replaceParams(SIEM_RULE_MIGRATION_PATH, { migration_id: migrationId }))
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(body);

      assertStatusCode(expectStatusCode, response);
      return response;
    },

    get: async ({
      migrationId,
      expectStatusCode = 200,
    }: MigrationRequestParams): Promise<{ body: GetRuleMigrationResponse }> => {
      const response = await supertest
        .get(replaceParams(SIEM_RULE_MIGRATION_PATH, { migration_id: migrationId }))
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    delete: async ({
      migrationId,
      expectStatusCode = 200,
    }: MigrationRequestParams): Promise<{ body: null }> => {
      const response = await supertest
        .delete(replaceParams(SIEM_RULE_MIGRATION_PATH, { migration_id: migrationId }))
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    getRules: async ({
      migrationId,
      queryParams = {},
      expectStatusCode = 200,
    }: GetRuleMigrationRulesParams): Promise<{ body: GetRuleMigrationRulesResponse }> => {
      const response = await supertest
        .get(replaceParams(SIEM_RULE_MIGRATION_RULES_PATH, { migration_id: migrationId }))
        .query(queryParams)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    addRulesToMigration: async ({
      migrationId,
      payload,
      expectStatusCode = 200,
    }: CreateRuleMigrationRulesParams): Promise<{ body: null }> => {
      const route = replaceParams(SIEM_RULE_MIGRATION_RULES_PATH, { migration_id: migrationId });
      const response = await supertest
        .post(route)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(payload);

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    addQradarRulesToMigration: async ({
      migrationId,
      payload,
      expectStatusCode = 200,
    }: CreateRuleMigrationQradarRulesParams): Promise<{ body: null }> => {
      const route = replaceParams(SIEM_RULE_MIGRATION_QRADAR_RULES_PATH, {
        migration_id: migrationId,
      });
      const response = await supertest
        .post(route)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(payload);

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    updateRules: async ({
      migrationId,
      payload,
      expectStatusCode = 200,
    }: UpdateRulesParams): Promise<{ body: UpdateRuleMigrationRulesResponse }> => {
      const route = replaceParams(SIEM_RULE_MIGRATION_RULES_PATH, { migration_id: migrationId });
      const response = await supertest
        .patch(route)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(payload);

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    install: async ({
      migrationId,
      payload,
      expectStatusCode = 200,
    }: InstallRulesParams): Promise<{ body: InstallMigrationRulesResponse }> => {
      const response = await supertest
        .post(replaceParams(SIEM_RULE_MIGRATION_INSTALL_PATH, { migration_id: migrationId }))
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(payload);

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    stats: async ({
      migrationId,
      expectStatusCode = 200,
    }: MigrationRequestParams): Promise<{ body: GetRuleMigrationStatsResponse }> => {
      const response = await supertest
        .get(replaceParams(SIEM_RULE_MIGRATION_STATS_PATH, { migration_id: migrationId }))
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    statsAll: async ({
      expectStatusCode = 200,
    }: RequestParams): Promise<{ body: GetAllStatsRuleMigrationResponse }> => {
      const response = await supertest
        .get(SIEM_RULE_MIGRATIONS_ALL_STATS_PATH)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    translationStats: async ({
      migrationId,
      expectStatusCode = 200,
    }: MigrationRequestParams): Promise<{ body: GetRuleMigrationStatsResponse }> => {
      const response = await supertest
        .get(
          replaceParams(SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH, { migration_id: migrationId })
        )
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    getPrebuiltRules: async ({
      migrationId,
      expectStatusCode = 200,
    }: MigrationRequestParams): Promise<{ body: GetRuleMigrationPrebuiltRulesResponse }> => {
      const response = await supertest
        .get(replaceParams(SIEM_RULE_MIGRATIONS_PREBUILT_RULES_PATH, { migration_id: migrationId }))
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    start: async ({
      migrationId,
      expectStatusCode = 200,
      payload,
    }: StartMigrationRuleParams): Promise<{
      body: StartRuleMigrationResponse;
    }> => {
      const response = await supertest
        .post(
          replaceParams(SIEM_RULE_MIGRATION_START_PATH, {
            migration_id: migrationId,
          })
        )
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(payload);

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    stop: async ({
      migrationId,
      expectStatusCode = 200,
    }: MigrationRequestParams): Promise<{
      body: StopRuleMigrationResponse;
    }> => {
      const response = await supertest
        .post(
          replaceParams(SIEM_RULE_MIGRATION_STOP_PATH, {
            migration_id: migrationId,
          })
        )
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    getIntegrations: async ({
      expectStatusCode = 200,
    }: RequestParams): Promise<{
      body: GetRuleMigrationIntegrationsResponse;
    }> => {
      const response = await supertest
        .get(SIEM_RULE_MIGRATIONS_INTEGRATIONS_PATH)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    integrationStats: async ({ expectStatusCode = 200 }: RequestParams = {}): Promise<{
      body: GetRuleMigrationIntegrationsResponse;
    }> => {
      const response = await supertest
        .get(SIEM_RULE_MIGRATIONS_INTEGRATIONS_STATS_PATH)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    enhanceRules: async ({
      migrationId,
      payload,
      expectStatusCode = 200,
    }: EnhanceRulesParams): Promise<{ body: RuleMigrationEnhanceRuleResponse }> => {
      const route = replaceParams(SIEM_RULE_MIGRATION_RULES_ENHANCE_PATH, {
        migration_id: migrationId,
      });
      const response = await supertest
        .post(route)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(payload);

      assertStatusCode(expectStatusCode, response);

      return response;
    },
  };
};
