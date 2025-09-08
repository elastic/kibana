/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { API_VERSIONS } from '@kbn/security-solution-plugin/common/constants';
import {
  SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH,
  SIEM_DASHBOARD_MIGRATION_PATH,
  SIEM_DASHBOARD_MIGRATION_RESOURCES_MISSING_PATH,
  SIEM_DASHBOARD_MIGRATION_STATS_PATH,
  SIEM_DASHBOARD_MIGRATIONS_PATH,
} from '@kbn/security-solution-plugin/common/siem_migrations/dashboards/constants';
import type {
  GetDashboardMigrationDashboardsRequestQuery,
  GetDashboardMigrationDashboardsResponse,
} from '@kbn/security-solution-plugin/common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import {
  type CreateDashboardMigrationDashboardsRequestBody,
  type CreateDashboardMigrationRequestBody,
  type CreateDashboardMigrationResponse,
  type GetDashboardMigrationResourcesMissingResponse,
  type GetDashboardMigrationStatsResponse,
} from '@kbn/security-solution-plugin/common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import type SuperTest from 'supertest';
import { replaceParams } from '@kbn/openapi-common/shared';
import { assertStatusCode } from './asserts';
import type { RequestParams, MigrationRequestParams } from './types';

export type CreateDashboardMigrationRequestBodyInput = RequestParams & {
  body?: CreateDashboardMigrationRequestBody;
};

export type AddDashboardsToMigrationRequestBody = MigrationRequestParams & {
  body: CreateDashboardMigrationDashboardsRequestBody;
  expectedStatusCode?: number;
};

export type GetDashboardMigrationDashboardsParams = MigrationRequestParams & {
  queryParams?: GetDashboardMigrationDashboardsRequestQuery;
};

export const dashboardMigrationRouteFactory = (supertest: SuperTest.Agent) => {
  return {
    create: async ({
      body = { name: 'Test Dashboard Migration' },
      expectStatusCode = 200,
    }: CreateDashboardMigrationRequestBodyInput): Promise<{
      body: CreateDashboardMigrationResponse;
    }> => {
      const response = await supertest
        .put(SIEM_DASHBOARD_MIGRATIONS_PATH)
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
    }: MigrationRequestParams): Promise<{ body: undefined }> => {
      const url = replaceParams(SIEM_DASHBOARD_MIGRATION_PATH, {
        migration_id: migrationId,
      });
      const response = await supertest
        .get(url)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');

      assertStatusCode(expectStatusCode, response);
      return response;
    },

    stats: async ({
      migrationId,
      expectStatusCode = 200,
    }: MigrationRequestParams): Promise<{ body: GetDashboardMigrationStatsResponse }> => {
      const url = replaceParams(SIEM_DASHBOARD_MIGRATION_STATS_PATH, {
        migration_id: migrationId,
      });
      const response = await supertest
        .get(url)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');

      assertStatusCode(expectStatusCode, response);
      return response;
    },

    addDashboardsToMigration: async ({
      migrationId,
      body,
      expectedStatusCode = 200,
    }: AddDashboardsToMigrationRequestBody): Promise<{ body: undefined }> => {
      const url = replaceParams(SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH, {
        migration_id: migrationId,
      });
      const response = await supertest
        .post(url)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(body);

      assertStatusCode(expectedStatusCode, response);
      return response;
    },

    getDashboards: async ({
      migrationId,
      queryParams = {},
      expectStatusCode = 200,
    }: GetDashboardMigrationDashboardsParams): Promise<{
      body: GetDashboardMigrationDashboardsResponse;
    }> => {
      const url = replaceParams(SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH, {
        migration_id: migrationId,
      });
      const response = await supertest
        .get(url)
        .query(queryParams)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();

      assertStatusCode(expectStatusCode, response);
      return response;
    },

    resources: {
      missing: async ({
        migrationId,
        expectStatusCode = 200,
      }: MigrationRequestParams): Promise<{
        body: GetDashboardMigrationResourcesMissingResponse;
      }> => {
        const url = replaceParams(SIEM_DASHBOARD_MIGRATION_RESOURCES_MISSING_PATH, {
          migration_id: migrationId,
        });
        const response = await supertest
          .get(url)
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');

        assertStatusCode(expectStatusCode, response);
        return response;
      },
    },
  };
};
