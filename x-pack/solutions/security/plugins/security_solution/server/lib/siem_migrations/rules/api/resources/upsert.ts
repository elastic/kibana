/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { ResourceIdentifier } from '../../../../../../common/siem_migrations/rules/resources';
import {
  UpsertRuleMigrationResourcesRequestBody,
  UpsertRuleMigrationResourcesRequestParams,
  type UpsertRuleMigrationResourcesResponse,
} from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATION_RESOURCES_PATH } from '../../../../../../common/siem_migrations/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import type { CreateRuleMigrationResourceInput } from '../../data/rule_migrations_data_resources_client';
import { withLicense } from '../util/with_license';

export const registerSiemRuleMigrationsResourceUpsertRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_RULE_MIGRATION_RESOURCES_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
      options: { body: { maxBytes: 26214400 } }, // rise payload limit to 25MB
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpsertRuleMigrationResourcesRequestParams),
            body: buildRouteValidationWithZod(UpsertRuleMigrationResourcesRequestBody),
          },
        },
      },
      withLicense(
        async (
          context,
          req,
          res
        ): Promise<IKibanaResponse<UpsertRuleMigrationResourcesResponse>> => {
          const resources = req.body;
          const migrationId = req.params.migration_id;
          try {
            const ctx = await context.resolve(['securitySolution']);
            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();

            // Check if the migration exists
            const { data } = await ruleMigrationsClient.data.rules.get(migrationId, { size: 1 });
            const [rule] = data;
            if (!rule) {
              return res.notFound({ body: { message: 'Migration not found' } });
            }

            // Upsert identified resource documents with content
            const ruleMigrations = resources.map<CreateRuleMigrationResourceInput>((resource) => ({
              ...resource,
              migration_id: migrationId,
            }));
            await ruleMigrationsClient.data.resources.upsert(ruleMigrations);

            // Create identified resource documents without content to keep track of them
            const resourceIdentifier = new ResourceIdentifier(rule.original_rule.vendor);
            const resourcesToCreate = resourceIdentifier
              .fromResources(resources)
              .map<CreateRuleMigrationResourceInput>((resource) => ({
                ...resource,
                migration_id: migrationId,
              }));
            await ruleMigrationsClient.data.resources.create(resourcesToCreate);

            return res.ok({ body: { acknowledged: true } });
          } catch (err) {
            logger.error(err);
            return res.badRequest({ body: err.message });
          }
        }
      )
    );
};
