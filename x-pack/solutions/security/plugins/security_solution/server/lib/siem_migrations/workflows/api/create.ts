/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { IKibanaResponse } from '@kbn/core/server';
import { SIEM_WORKFLOW_MIGRATIONS_PATH } from '../../../../../common/siem_migrations/workflows/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from './util/authz';
import {
  CreateWorkflowMigrationRequestBody,
  type CreateWorkflowMigrationResponse,
} from '../../../../../common/siem_migrations/workflows/types';
import { withLicense } from '../../common/api/util/with_license';

export const registerSiemWorkflowMigrationsCreateRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .put({
      path: SIEM_WORKFLOW_MIGRATIONS_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateWorkflowMigrationRequestBody),
          },
        },
      },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<CreateWorkflowMigrationResponse>> => {
          try {
            const ctx = await context.resolve(['securitySolution']);
            const workflowsMigrationsClient =
              ctx.securitySolution.siemMigrations.getWorkflowsClient();
            const migrationId = await workflowsMigrationsClient.data.migrations.create(
              req.body.name
            );

            return res.ok({ body: { migration_id: migrationId } });
          } catch (error) {
            logger.error(error);
            return res.badRequest({ body: error.message });
          }
        }
      )
    );
};
