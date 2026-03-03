/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SIEM_RULE_MIGRATION_STOP_PATH } from '../../../../../common/siem_migrations/constants';
import {
  StopRuleMigrationRequestParams,
  type StopRuleMigrationResponse,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { SiemMigrationAuditLogger } from '../../common/api/util/audit';
import { authz } from './util/authz';
import { withLicense } from '../../common/api/util/with_license';
import { withExistingMigration } from '../../common/api/util/with_existing_migration_id';

export const registerSiemRuleMigrationsStopRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_RULE_MIGRATION_STOP_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { params: buildRouteValidationWithZod(StopRuleMigrationRequestParams) },
        },
      },
      withLicense(
        withExistingMigration(
          async (context, req, res): Promise<IKibanaResponse<StopRuleMigrationResponse>> => {
            const migrationId = req.params.migration_id;
            const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
              context.securitySolution,
              'rules'
            );
            try {
              const ctx = await context.resolve(['securitySolution']);
              const ruleMigrationsClient = ctx.securitySolution.siemMigrations.getRulesClient();

              const { exists, stopped } = await ruleMigrationsClient.task.stop(migrationId);

              if (!exists) {
                return res.notFound();
              }
              await siemMigrationAuditLogger.logStop({ migrationId });

              return res.ok({ body: { stopped } });
            } catch (error) {
              logger.error(error);
              await siemMigrationAuditLogger.logStop({ migrationId, error });
              return res.badRequest({ body: error.message });
            }
          }
        )
      )
    );
};
