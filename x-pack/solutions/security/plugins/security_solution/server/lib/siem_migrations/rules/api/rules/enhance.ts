/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SIEM_RULE_MIGRATION_RULES_ENHANCE_PATH } from '../../../../../../common/siem_migrations/constants';
import type {
  EnhanceRuleMigrationResponse,
  EnhanceRuleMigrationQRadarMitreRequest,
} from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { authz } from '../../../common/api/util/authz';
import { SiemMigrationAuditLogger } from '../../../common/api/util/audit';
import { withLicense } from '../../../common/api/util/with_license';
import { withExistingMigration } from '../../../common/api/util/with_existing_migration_id';
import { QRadarMitreProcessor } from '../../vendors/qradar/qradar_mitre_processor';
import type { VendorProcessor } from '../../vendors/types';
import {
  EnhanceRuleMigrationsRequestBody,
  EnhanceRuleMigrationsRequestParams,
} from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';

export const registerSiemRuleMigrationsEnhanceRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_RULE_MIGRATION_RULES_ENHANCE_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(EnhanceRuleMigrationsRequestParams),
            body: buildRouteValidationWithZod(EnhanceRuleMigrationsRequestBody),
          },
        },
      },
      withLicense(
        withExistingMigration(
          async (context, req, res): Promise<IKibanaResponse<EnhanceRuleMigrationResponse>> => {
            const { migration_id: migrationId } = req.params;
            const requestBody = req.body as EnhanceRuleMigrationQRadarMitreRequest;

            const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
              context.securitySolution,
              'rules'
            );

            try {
              const ctx = await context.resolve(['securitySolution']);
              const ruleMigrationsClient = ctx.securitySolution.siemMigrations.getRulesClient();
              const dataClient = ruleMigrationsClient.data.items;

              // Create vendor processor based on request
              let processor: VendorProcessor;

              if (requestBody.vendor === 'qradar' && requestBody.enhancement_type === 'mitre') {
                processor = new QRadarMitreProcessor({
                  migrationId,
                  dataClient,
                  logger,
                });
              } else {
                return res.badRequest({
                  body: {
                    message: `Unsupported vendor/enhancement combination: ${requestBody.vendor}/${requestBody.enhancement_type}`,
                  },
                });
              }

              await siemMigrationAuditLogger.logEnhanceRules({
                migrationId,
                vendor: requestBody.vendor,
                enhancementType: requestBody.enhancement_type,
              });

              // Process the enhancement data
              const result = await processor.process(requestBody.data);

              logger.info(
                `Enhanced ${result.updated} rules for migration ${migrationId}, ${result.errors.length} errors`
              );

              return res.ok({
                body: {
                  updated: true,
                },
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              logger.error(`Error enhancing rules for migration ${migrationId}: ${errorMessage}`);
              await siemMigrationAuditLogger.logEnhanceRules({
                migrationId,
                vendor: requestBody.vendor,
                enhancementType: requestBody.enhancement_type,
                error,
              });
              return res.badRequest({
                body: { message: `Failed to enhance rules: ${errorMessage}` },
              });
            }
          }
        )
      )
    );
};
