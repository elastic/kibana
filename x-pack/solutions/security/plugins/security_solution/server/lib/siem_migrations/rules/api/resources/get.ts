/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SIEM_RULE_MIGRATION_RESOURCES_PATH } from '../../../../../../common/siem_migrations/constants';
import {
  GetRuleMigrationResourcesRequestParams,
  GetRuleMigrationResourcesRequestQuery,
  type GetRuleMigrationResourcesResponse,
} from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { SiemMigrationAuditLogger, SiemMigrationsAuditActions } from '../util/audit';
import { withLicense } from '../util/with_license';

export const registerSiemRuleMigrationsResourceGetRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_RULE_MIGRATION_RESOURCES_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetRuleMigrationResourcesRequestParams),
            query: buildRouteValidationWithZod(GetRuleMigrationResourcesRequestQuery),
          },
        },
      },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<GetRuleMigrationResourcesResponse>> => {
          const migrationId = req.params.migration_id;
          const { type, names, from, size } = req.query;
          let siemMigrationAuditLogger: SiemMigrationAuditLogger | undefined;
          try {
            const ctx = await context.resolve(['securitySolution']);
            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();
            const auditLogger = ctx.securitySolution.getAuditLogger();
            if (auditLogger) {
              siemMigrationAuditLogger = new SiemMigrationAuditLogger(auditLogger);
            }
            const options = { filters: { type, names }, from, size };
            const resources = await ruleMigrationsClient.data.resources.get(migrationId, options);

            if (type && type === 'macro') {
              siemMigrationAuditLogger?.log({
                action: SiemMigrationsAuditActions.SIEM_MIGRATION_RETRIEVED_MACRO,
                id: migrationId,
              });
            }
            if (type && type === 'lookup') {
              siemMigrationAuditLogger?.log({
                action: SiemMigrationsAuditActions.SIEM_MIGRATION_RETRIEVED_LOOKUP,
                id: migrationId,
              });
            }

            return res.ok({ body: resources });
          } catch (err) {
            logger.error(err);
            if (type && type === 'macro') {
              siemMigrationAuditLogger?.log({
                action: SiemMigrationsAuditActions.SIEM_MIGRATION_RETRIEVED_MACRO,
                error: err,
                id: migrationId,
              });
            }
            if (type && type === 'lookup') {
              siemMigrationAuditLogger?.log({
                action: SiemMigrationsAuditActions.SIEM_MIGRATION_RETRIEVED_LOOKUP,
                error: err,
                id: migrationId,
              });
            }
            return res.badRequest({ body: err.message });
          }
        }
      )
    );
};
