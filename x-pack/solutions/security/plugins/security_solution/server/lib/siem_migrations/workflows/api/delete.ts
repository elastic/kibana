/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { WorkflowMigrationIdParams } from '../../../../../common/siem_migrations/workflows/types';
import { SIEM_WORKFLOW_MIGRATION_PATH } from '../../../../../common/siem_migrations/workflows/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from './util/authz';
import { withLicense } from '../../common/api/util/with_license';
import { withExistingMigration } from '../../common/api/util/with_existing_migration_id';

export const registerSiemWorkflowMigrationsDeleteRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .delete({
      path: SIEM_WORKFLOW_MIGRATION_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(WorkflowMigrationIdParams),
          },
        },
      },
      withLicense(
        withExistingMigration(async (context, req, res) => {
          const { migration_id: migrationId } = req.params;

          try {
            const ctx = await context.resolve(['securitySolution']);
            const workflowsMigrationsClient =
              ctx.securitySolution.siemMigrations.getWorkflowsClient();

            if (workflowsMigrationsClient.task.isMigrationRunning(migrationId)) {
              return res.conflict({
                body: 'A running workflow migration cannot be deleted. Please stop the migration first and try again',
              });
            }
            await workflowsMigrationsClient.data.deleteMigration(migrationId);
            return res.ok();
          } catch (error) {
            logger.error(error);
            return res.customError({ statusCode: 500, body: error });
          }
        })
      )
    );
};
