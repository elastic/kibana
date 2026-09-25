/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import type { WorkflowMigrationTaskStats } from '../../../../../common/siem_migrations/workflows/types';
import { SIEM_WORKFLOW_MIGRATIONS_ALL_STATS_PATH } from '../../../../../common/siem_migrations/workflows/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from './util/authz';
import { withLicense } from '../../common/api/util/with_license';

export const registerSiemWorkflowMigrationsStatsAllRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_WORKFLOW_MIGRATIONS_ALL_STATS_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
      },
      withLicense(
        async (
          context,
          _req,
          res
        ): Promise<IKibanaResponse<WorkflowMigrationTaskStats[]>> => {
          try {
            const ctx = await context.resolve(['securitySolution']);
            const workflowsMigrationsClient =
              ctx.securitySolution.siemMigrations.getWorkflowsClient();

            const allStats = await workflowsMigrationsClient.task.getAllStats();

            return res.ok({ body: allStats });
          } catch (err) {
            logger.error(err);
            return res.badRequest({ body: err.message });
          }
        }
      )
    );
};
