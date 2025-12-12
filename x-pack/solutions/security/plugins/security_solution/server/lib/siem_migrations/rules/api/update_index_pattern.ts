/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { UpdateRuleMigrationIndexPatternResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import {
  UpdateRuleMigrationIndexPatternRequestParams,
  UpdateRuleMigrationIndexPatternRequestBody,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATION_UPDATE_INDEX_PATTERN_PATH } from '../../../../../common/siem_migrations/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from './util/authz';
import { withLicense } from '../../common/api/util/with_license';
import { withExistingMigration } from '../../common/api/util/with_existing_migration_id';
import { SiemMigrationAuditLogger } from '../../common/api/util/audit';

export const registerSiemRuleMigrationsUpdateIndexPatternRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_RULE_MIGRATION_UPDATE_INDEX_PATTERN_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateRuleMigrationIndexPatternRequestParams),
            body: buildRouteValidationWithZod(UpdateRuleMigrationIndexPatternRequestBody),
          },
        },
      },
      withLicense(
        withExistingMigration(
          async (
            context,
            req,
            res
          ): Promise<IKibanaResponse<UpdateRuleMigrationIndexPatternResponse>> => {
            const migrationId = req.params.migration_id;
            const indexPattern = req.body.index_pattern;
            const ids = req.body.ids;
            const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
              context.securitySolution,
              'rules'
            );
            try {
              const ctx = await context.resolve(['securitySolution']);
              const ruleMigrationsClient = ctx.securitySolution.siemMigrations.getRulesClient();

              await siemMigrationAuditLogger.logUpdateRules({
                migrationId,
                ids: ids ?? [],
              });

              const stats = await ruleMigrationsClient.data.items.updateIndexPattern(
                migrationId,
                indexPattern,
                ids
              );

              return res.ok({ body: { updated: stats ?? 0 } });
            } catch (err) {
              logger.error(err);
              await siemMigrationAuditLogger.logUpdateRules({
                migrationId,
                ids: ids ?? [],
                error: err,
              });
              return res.badRequest({ body: err.message });
            }
          }
        )
      )
    );
};
