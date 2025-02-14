/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SuperTest from 'supertest';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { replaceParams } from '@kbn/openapi-common/shared';

import {
  SIEM_RULE_MIGRATIONS_PATH,
  SIEM_RULE_MIGRATION_PATH,
} from '@kbn/security-solution-plugin/common/siem_migrations/constants';
import {
  CreateRuleMigrationResponse,
  GetRuleMigrationRequestQuery,
  GetRuleMigrationResponse,
  UpdateRuleMigrationResponse,
} from '@kbn/security-solution-plugin/common/siem_migrations/model/api/rules/rule_migration.gen';
import { API_VERSIONS } from '@kbn/security-solution-plugin/common/constants';
import { assertStatusCode } from './asserts';

export interface GetRuleMigrationParams {
  /** `id` of the migration to get rules documents for */
  migrationId: string;
  /** Optional query parameters */
  queryParams?: GetRuleMigrationRequestQuery;
  /** Optional expected status code parameter */
  expectStatusCode?: number;
}

export interface CreateRuleMigrationParams {
  /** Optional `id` of migration to add the rules to.
   * The id is necessary only for batching the migration creation in multiple requests */
  migrationId?: string;
  /** Optional payload to send */
  payload?: any;
  /** Optional expected status code parameter */
  expectStatusCode?: number;
}

export interface UpdateRulesParams {
  /** `id` of the migration to install rules for */
  migrationId: string;
  /** Optional payload to send */
  payload?: any;
  /** Optional expected status code parameter */
  expectStatusCode?: number;
}

export const migrationRulesRouteHelpersFactory = (supertest: SuperTest.Agent) => {
  return {
    get: async ({
      migrationId,
      queryParams = {},
      expectStatusCode = 200,
    }: GetRuleMigrationParams): Promise<{ body: GetRuleMigrationResponse }> => {
      const response = await supertest
        .get(replaceParams(SIEM_RULE_MIGRATION_PATH, { migration_id: migrationId }))
        .query(queryParams)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    create: async ({
      migrationId,
      payload,
      expectStatusCode = 200,
    }: CreateRuleMigrationParams): Promise<{ body: CreateRuleMigrationResponse }> => {
      const response = await supertest
        .post(`${SIEM_RULE_MIGRATIONS_PATH}${migrationId ? `/${migrationId}` : ''}`)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(payload);

      assertStatusCode(expectStatusCode, response);

      return response;
    },

    update: async ({
      migrationId,
      payload,
      expectStatusCode = 200,
    }: UpdateRulesParams): Promise<{ body: UpdateRuleMigrationResponse }> => {
      const response = await supertest
        .put(replaceParams(SIEM_RULE_MIGRATION_PATH, { migration_id: migrationId }))
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(payload);

      assertStatusCode(expectStatusCode, response);

      return response;
    },
  };
};
