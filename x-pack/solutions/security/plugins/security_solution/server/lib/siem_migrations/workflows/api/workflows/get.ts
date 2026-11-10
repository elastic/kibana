/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH } from '../../../../../../common/siem_migrations/workflows/constants';
import {
  GetWorkflowMigrationWorkflowsRequestParams,
  GetWorkflowMigrationWorkflowsRequestQuery,
  type GetWorkflowMigrationWorkflowsResponse,
} from '../../../../../../common/siem_migrations/model/api/workflows/workflow_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import type { SiemMigrationGetItemsOptions } from '../../../common/data/types';
import { SiemMigrationAuditLogger } from '../../../common/api/util/audit';
import { withLicense } from '../../../common/api/util/with_license';
import { withExistingMigration } from '../../../common/api/util/with_existing_migration_id';
import { authz } from '../util/authz';

export const registerSiemWorkflowMigrationsGetWorkflowsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetWorkflowMigrationWorkflowsRequestParams),
            query: buildRouteValidationWithZod(GetWorkflowMigrationWorkflowsRequestQuery),
          },
        },
      },
      withLicense(
        withExistingMigration(
          async (
            context,
            req,
            res
          ): Promise<IKibanaResponse<GetWorkflowMigrationWorkflowsResponse>> => {
            const { migration_id: migrationId } = req.params;
            const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
              context.securitySolution,
              'workflows'
            );
            try {
              const ctx = await context.resolve(['securitySolution']);
              const workflowsMigrationsClient =
                ctx.securitySolution.siemMigrations.getWorkflowsClient();

              const { page, per_page: size } = req.query;
              const options: SiemMigrationGetItemsOptions = {
                filters: {
                  searchTerm: req.query.search_term,
                  ids: req.query.ids,
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

              const result = await workflowsMigrationsClient.data.items.get(migrationId, options);

              await siemMigrationAuditLogger.logGetMigrationItems({ migrationId });
              return res.ok({ body: result });
            } catch (error) {
              logger.error(error);
              await siemMigrationAuditLogger.logGetMigrationItems({ migrationId, error });
              return res.badRequest({ body: error.message });
            }
          }
        )
      )
    );
};
