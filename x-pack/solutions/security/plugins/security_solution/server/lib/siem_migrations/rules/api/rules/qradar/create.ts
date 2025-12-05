/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SIEM_RULE_MIGRATION_QRADAR_RULES_PATH } from '../../../../../../../common/siem_migrations/constants';
import {
  CreateQRadarRuleMigrationRulesRequestBody,
  CreateQRadarRuleMigrationRulesRequestParams,
} from '../../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { QradarRulesXmlParser } from '../../../../../../../common/siem_migrations/parsers/qradar/rules_xml';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { SiemMigrationAuditLogger } from '../../../../common/api/util/audit';
import { authz } from '../../../../common/api/util/authz';
import { withExistingMigration } from '../../../../common/api/util/with_existing_migration_id';
import { withLicense } from '../../../../common/api/util/with_license';
import type { CreateSiemMigrationResourceInput } from '../../../../common/data/siem_migrations_data_resources_client';
import { getVendorProcessor } from '../../../vendors/get_vendor_processor';

export const registerSiemRuleMigrationsCreateQRadarRulesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_RULE_MIGRATION_QRADAR_RULES_PATH,
      access: 'internal',
      security: { authz },
      options: { body: { maxBytes: 25 * 1024 * 1024 } }, // rise payload limit to 25MB
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateQRadarRuleMigrationRulesRequestBody),
            params: buildRouteValidationWithZod(CreateQRadarRuleMigrationRulesRequestParams),
          },
        },
      },
      withLicense(
        withExistingMigration(async (context, req, res): Promise<IKibanaResponse> => {
          const { migration_id: migrationId } = req.params;
          const { xml } = req.body;
          const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
            context.securitySolution,
            'rules'
          );

          try {
            const ctx = await context.resolve(['securitySolution']);
            const ruleMigrationsClient = ctx.securitySolution.siemMigrations.getRulesClient();

            // Parse QRadar XML
            const parser = new QradarRulesXmlParser(xml);
            const qradarRules = await parser.getRules();

            const qRadarResources = await parser.getResources();

            if (!qradarRules || qradarRules.length === 0) {
              return res.badRequest({
                body: { message: 'No rules found in the provided XML' },
              });
            }

            const rulesCount = qradarRules.length;

            const VendorProcessor = getVendorProcessor('qradar');

            const rulesProcessor = new VendorProcessor({
              migrationId,
              dataClient: ruleMigrationsClient.data.items,
              logger,
            }).getProcessor('rules');

            const rulesToBeCreated = rulesProcessor(qradarRules);

            if (rulesCount === 0) {
              return res.badRequest({
                body: { message: 'No valid rules could be extracted from the XML' },
              });
            }

            const resourcesToBeCreated: CreateSiemMigrationResourceInput[] = [];

            if (Object.keys(qRadarResources)?.length > 0) {
              for (const resourceType of Object.keys(qRadarResources) as Array<
                keyof typeof qRadarResources
              >) {
                const resourceTypeList = qRadarResources[resourceType];

                if (resourceTypeList && resourceTypeList?.length > 0) {
                  const qRadarResourcesWithMigrationId = resourceTypeList.map((resource) => ({
                    ...resource,
                    type: resourceType,
                    migration_id: migrationId,
                  }));
                  resourcesToBeCreated.push(...qRadarResourcesWithMigrationId);
                }
              }
              await ruleMigrationsClient.data.resources.create(resourcesToBeCreated);
            }

            await siemMigrationAuditLogger.logAddRules({
              migrationId,
              count: rulesCount,
            });

            await ruleMigrationsClient.data.items.create(rulesToBeCreated);

            // TODO: Handle and report success and failures
            // For example,  {success: number, failed: number, errors: Array<{ruleId: string, error: string}>}
            return res.ok({
              body: {
                message: `Successfully imported ${rulesCount} QRadar rule${
                  rulesCount !== 1 ? 's' : ''
                }`,
              },
            });
          } catch (error) {
            logger.error(`Error processing QRadar XML: ${error.message}`);
            await siemMigrationAuditLogger.logAddRules({
              migrationId,
              count: 0,
              error,
            });
            return res.badRequest({
              body: { message: `Failed to parse QRadar XML: ${error.message}` },
            });
          }
        })
      )
    );
};
