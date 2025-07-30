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
import { RuleMigrationTaskExecutionSettings } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { LangSmithEvaluationOptions } from '../../../../../../common/siem_migrations/model/common.gen';
import { SIEM_RULE_MIGRATION_EVALUATE_PATH } from '../../../../../../common/siem_migrations/constants';
import { createTracersCallbacks } from '../util/tracing';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { authz } from '../../../common/utils/authz';
import { withLicense } from '../../../common/utils/with_license';
import type { MigrateRuleGraphConfig } from '../../task/agent/types';

const REQUEST_TIMEOUT = 10 * 60 * 1000; // 10 minutes

const requestBodyValidation = buildRouteValidationWithZod(
  z.object({
    settings: RuleMigrationTaskExecutionSettings,
    langsmith_options: LangSmithEvaluationOptions,
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
          const {
            settings: {
              connector_id: connectorId,
              skip_prebuilt_rules_matching: skipPrebuiltRulesMatching = false,
            },
            langsmith_options: langsmithOptions,
          } = req.body;

          try {
            const evaluationId = uuidV4();
            const abortController = new AbortController();
            req.events.aborted$.subscribe(() => abortController.abort());

            const securitySolutionContext = await context.securitySolution;
            const ruleMigrationsClient = securitySolutionContext.getSiemRuleMigrationsClient();

            const invocationConfig: MigrateRuleGraphConfig = {
              callbacks: createTracersCallbacks(langsmithOptions, logger),
              configurable: {
                skipPrebuiltRulesMatching,
              },
            };

            await ruleMigrationsClient.task.evaluate({
              evaluationId,
              connectorId,
              langsmithOptions,
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
