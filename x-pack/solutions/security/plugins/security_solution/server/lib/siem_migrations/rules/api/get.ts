/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  GetRuleMigrationRequestParams,
  GetRuleMigrationRequestQuery,
  type GetRuleMigrationResponse,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATION_PATH } from '../../../../../common/siem_migrations/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { RuleMigrationGetOptions } from '../data/rule_migrations_data_rules_client';
import { withLicense } from './util/with_license';

export const registerSiemRuleMigrationsGetRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_RULE_MIGRATION_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetRuleMigrationRequestParams),
            query: buildRouteValidationWithZod(GetRuleMigrationRequestQuery),
          },
        },
      },
      withLicense(async (context, req, res): Promise<IKibanaResponse<GetRuleMigrationResponse>> => {
        const { migration_id: migrationId } = req.params;
        const {
          page,
          per_page: perPage,
          sort_field: sortField,
          sort_direction: sortDirection,
          search_term: searchTerm,
          ids,
          is_prebuilt: isPrebuilt,
          is_installed: isInstalled,
          is_fully_translated: isFullyTranslated,
          is_partially_translated: isPartiallyTranslated,
          is_untranslatable: isUntranslatable,
          is_failed: isFailed,
        } = req.query;
        try {
          const ctx = await context.resolve(['securitySolution']);
          const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();

          const options: RuleMigrationGetOptions = {
            filters: {
              searchTerm,
              ids,
              prebuilt: isPrebuilt,
              installed: isInstalled,
              fullyTranslated: isFullyTranslated,
              partiallyTranslated: isPartiallyTranslated,
              untranslatable: isUntranslatable,
              failed: isFailed,
            },
            sort: { sortField, sortDirection },
            size: perPage,
            from: page && perPage ? page * perPage : 0,
          };

          const result = await ruleMigrationsClient.data.rules.get(migrationId, options);

          return res.ok({ body: result });
        } catch (err) {
          logger.error(err);
          return res.badRequest({ body: err.message });
        }
      })
    );
};
