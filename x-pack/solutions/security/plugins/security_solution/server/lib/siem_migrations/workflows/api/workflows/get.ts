/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import type { WorkflowMigrationWorkflow } from '../../../../../../common/siem_migrations/workflows/types';
import {
  GetWorkflowMigrationWorkflowsRequestQuery,
  WorkflowMigrationIdParams,
} from '../../../../../../common/siem_migrations/workflows/types';
import { SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH } from '../../../../../../common/siem_migrations/workflows/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { authz } from '../util/authz';
import { withLicense } from '../../../common/api/util/with_license';
import { withExistingMigration } from '../../../common/api/util/with_existing_migration_id';
import type { Stored } from '../../../types';

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
            params: buildRouteValidationWithZod(WorkflowMigrationIdParams),
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
          ): Promise<
            IKibanaResponse<{ total: number; data: Array<Stored<WorkflowMigrationWorkflow>> }>
          > => {
            const { migration_id: migrationId } = req.params;

            try {
              const ctx = await context.resolve(['securitySolution']);
              const workflowsMigrationsClient =
                ctx.securitySolution.siemMigrations.getWorkflowsClient();

              const { page, per_page: size } = req.query;
              const result = await workflowsMigrationsClient.data.items.get(migrationId, {
                filters: { searchTerm: req.query.search_term },
                size,
                from: page && size ? page * size : 0,
              });

              return res.ok({ body: result });
            } catch (error) {
              logger.error(error);
              return res.badRequest({ body: error.message });
            }
          }
        )
      )
    );
};
