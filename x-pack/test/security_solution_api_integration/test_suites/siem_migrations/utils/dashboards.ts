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
  SIEM_DASHBOARD_MIGRATIONS_PATH,
} from '@kbn/security-solution-plugin/common/siem_migrations/dashboards/constants';
import {
  CreateDashboardMigrationDashboardsRequestBody,
  CreateDashboardMigrationRequestBody,
  CreateDashboardMigrationResponse,
} from '@kbn/security-solution-plugin/common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import SuperTest from 'supertest';
import { replaceParams } from '@kbn/openapi-common/shared';
import { assertStatusCode } from './asserts';
import { RequestParams, MigrationRequestParams } from './types';

export type CreateDashboardMigrationRequestBodyInput = RequestParams & {
  body?: CreateDashboardMigrationRequestBody;
};

export type AddDashboardsToMigrationRequestBody = MigrationRequestParams & {
  body: CreateDashboardMigrationDashboardsRequestBody;
  expectedStatusCode?: number;
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
  };
};
