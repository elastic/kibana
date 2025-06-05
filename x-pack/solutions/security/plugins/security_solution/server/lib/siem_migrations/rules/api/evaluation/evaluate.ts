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
import {
  ConnectorId,
  LangSmithEvaluationSettings,
} from '../../../../../../common/siem_migrations/model/common.gen';
import { SIEM_RULE_MIGRATION_EVALUATE_PATH } from '../../../../../../common/siem_migrations/constants';
import { createTracersCallbacks } from '../util/tracing';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { authz } from '../util/authz';
import { withLicense } from '../util/with_license';

const REQUEST_TIMEOUT = 10 * 60 * 1000; // 10 minutes

const requestBodyValidation = buildRouteValidationWithZod(
  z.object({
    connector_id: ConnectorId,
    langsmith_settings: LangSmithEvaluationSettings,
  })
);

interface EvaluateRuleMigrationResponse {
  evaluationId: string;
}

export const registerSiemRuleMigrationsEvaluateRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_RULE_MIGRATION_EVALUATE_PATH,
      access: 'internal',
      security: { authz },
      options: { timeout: { idleSocket: REQUEST_TIMEOUT } },
    })
    .addVersion(
      { version: '1', validate: { request: { body: requestBodyValidation } } },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<EvaluateRuleMigrationResponse>> => {
          const { connector_id: connectorId, langsmith_settings: langsmithSettings } = req.body;

          try {
            const evaluationId = uuidV4();
            const abortController = new AbortController();
            req.events.aborted$.subscribe(() => abortController.abort());

            const securitySolutionContext = await context.securitySolution;
            const ruleMigrationsClient = securitySolutionContext.getSiemRuleMigrationsClient();

            const invocationConfig = {
              callbacks: createTracersCallbacks(langsmithSettings, logger),
            };

            await ruleMigrationsClient.task.evaluate({
              evaluationId,
              connectorId,
              langsmithSettings,
              abortController,
              invocationConfig,
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
