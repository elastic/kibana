/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SIEM_RULE_MIGRATION_INSTALL_PATH } from '../../../../../common/siem_migrations/constants';
import type { InstallMigrationRulesResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import {
  InstallMigrationRulesRequestBody,
  InstallMigrationRulesRequestParams,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { SiemMigrationAuditLogger } from './util/audit';
import { installTranslated } from './util/installation';
import { authz } from './util/authz';
import { withLicense } from './util/with_license';

export const registerSiemRuleMigrationsInstallRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_RULE_MIGRATION_INSTALL_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(InstallMigrationRulesRequestParams),
            body: buildRouteValidationWithZod(InstallMigrationRulesRequestBody),
          },
        },
      },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<InstallMigrationRulesResponse>> => {
          const { migration_id: migrationId } = req.params;
          const { ids, enabled = false } = req.body;
          const siemMigrationAuditLogger = new SiemMigrationAuditLogger(context.securitySolution);

          try {
            const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);

            const securitySolutionContext = ctx.securitySolution;
            const savedObjectsClient = ctx.core.savedObjects.client;
            const rulesClient = await ctx.alerting.getRulesClient();

            await siemMigrationAuditLogger.logInstallRules({ ids, migrationId });

            const installed = await installTranslated({
              migrationId,
              ids,
              enabled,
              securitySolutionContext,
              savedObjectsClient,
              rulesClient,
            });

            return res.ok({ body: { installed } });
          } catch (error) {
            logger.error(error);
            await siemMigrationAuditLogger.logInstallRules({ ids, migrationId, error });
            return res.badRequest({ body: error.message });
          }
        }
      )
    );
};
