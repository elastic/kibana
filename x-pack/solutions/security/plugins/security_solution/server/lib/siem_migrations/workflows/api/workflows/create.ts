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
  CreateWorkflowMigrationWorkflowsRequestBody,
  WorkflowMigrationIdParams,
} from '../../../../../../common/siem_migrations/workflows/types';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { withLicense } from '../../../common/api/util/with_license';
import { authz } from '../util/authz';

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
            params: buildRouteValidationWithZod(WorkflowMigrationIdParams),
          },
        },
      },
      withLicense(async (_context, req, res): Promise<IKibanaResponse> => {
        logger.debug(`Workflow migration ingest is not implemented (${req.params.migration_id})`);
        if (req.body.length === 0) {
          return res.noContent();
        }
        return res.ok();
      })
    );
};
