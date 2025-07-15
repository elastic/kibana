/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SIEM_RULE_MIGRATION_RULES_PATH } from '../../../../../../common/siem_migrations/constants';
import type { GetRuleMigrationRulesResponse } from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import {
  GetRuleMigrationRulesRequestParams,
  GetRuleMigrationRulesRequestQuery,
} from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import type { RuleMigrationGetRulesOptions } from '../../data/rule_migrations_data_rules_client';
import { SiemMigrationAuditLogger } from '../../../common/utils/audit';
import { authz } from '../../../common/utils/authz';
import { withLicense } from '../../../common/utils/with_license';
import { withExistingMigration } from '../util/with_existing_migration_id';

export const registerSiemRuleMigrationsGetRulesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_RULE_MIGRATION_RULES_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetRuleMigrationRulesRequestParams),
            query: buildRouteValidationWithZod(GetRuleMigrationRulesRequestQuery),
          },
        },
      },
      withLicense(
        withExistingMigration(
          async (context, req, res): Promise<IKibanaResponse<GetRuleMigrationRulesResponse>> => {
            const { migration_id: migrationId } = req.params;

            const siemMigrationAuditLogger = new SiemMigrationAuditLogger(context.securitySolution);
            try {
              const ctx = await context.resolve(['securitySolution']);
              const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();

              const { page, per_page: size } = req.query;
              const options: RuleMigrationGetRulesOptions = {
                filters: {
                  searchTerm: req.query.search_term,
                  ids: req.query.ids,
                  prebuilt: req.query.is_prebuilt,
                  installed: req.query.is_installed,
                  fullyTranslated: req.query.is_fully_translated,
                  partiallyTranslated: req.query.is_partially_translated,
                  untranslatable: req.query.is_untranslatable,
                  failed: req.query.is_failed,
                },
                sort: { sortField: req.query.sort_field, sortDirection: req.query.sort_direction },
                size,
                from: page && size ? page * size : 0,
              };

              const result = await ruleMigrationsClient.data.rules.get(migrationId, options);

              await siemMigrationAuditLogger.logGetMigrationRules({ migrationId });
              return res.ok({ body: result });
            } catch (error) {
              logger.error(error);
              await siemMigrationAuditLogger.logGetMigrationRules({ migrationId, error });
              return res.badRequest({ body: error.message });
            }
          }
        )
      )
    );
};
