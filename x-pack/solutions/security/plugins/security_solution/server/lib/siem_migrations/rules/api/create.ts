/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SIEM_RULE_MIGRATIONS_PATH } from '../../../../../common/siem_migrations/constants';
import {
  type CreateRuleMigrationResponse,
  CreateRuleMigrationRequestBody,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { SiemMigrationAuditLogger } from './util/audit';
import { authz } from './util/authz';
import { withLicense } from './util/with_license';

export const registerSiemRuleMigrationsCreateRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .put({
      path: SIEM_RULE_MIGRATIONS_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateRuleMigrationRequestBody),
          },
        },
      },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<CreateRuleMigrationResponse>> => {
          const siemMigrationAuditLogger = new SiemMigrationAuditLogger(context.securitySolution);
          try {
            const ctx = await context.resolve(['securitySolution']);
            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();
            await siemMigrationAuditLogger.logCreateMigration();
            const migrationId = await ruleMigrationsClient.data.migrations.create(req.body.name);

            return res.ok({ body: { migration_id: migrationId } });
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
