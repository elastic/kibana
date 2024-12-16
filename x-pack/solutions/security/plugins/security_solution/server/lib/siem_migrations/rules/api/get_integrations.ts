/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { RelatedIntegration } from '../../../../../common/api/detection_engine';
import {
  GetRuleMigrationIntegrationsRequestParams,
  type GetRuleMigrationIntegrationsResponse,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATIONS_INTEGRATIONS_PATH } from '../../../../../common/siem_migrations/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { withLicense } from './util/with_license';
import { getPrebuiltRulesForMigration } from './util/prebuilt_rules';

export const registerSiemRuleMigrationsIntegrationsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_RULE_MIGRATIONS_INTEGRATIONS_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetRuleMigrationIntegrationsRequestParams),
          },
        },
      },
      withLicense(
        async (
          context,
          req,
          res
        ): Promise<IKibanaResponse<GetRuleMigrationIntegrationsResponse>> => {
          const { migration_id: migrationId } = req.params;
          try {
            const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();
            const savedObjectsClient = ctx.core.savedObjects.client;
            const rulesClient = await ctx.alerting.getRulesClient();

            // Retrieve related integrations for migration rules translated into Elastic custom rules
            const options = { filters: { custom: true } };
            const batches = ruleMigrationsClient.data.rules.searchBatches(migrationId, options);

            const integrationIdsSet = new Set<string>();
            let results = await batches.next();
            while (results.length) {
              results.forEach((rule) => {
                if (rule.elastic_rule?.integration_id) {
                  integrationIdsSet.add(rule.elastic_rule.integration_id);
                }
              });
              results = await batches.next();
            }

            const relatedIntegrations: Record<string, RelatedIntegration> = {};
            const packages = await ruleMigrationsClient.data.integrations.getIntegrationPackages();
            packages?.forEach(({ id, version, integration }) => {
              if (integrationIdsSet.has(id)) {
                relatedIntegrations[id] = { package: id, version, integration };
              }
            });

            // Retrieve related integrations for migration rules matched with prebuilt rules
            const prebuiltRules = await getPrebuiltRulesForMigration(
              migrationId,
              ruleMigrationsClient,
              rulesClient,
              savedObjectsClient
            );
            Object.values(prebuiltRules).forEach((rule) => {
              const integrations = (rule.current ?? rule.target).related_integrations;
              integrations.forEach(
                (integration) => (relatedIntegrations[integration.package] = integration)
              );
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
