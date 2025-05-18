/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import type { RelatedIntegration } from '../../../../../common/api/detection_engine';
import { type GetRuleMigrationIntegrationsResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATIONS_INTEGRATIONS_PATH } from '../../../../../common/siem_migrations/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from './util/authz';
import { withLicense } from './util/with_license';

export const registerSiemRuleMigrationsIntegrationsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_RULE_MIGRATIONS_INTEGRATIONS_PATH,
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
          req,
          res
        ): Promise<IKibanaResponse<GetRuleMigrationIntegrationsResponse>> => {
          try {
            const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();

            const relatedIntegrations: Record<string, RelatedIntegration> = {};
            const packages = await ruleMigrationsClient.data.integrations.getIntegrationPackages();
            packages?.forEach(({ id, version, integration }) => {
              relatedIntegrations[id] = { package: id, version, integration };
            });

            return res.ok({ body: relatedIntegrations });
          } catch (err) {
            logger.error(err);
            return res.badRequest({ body: err.message });
          }
        }
      )
    );
};
