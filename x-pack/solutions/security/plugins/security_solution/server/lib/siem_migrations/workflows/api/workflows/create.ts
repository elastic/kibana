/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { WorkflowMigrationWorkflow } from '../../../../../../common/siem_migrations/model/workflow_migration.gen';
import { SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH } from '../../../../../../common/siem_migrations/workflows/constants';
import {
  CreateWorkflowMigrationWorkflowsRequestBody,
  CreateWorkflowMigrationWorkflowsRequestParams,
} from '../../../../../../common/siem_migrations/model/api/workflows/workflow_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import type { CreateMigrationItemInput } from '../../../common/data/siem_migrations_data_item_client';
import { SiemMigrationAuditLogger } from '../../../common/api/util/audit';
import { withLicense } from '../../../common/api/util/with_license';
import { withExistingMigration } from '../../../common/api/util/with_existing_migration_id';
import { authz } from '../util/authz';

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
            body: buildRouteValidationWithZod(CreateWorkflowMigrationWorkflowsRequestBody),
            params: buildRouteValidationWithZod(CreateWorkflowMigrationWorkflowsRequestParams),
          },
        },
      },
      withLicense(
        withExistingMigration(async (context, req, res): Promise<IKibanaResponse> => {
          const { migration_id: migrationId } = req.params;
          const originalWorkflows = req.body;
          if (originalWorkflows.length === 0) {
            return res.noContent();
          }

          const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
            context.securitySolution,
            'workflows'
          );
          try {
            const ctx = await context.resolve(['securitySolution']);
            const workflowsMigrationsClient =
              ctx.securitySolution.siemMigrations.getWorkflowsClient();
            await siemMigrationAuditLogger.logAddWorkflows({
              migrationId,
              count: originalWorkflows.length,
            });

            const workflows = originalWorkflows.map<CreateMigrationWorkflowInput>(
              (originalWorkflow) => ({
                migration_id: migrationId,
                original_workflow: originalWorkflow,
              })
            );
            await workflowsMigrationsClient.data.items.create(workflows);

            return res.ok();
          } catch (error) {
            logger.error(error);
            await siemMigrationAuditLogger.logAddWorkflows({
              migrationId,
              count: originalWorkflows.length,
              error,
            });
            return res.badRequest({ body: error.message });
          }
        })
      )
    );
};
