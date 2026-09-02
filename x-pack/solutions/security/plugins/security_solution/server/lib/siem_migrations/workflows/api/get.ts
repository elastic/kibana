/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import type { WorkflowMigration } from '../../../../../common/siem_migrations/workflows/types';
import { WorkflowMigrationIdParams } from '../../../../../common/siem_migrations/workflows/types';
import { SIEM_WORKFLOW_MIGRATION_PATH } from '../../../../../common/siem_migrations/workflows/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from './util/authz';
import { withLicense } from '../../common/api/util/with_license';
import { MIGRATION_ID_NOT_FOUND } from '../../common/translations';

export const registerSiemWorkflowMigrationsGetRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
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
        async (context, req, res): Promise<IKibanaResponse<WorkflowMigration>> => {
          const { migration_id: migrationId } = req.params;
          try {
            const ctx = await context.resolve(['securitySolution']);
            const workflowsMigrationsClient =
              ctx.securitySolution.siemMigrations.getWorkflowsClient();

            const storedMigration = await workflowsMigrationsClient.data.migrations.get(
              migrationId
            );

            if (!storedMigration) {
              return res.notFound({
                body: MIGRATION_ID_NOT_FOUND(migrationId),
              });
            }

            return res.ok({ body: storedMigration });
          } catch (error) {
            logger.error(error);
            return res.badRequest({ body: error.message });
          }
        }
      )
    );
};
