/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { SIEM_WORKFLOW_MIGRATION_PATH } from '../../../../../common/siem_migrations/workflows/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from './util/authz';
import { withLicense } from '../../common/api/util/with_license';
import {
  UpdateWorkflowMigrationRequestBody,
  WorkflowMigrationIdParams,
} from '../../../../../common/siem_migrations/workflows/types';
import { withExistingMigration } from '../../common/api/util/with_existing_migration_id';

export const registerSiemWorkflowMigrationsUpdateRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .patch({
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
            body: buildRouteValidationWithZod(UpdateWorkflowMigrationRequestBody),
          },
        },
      },
      withLicense(
        withExistingMigration(async (context, req, res): Promise<IKibanaResponse> => {
          const { migration_id: migrationId } = req.params;
          try {
            const ctx = await context.resolve(['securitySolution']);
            const workflowsMigrationsClient =
              ctx.securitySolution.siemMigrations.getWorkflowsClient();

            await workflowsMigrationsClient.data.migrations.update(migrationId, req.body);

            return res.ok();
          } catch (error) {
            logger.error(error);
            return res.customError({ statusCode: 400, body: (error as Error).message });
          }
        })
      )
    );
};
