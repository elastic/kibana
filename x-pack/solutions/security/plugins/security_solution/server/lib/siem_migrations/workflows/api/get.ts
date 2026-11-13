/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { SIEM_WORKFLOW_MIGRATION_PATH } from '../../../../../common/siem_migrations/workflows/constants';
import {
  GetWorkflowMigrationRequestParams,
  type GetWorkflowMigrationResponse,
} from '../../../../../common/siem_migrations/model/api/workflows/workflow_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { MIGRATION_ID_NOT_FOUND } from '../../common/translations';
import { withLicense } from '../../common/api/util/with_license';
import { authz } from './util/authz';

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
            params: buildRouteValidationWithZod(GetWorkflowMigrationRequestParams),
          },
        },
      },
      withLicense(
        async (_context, req, res): Promise<IKibanaResponse<GetWorkflowMigrationResponse>> => {
          logger.debug(`Workflow migration get is not implemented (${req.params.migration_id})`);
          return res.notFound({ body: MIGRATION_ID_NOT_FOUND(req.params.migration_id) });
        }
      )
    );
};
