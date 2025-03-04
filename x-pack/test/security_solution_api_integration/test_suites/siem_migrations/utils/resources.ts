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

import { SIEM_RULE_MIGRATION_RESOURCES_MISSING_PATH } from '@kbn/security-solution-plugin/common/siem_migrations/constants';
import { GetRuleMigrationResourcesMissingResponse } from '@kbn/security-solution-plugin/common/siem_migrations/model/api/rules/rule_migration.gen';
import { API_VERSIONS } from '@kbn/security-solution-plugin/common/constants';
import { assertStatusCode } from './asserts';

export interface GetRuleMigrationMissingResourcesParams {
  /** `id` of the migration to get missing resources for */
  migrationId: string;
  /** Optional expected status code parameter */
  expectStatusCode?: number;
}

export const migrationResourcesRouteHelpersFactory = (supertest: SuperTest.Agent) => {
  return {
    getMissingResources: async ({
      migrationId,
      expectStatusCode = 200,
    }: GetRuleMigrationMissingResourcesParams): Promise<{
      body: GetRuleMigrationResourcesMissingResponse;
    }> => {
      const response = await supertest
        .get(
          replaceParams(SIEM_RULE_MIGRATION_RESOURCES_MISSING_PATH, { migration_id: migrationId })
        )
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();

      assertStatusCode(expectStatusCode, response);

      return response;
    },
  };
};
