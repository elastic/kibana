/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SIEM_RULE_MIGRATION_PATH } from '../../../../../common/siem_migrations/constants';
import type { GetRuleMigrationResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { GetRuleMigrationRequestParams } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { SiemMigrationAuditLogger } from '../../common/api/util/audit';
import { authz } from './util/authz';
import { withLicense } from '../../common/api/util/with_license';
import { MIGRATION_ID_NOT_FOUND } from '../../common/translations';

export const registerSiemRuleMigrationsGetRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_RULE_MIGRATION_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetRuleMigrationRequestParams),
          },
        },
      },
      withLicense(async (context, req, res): Promise<IKibanaResponse<GetRuleMigrationResponse>> => {
        const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
          context.securitySolution,
          'rules'
        );

        const { migration_id: migrationId } = req.params;
        try {
          const ctx = await context.resolve(['securitySolution']);
          const ruleMigrationsClient = ctx.securitySolution.siemMigrations.getRulesClient();
          await siemMigrationAuditLogger.logGetMigration({ migrationId });

          const storedMigration = await ruleMigrationsClient.data.migrations.get(migrationId);

          if (!storedMigration) {
            return res.notFound({
              body: MIGRATION_ID_NOT_FOUND(migrationId),
            });
          }

          return res.ok({
            body: storedMigration,
          });
        } catch (error) {
          logger.error(error);
          await siemMigrationAuditLogger.logGetMigration({
            migrationId,
            error,
          });
          return res.badRequest({ body: error.message });
        }
      })
    );
};
