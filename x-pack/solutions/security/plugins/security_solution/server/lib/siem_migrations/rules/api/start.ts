/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { LangSmithOptions } from '../../../../../common/siem_migrations/model/common.gen';
import { SIEM_RULE_MIGRATION_START_PATH } from '../../../../../common/siem_migrations/constants';
import {
  StartRuleMigrationRequestBody,
  StartRuleMigrationRequestParams,
  type StartRuleMigrationResponse,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { SiemMigrationAuditLogger } from './util/audit';
import { authz } from './util/authz';
import { getRetryFilter } from './util/retry';
import { withLicense } from './util/with_license';

export const registerSiemRuleMigrationsStartRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .put({
      path: SIEM_RULE_MIGRATION_START_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(StartRuleMigrationRequestParams),
            body: buildRouteValidationWithZod(StartRuleMigrationRequestBody),
          },
        },
      },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<StartRuleMigrationResponse>> => {
          const migrationId = req.params.migration_id;
          const {
            langsmith_options: langsmithOptions,
            connector_id: connectorId,
            retry,
          } = req.body;

          const siemMigrationAuditLogger = new SiemMigrationAuditLogger(context.securitySolution);
          try {
            const ctx = await context.resolve(['core', 'actions', 'alerting', 'securitySolution']);

            // Check if the connector exists and user has permissions to read it
            const connector = await ctx.actions.getActionsClient().get({ id: connectorId });
            if (!connector) {
              return res.badRequest({ body: `Connector with id ${connectorId} not found` });
            }

            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();
            if (retry) {
              const { updated } = await ruleMigrationsClient.task.updateToRetry(
                migrationId,
                getRetryFilter(retry)
              );
              if (!updated) {
                return res.ok({ body: { started: false } });
              }
            }

            const callbacks = createInvocationCallbacks(langsmithOptions, logger);

            const { exists, started } = await ruleMigrationsClient.task.start({
              migrationId,
              connectorId,
              invocationConfig: { callbacks },
            });

            if (!exists) {
              return res.noContent();
            }

            await siemMigrationAuditLogger.logStart({ migrationId });

            return res.ok({ body: { started } });
          } catch (error) {
            logger.error(error);
            await siemMigrationAuditLogger.logStart({ migrationId, error });
            return res.badRequest({ body: error.message });
          }
        }
      )
    );
};

function createInvocationCallbacks(
  langsmithOptions: LangSmithOptions | undefined,
  logger: Logger
): Callbacks {
  const { api_key: apiKey, project_name: projectName = 'default' } = langsmithOptions ?? {};
  const callbacks: Callbacks = [new APMTracer({ projectName }, logger)];
  if (langsmithOptions) {
    callbacks.push(...getLangSmithTracer({ apiKey, projectName, logger }));
  }
  return callbacks;
}
