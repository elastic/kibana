/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { type GetRuleMigrationIntegrationsStatsResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATIONS_INTEGRATIONS_STATS_PATH } from '../../../../../common/siem_migrations/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from '../../common/api/util/authz';
import { withLicense } from '../../common/api/util/with_license';
import { SiemMigrationAuditLogger } from '../../common/api/util/audit';

export const registerSiemRuleMigrationsIntegrationsStatsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_RULE_MIGRATIONS_INTEGRATIONS_STATS_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
      },
      withLicense(
        async (
          context,
          _req,
          res
        ): Promise<IKibanaResponse<GetRuleMigrationIntegrationsStatsResponse>> => {
          const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
            context.securitySolution,
            'rules'
          );
          try {
            const ctx = await context.resolve(['securitySolution']);
            const ruleMigrationsClient = ctx.securitySolution.siemMigrations.getRulesClient();
            await siemMigrationAuditLogger.logGetAllIntegrationsStats();

            const allIntegrationsStats =
              await ruleMigrationsClient.data.items.getAllIntegrationsStats();

            return res.ok({ body: allIntegrationsStats });
          } catch (error) {
            logger.error(error);
            await siemMigrationAuditLogger.logGetAllIntegrationsStats({ error });
            return res.customError({ statusCode: 500, body: error.message });
          }
        }
      )
    );
};
