/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { SIEM_RULE_MIGRATION_RULES_PATH } from '../../../../../../common/siem_migrations/constants';
import type { UpdateRuleMigrationRulesResponse } from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import {
  UpdateRuleMigrationRulesRequestBody,
  UpdateRuleMigrationRulesRequestParams,
} from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { authz } from '../util/authz';
import { SiemMigrationAuditLogger } from '../../../common/api/util/audit';
import { transformToInternalUpdateRuleMigrationData } from '../util/update_rules';
import { getPrebuiltRules, getUniquePrebuiltRuleIds } from '../util/prebuilt_rules';
import { withLicense } from '../../../common/api/util/with_license';
import { withExistingMigration } from '../../../common/api/util/with_existing_migration_id';

export const registerSiemRuleMigrationsUpdateRulesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .patch({
      path: SIEM_RULE_MIGRATION_RULES_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateRuleMigrationRulesRequestParams),
            body: buildRouteValidationWithZod(UpdateRuleMigrationRulesRequestBody),
          },
        },
      },
      withLicense(
        withExistingMigration(
          async (context, req, res): Promise<IKibanaResponse<UpdateRuleMigrationRulesResponse>> => {
            const { migration_id: migrationId } = req.params;
            const rulesToUpdate = req.body;

            if (rulesToUpdate.length === 0) {
              return res.noContent();
            }
            const ids = rulesToUpdate.map((rule) => rule.id);

            const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
              context.securitySolution,
              'rules'
            );
            try {
              const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
              const ruleMigrationsClient = ctx.securitySolution.siemMigrations.getRulesClient();

              // Resolve + validate before the success audit event, so an unknown id is only logged as a failure.
              const prebuiltRules = await getPrebuiltRules(
                await ctx.alerting.getRulesClient(),
                ctx.core.savedObjects.client,
                getUniquePrebuiltRuleIds(rulesToUpdate)
              );
              const { data } = await ruleMigrationsClient.data.items.get(migrationId, {
                filters: { ids },
                size: ids.length,
              });
              const storedRules = Object.fromEntries(data.map((rule) => [rule.id, rule]));
              const missingIds = ids.filter((id) => !storedRules[id]);
              if (missingIds.length > 0) {
                throw new Error(`Rule Migration item(s) not found: ${missingIds.join(', ')}`);
              }

              const transformedRuleToUpdate = await Promise.all(
                rulesToUpdate.map((rule) =>
                  transformToInternalUpdateRuleMigrationData(rule, { prebuiltRules, storedRules })
                )
              );

              await siemMigrationAuditLogger.logUpdateRules({ migrationId, ids });

              await ruleMigrationsClient.data.items.update(transformedRuleToUpdate);

              return res.ok({ body: { updated: true } });
            } catch (error) {
              logger.error(error);
              await siemMigrationAuditLogger.logUpdateRules({ migrationId, ids, error });
              return res.badRequest({ body: error.message });
            }
          }
        )
      )
    );
};
