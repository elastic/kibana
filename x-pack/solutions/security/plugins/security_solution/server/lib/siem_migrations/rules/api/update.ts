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
  UpdateRuleMigrationRequestBody,
  UpdateRuleMigrationRequestParams,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { SiemMigrationAuditLogger } from '../../common/utils/audit';
import { authz } from '../../common/utils/authz';
import { withLicense } from '../../common/utils/with_license';
import { withExistingMigration } from './util/with_existing_migration_id';

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
        withExistingMigration(async (context, req, res): Promise<IKibanaResponse> => {
          const siemMigrationAuditLogger = new SiemMigrationAuditLogger(context.securitySolution);
          const { migration_id: migrationId } = req.params;
          try {
            const ctx = await context.resolve(['securitySolution']);
            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();
            await siemMigrationAuditLogger.logUpdateMigration({ migrationId });
            await ruleMigrationsClient.data.migrations.update(migrationId, req.body);

            return res.ok();
          } catch (error) {
            logger.error(error);
            await siemMigrationAuditLogger.logUpdateMigration({ migrationId, error });
            return res.badRequest({ body: error.message });
          }
        })
      )
    );
};
