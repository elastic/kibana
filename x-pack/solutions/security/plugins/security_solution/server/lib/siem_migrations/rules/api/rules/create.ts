/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { ResourceSupportedVendor } from '../../../../../../common/siem_migrations/rules/resources/types';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { SIEM_RULE_MIGRATION_RULES_PATH } from '../../../../../../common/siem_migrations/constants';
import {
  CreateRuleMigrationRulesRequestBody,
  CreateRuleMigrationRulesRequestParams,
} from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { RuleResourceIdentifier } from '../../../../../../common/siem_migrations/rules/resources';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import type { CreateRuleMigrationRulesInput } from '../../data/rule_migrations_data_rules_client';
import { SiemMigrationAuditLogger } from '../../../common/api/util/audit';
import { authz } from '../util/authz';
import { withExistingMigration } from '../../../common/api/util/with_existing_migration_id';
import { withLicense } from '../../../common/api/util/with_license';

export const registerSiemRuleMigrationsCreateRulesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_RULE_MIGRATION_RULES_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateRuleMigrationRulesRequestBody),
            params: buildRouteValidationWithZod(CreateRuleMigrationRulesRequestParams),
          },
        },
      },
      withLicense(
        withExistingMigration(
          async (context, req, res): Promise<IKibanaResponse<RuleMigrationRule>> => {
            const { migration_id: migrationId } = req.params;
            const originalRules = req.body;
            const rulesCount = originalRules.length;
            const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
              context.securitySolution,
              'rules'
            );
            try {
              const [firstOriginalRule] = originalRules;
              if (!firstOriginalRule) {
                return res.noContent();
              }
              const ctx = await context.resolve(['securitySolution']);
              const ruleMigrationsClient = ctx.securitySolution.siemMigrations.getRulesClient();
              const { experimentalFeatures } = ctx.securitySolution.getConfig();
              await siemMigrationAuditLogger.logAddRules({
                migrationId,
                count: rulesCount,
              });

              const ruleMigrations = originalRules.map<CreateRuleMigrationRulesInput>(
                (originalRule) => ({
                  migration_id: migrationId,
                  original_rule: originalRule,
                })
              );

              await ruleMigrationsClient.data.items.create(ruleMigrations);

              // Create identified resource documents without content to keep track of them
              const resourceIdentifier = new RuleResourceIdentifier(
                firstOriginalRule.vendor as ResourceSupportedVendor,
                {
                  experimentalFeatures,
                }
              );
              const extractedResources = await resourceIdentifier.fromOriginals(originalRules);

              const resources = extractedResources.map((resource) => ({
                ...resource,
                migration_id: migrationId,
              }));

              if (resources.length > 0) {
                await ruleMigrationsClient.data.resources.create(resources);
              }

              return res.ok();
            } catch (error) {
              logger.error(error);
              await siemMigrationAuditLogger.logAddRules({
                migrationId,
                count: rulesCount,
                error,
              });
              return res.badRequest({ body: error.message });
            }
          }
        )
      )
    );
};
