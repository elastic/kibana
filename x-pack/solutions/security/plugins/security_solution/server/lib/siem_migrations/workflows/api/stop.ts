/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { SIEM_WORKFLOW_MIGRATION_STOP_PATH } from '../../../../../common/siem_migrations/workflows/constants';
import {
  WorkflowMigrationIdParams,
  type StopWorkflowMigrationResponse,
} from '../../../../../common/siem_migrations/workflows/types';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from './util/authz';
import { withLicense } from '../../common/api/util/with_license';
import { withExistingMigration } from '../../common/api/util/with_existing_migration_id';

export const registerSiemWorkflowMigrationsStopRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_WORKFLOW_MIGRATION_STOP_PATH,
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
          async (context, req, res): Promise<IKibanaResponse<StopWorkflowMigrationResponse>> => {
            const migrationId = req.params.migration_id;
            try {
              const ctx = await context.resolve(['securitySolution']);
              const workflowsMigrationsClient =
                ctx.securitySolution.siemMigrations.getWorkflowsClient();

              const { exists, stopped } = await workflowsMigrationsClient.task.stop(migrationId);

              if (!exists) {
                return res.notFound();
              }

              return res.ok({ body: { stopped } });
            } catch (error) {
              logger.error(error);
              return res.badRequest({ body: error.message });
            }
          }
        )
      )
    );
};
