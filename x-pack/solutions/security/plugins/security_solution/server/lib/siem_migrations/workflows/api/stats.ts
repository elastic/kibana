/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { WorkflowMigrationTaskStats } from '../../../../../common/siem_migrations/workflows/types';
import { WorkflowMigrationIdParams } from '../../../../../common/siem_migrations/workflows/types';
import { SIEM_WORKFLOW_MIGRATION_STATS_PATH } from '../../../../../common/siem_migrations/workflows/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { withLicense } from '../../common/api/util/with_license';
import { authz } from './util/authz';
import { withExistingMigration } from '../../common/api/util/with_existing_migration_id';

export const registerSiemWorkflowMigrationsStatsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_WORKFLOW_MIGRATION_STATS_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { params: buildRouteValidationWithZod(WorkflowMigrationIdParams) },
        },
      },
      withLicense(
        withExistingMigration(
          async (context, req, res): Promise<IKibanaResponse<WorkflowMigrationTaskStats>> => {
            const migrationId = req.params.migration_id;
            try {
              const ctx = await context.resolve(['securitySolution']);
              const workflowsMigrationsClient =
                ctx.securitySolution.siemMigrations.getWorkflowsClient();

              const stats = await workflowsMigrationsClient.task.getStats(migrationId);

              if (stats.items?.total === 0) {
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
