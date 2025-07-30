/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { GetRuleMigrationTranslationStatsResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { GetRuleMigrationTranslationStatsRequestParams } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH } from '../../../../../common/siem_migrations/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from '../../common/utils/authz';
import { withLicense } from '../../common/utils/with_license';
import { withExistingMigration } from './util/with_existing_migration_id';

export const registerSiemRuleMigrationsTranslationStatsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetRuleMigrationTranslationStatsRequestParams),
          },
        },
      },
      withLicense(
        withExistingMigration(
          async (
            context,
            req,
            res
          ): Promise<IKibanaResponse<GetRuleMigrationTranslationStatsResponse>> => {
            const migrationId = req.params.migration_id;
            try {
              const ctx = await context.resolve(['securitySolution']);
              const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();

              const stats = await ruleMigrationsClient.data.rules.getTranslationStats(migrationId);

              if (stats.rules.total === 0) {
                return res.noContent();
              }
              return res.ok({ body: stats });
            } catch (err) {
              logger.error(err);
              return res.badRequest({ body: err.message });
            }
          }
        )
      )
    );
};
