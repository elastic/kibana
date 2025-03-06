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
  type UpdateRuleMigrationResponse,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from './util/authz';
import { SiemMigrationAuditLogger } from './util/audit';
import { transformToInternalUpdateRuleMigrationData } from './util/update_rules';
import { withLicense } from './util/with_license';

export const registerSiemRuleMigrationsUpdateRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .put({
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
          const { migration_id: migrationId } = req.params;
          const rulesToUpdate = req.body;

          if (rulesToUpdate.length === 0) {
            return res.noContent();
          }
          const ids = rulesToUpdate.map((rule) => rule.id);

          const siemMigrationAuditLogger = new SiemMigrationAuditLogger(context.securitySolution);
          try {
            const ctx = await context.resolve(['securitySolution']);
            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();

            await siemMigrationAuditLogger.logUpdateRules({ migrationId, ids });

            const transformedRuleToUpdate = rulesToUpdate.map(
              transformToInternalUpdateRuleMigrationData
            );
            await ruleMigrationsClient.data.rules.update(transformedRuleToUpdate);

            return res.ok({ body: { updated: true } });
          } catch (error) {
            logger.error(error);
            await siemMigrationAuditLogger.logUpdateRules({ migrationId, ids, error });
            return res.badRequest({ body: error.message });
          }
        }
      )
    );
};
