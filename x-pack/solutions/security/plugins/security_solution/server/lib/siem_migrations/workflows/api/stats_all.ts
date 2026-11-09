/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { SIEM_WORKFLOW_MIGRATIONS_ALL_STATS_PATH } from '../../../../../common/siem_migrations/workflows/constants';
import type { GetAllWorkflowMigrationStatsResponse } from '../../../../../common/siem_migrations/model/api/workflows/workflow_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { withLicense } from '../../common/api/util/with_license';
import { authz } from './util/authz';

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
          _context,
          _req,
          res
        ): Promise<IKibanaResponse<GetAllWorkflowMigrationStatsResponse>> => {
          logger.debug('Workflow migration stats are not implemented');
          return res.ok({ body: [] });
        }
      )
    );
};
