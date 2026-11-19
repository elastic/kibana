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
  SIEM_WORKFLOW_MIGRATIONS_PATH,
  SIEM_WORKFLOW_MIGRATION_PATH,
  SIEM_WORKFLOW_MIGRATION_TINES_WORKFLOWS_PATH,
  SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH,
} from '@kbn/security-solution-plugin/common/siem_migrations/workflows/constants';
import type {
  CreateTinesWorkflowMigrationWorkflowsRequestBody,
  CreateWorkflowMigrationRequestBody,
  CreateWorkflowMigrationResponse,
  GetWorkflowMigrationResponse,
  GetWorkflowMigrationWorkflowsRequestQuery,
  GetWorkflowMigrationWorkflowsResponse,
  UpdateWorkflowMigrationRequestBody,
} from '@kbn/security-solution-plugin/common/siem_migrations/model/api/workflows/workflow_migration.gen';
import type SuperTest from 'supertest';
import { replaceParams } from '@kbn/openapi-common/shared';
import { assertStatusCode } from './asserts';
import type { MigrationRequestParams, RequestParams } from './types';

export const workflowMigrationRouteFactory = (supertest: SuperTest.Agent) => {
  return {
    create: async ({
      body = { name: 'Test Workflow Migration' },
      expectStatusCode = 200,
    }: RequestParams & { body?: CreateWorkflowMigrationRequestBody }): Promise<{
      body: CreateWorkflowMigrationResponse;
    }> => {
      const response = await supertest
        .put(SIEM_WORKFLOW_MIGRATIONS_PATH)
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
    }: MigrationRequestParams): Promise<{ body: GetWorkflowMigrationResponse }> => {
      const url = replaceParams(SIEM_WORKFLOW_MIGRATION_PATH, {
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

    update: async ({
      migrationId,
      body,
      expectStatusCode = 200,
    }: MigrationRequestParams & { body: UpdateWorkflowMigrationRequestBody }): Promise<{
      body: undefined;
    }> => {
      const url = replaceParams(SIEM_WORKFLOW_MIGRATION_PATH, {
        migration_id: migrationId,
      });
      const response = await supertest
        .patch(url)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(body);

      assertStatusCode(expectStatusCode, response);
      return response;
    },

    delete: async ({
      migrationId,
      expectStatusCode = 200,
    }: MigrationRequestParams): Promise<{ body: undefined }> => {
      const url = replaceParams(SIEM_WORKFLOW_MIGRATION_PATH, {
        migration_id: migrationId,
      });
      const response = await supertest
        .delete(url)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');

      assertStatusCode(expectStatusCode, response);
      return response;
    },

    addTinesWorkflowsToMigration: async ({
      migrationId,
      body,
      expectStatusCode = 200,
    }: MigrationRequestParams & {
      body: CreateTinesWorkflowMigrationWorkflowsRequestBody;
    }): Promise<{ body: undefined }> => {
      const url = replaceParams(SIEM_WORKFLOW_MIGRATION_TINES_WORKFLOWS_PATH, {
        migration_id: migrationId,
      });
      const response = await supertest
        .post(url)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(body);

      assertStatusCode(expectStatusCode, response);
      return response;
    },

    getWorkflows: async ({
      migrationId,
      queryParams = {},
      expectStatusCode = 200,
    }: MigrationRequestParams & {
      queryParams?: GetWorkflowMigrationWorkflowsRequestQuery;
    }): Promise<{ body: GetWorkflowMigrationWorkflowsResponse }> => {
      const url = replaceParams(SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH, {
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
  };
};
