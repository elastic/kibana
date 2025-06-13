/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SIEM_RULE_MIGRATION_PATH } from '../../../../../common/siem_migrations/constants';
import {
  type UpdateRuleMigrationResponse,
  UpdateRuleMigrationRequestBody,
  UpdateRuleMigrationRequestParams,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { SiemMigrationAuditLogger } from './util/audit';
import { authz } from './util/authz';
import { withLicense } from './util/with_license';

export const registerSiemRuleMigrationsUpdateRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .patch({
      path: SIEM_RULE_MIGRATION_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateRuleMigrationRequestParams),
            body: buildRouteValidationWithZod(UpdateRuleMigrationRequestBody),
          },
        },
      },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<UpdateRuleMigrationResponse>> => {
          const siemMigrationAuditLogger = new SiemMigrationAuditLogger(context.securitySolution);
          const { migration_id: migrationId } = req.params;
          try {
            const ctx = await context.resolve(['securitySolution']);
            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();
            await siemMigrationAuditLogger.logCreateMigration();
            await ruleMigrationsClient.data.migrations.update({
              id: migrationId,
              params: {
                name: req.body.name,
              },
            });

            return res.ok();
          } catch (error) {
            logger.error(error);
            await siemMigrationAuditLogger.logCreateMigration({
              error,
            });
            return res.badRequest({ body: error.message });
          }
        }
      )
    );
};
