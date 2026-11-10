/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { SIEM_WORKFLOW_MIGRATION_TRANSLATION_STATS_PATH } from '../../../../../common/siem_migrations/workflows/constants';
import {
  GetWorkflowMigrationTranslationStatsRequestParams,
  type GetWorkflowMigrationTranslationStatsResponse,
} from '../../../../../common/siem_migrations/model/api/workflows/workflow_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { withLicense } from '../../common/api/util/with_license';
import { withExistingMigration } from '../../common/api/util/with_existing_migration_id';
import { authz } from './util/authz';

export const registerSiemWorkflowMigrationsTranslationStatsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_WORKFLOW_MIGRATION_TRANSLATION_STATS_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetWorkflowMigrationTranslationStatsRequestParams),
          },
        },
      },
      withLicense(
        withExistingMigration(
          async (
            _context,
            req,
            res
          ): Promise<IKibanaResponse<GetWorkflowMigrationTranslationStatsResponse>> => {
            logger.debug(
              `Workflow migration translation stats are not implemented (${req.params.migration_id})`
            );
            return res.noContent();
          }
        )
      )
    );
};
