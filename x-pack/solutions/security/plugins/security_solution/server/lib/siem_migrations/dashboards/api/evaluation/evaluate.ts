/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { v4 as uuidV4 } from 'uuid';
import { z } from '@kbn/zod';
import { DashboardMigrationTaskExecutionSettings } from '../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { LangSmithEvaluationOptions } from '../../../../../../common/siem_migrations/model/common.gen';
import { SIEM_DASHBOARD_MIGRATION_EVALUATE_PATH } from '../../../../../../common/siem_migrations/dashboards/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { authz } from '../util/authz';
import { withLicense } from '../../../common/api/util/with_license';

const REQUEST_TIMEOUT = 10 * 60 * 1000; // 10 minutes

const requestBodyValidation = buildRouteValidationWithZod(
  z.object({
    settings: DashboardMigrationTaskExecutionSettings,
    langsmith_options: LangSmithEvaluationOptions,
  })
);

interface EvaluateDashboardMigrationResponse {
  evaluationId: string;
}

export const registerSiemDashboardMigrationsEvaluateRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_DASHBOARD_MIGRATION_EVALUATE_PATH,
      access: 'internal',
      security: { authz },
      options: { timeout: { idleSocket: REQUEST_TIMEOUT } },
    })
    .addVersion(
      { version: '1', validate: { request: { body: requestBodyValidation } } },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<EvaluateDashboardMigrationResponse>> => {
          const {
            settings: { connector_id: connectorId },
            langsmith_options: langsmithOptions,
          } = req.body;

          try {
            const evaluationId = uuidV4();
            const abortController = new AbortController();
            req.events.aborted$.subscribe(() => abortController.abort());

            const securitySolutionContext = await context.securitySolution;
            const dashboardMigrationsClient =
              securitySolutionContext.siemMigrations.getDashboardsClient();

            await dashboardMigrationsClient.task.evaluate({
              evaluationId,
              connectorId,
              langsmithOptions,
              abortController,
            });

            return res.ok({ body: { evaluationId } });
          } catch (err) {
            logger.error(err);
            return res.customError({ body: err.message, statusCode: err.statusCode ?? 500 });
          }
        }
      )
    );
};
