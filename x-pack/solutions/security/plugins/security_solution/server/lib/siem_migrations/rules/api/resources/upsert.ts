/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import partition from 'lodash/partition';
import { SIEM_RULE_MIGRATION_RESOURCES_PATH } from '../../../../../../common/siem_migrations/constants';
import {
  UpsertRuleMigrationResourcesRequestBody,
  UpsertRuleMigrationResourcesRequestParams,
  type UpsertRuleMigrationResourcesResponse,
} from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { ResourceIdentifier } from '../../../../../../common/siem_migrations/rules/resources';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import type { CreateRuleMigrationResourceInput } from '../../data/rule_migrations_data_resources_client';
import { SiemMigrationAuditLogger, SiemMigrationsAuditActions } from '../util/audit';
import { processLookups } from '../util/lookups';
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
          let siemMigrationAuditLogger: SiemMigrationAuditLogger | undefined;
          try {
            const ctx = await context.resolve(['securitySolution']);
            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();
            const auditLogger = ctx.securitySolution.getAuditLogger();
            if (auditLogger) {
              siemMigrationAuditLogger = new SiemMigrationAuditLogger(auditLogger);
            }

            for (const resource of resources) {
              if (resource.type === 'macro') {
                siemMigrationAuditLogger?.log({
                  action: SiemMigrationsAuditActions.SIEM_MIGRATION_UPLOADED_MACRO,
                  id: migrationId,
                });
              }
              if (resource.type === 'lookup') {
                siemMigrationAuditLogger?.log({
                  action: SiemMigrationsAuditActions.SIEM_MIGRATION_UPLOADED_LOOKUP,
                  id: migrationId,
                });
              }
            }

            // Check if the migration exists
            const { data } = await ruleMigrationsClient.data.rules.get(migrationId, { size: 1 });
            const [rule] = data;
            if (!rule) {
              return res.notFound({ body: { message: 'Migration not found' } });
            }

            const [lookups, macros] = partition(resources, { type: 'lookup' });
            const processedLookups = await processLookups(lookups, ruleMigrationsClient);
            const resourcesUpsert = [...macros, ...processedLookups].map((resource) => ({
              ...resource,
              migration_id: migrationId,
            }));

            // Upsert the resources
            await ruleMigrationsClient.data.resources.upsert(resourcesUpsert);

            // Create identified resource documents to keep track of them (without content)
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
            for (const resource of resources) {
              if (resource.type === 'macro') {
                siemMigrationAuditLogger?.log({
                  action: SiemMigrationsAuditActions.SIEM_MIGRATION_UPLOADED_MACRO,
                  error: err,
                  id: migrationId,
                });
              }
              if (resource.type === 'lookup') {
                siemMigrationAuditLogger?.log({
                  action: SiemMigrationsAuditActions.SIEM_MIGRATION_UPLOADED_LOOKUP,
                  error: err,
                  id: migrationId,
                });
              }
            }
            return res.badRequest({ body: err.message });
          }
        }
      )
    );
};
