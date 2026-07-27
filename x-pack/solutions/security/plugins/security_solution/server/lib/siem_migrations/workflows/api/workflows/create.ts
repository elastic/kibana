/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { IKibanaResponse } from '@kbn/core/server';
import type { WorkflowMigrationWorkflow } from '../../../../../../common/siem_migrations/workflows/types';
import {
  CreateWorkflowMigrationWorkflowsRequestBody,
  WorkflowMigrationIdParams,
} from '../../../../../../common/siem_migrations/workflows/types';
import { SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH } from '../../../../../../common/siem_migrations/workflows/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { authz } from '../util/authz';
import { withLicense } from '../../../common/api/util/with_license';
import type { CreateMigrationItemInput } from '../../../common/data/siem_migrations_data_item_client';
import { withExistingMigration } from '../../../common/api/util/with_existing_migration_id';

type CreateMigrationWorkflowInput = CreateMigrationItemInput<WorkflowMigrationWorkflow>;

export const registerSiemWorkflowMigrationsCreateWorkflowsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
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
            body: buildRouteValidationWithZod(CreateWorkflowMigrationWorkflowsRequestBody),
          },
        },
      },
      withLicense(
        withExistingMigration(async (context, req, res): Promise<IKibanaResponse<undefined>> => {
          const { migration_id: migrationId } = req.params;
          const stories = req.body;

          try {
            const ctx = await context.resolve(['securitySolution']);
            const workflowsMigrationsClient =
              ctx.securitySolution.siemMigrations.getWorkflowsClient();

            const items = stories.map<CreateMigrationWorkflowInput>((story) => ({
              migration_id: migrationId,
              original_workflow: {
                id: story.guid ?? story.name,
                title: story.name,
                description: story.description ?? undefined,
                vendor: 'tines',
                data: story,
              },
            }));

            await workflowsMigrationsClient.data.items.create(items);

            return res.ok();
          } catch (error) {
            logger.error(`Error creating workflows for migration ID ${migrationId}: ${error}`);
            return res.customError({
              statusCode: 500,
              body: error instanceof Error ? error.message : String(error),
            });
          }
        })
      )
    );
};
