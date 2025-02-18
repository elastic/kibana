/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { v4 as uuidV4 } from 'uuid';
import { SIEM_RULE_MIGRATION_CREATE_PATH } from '../../../../../common/siem_migrations/constants';
import {
  CreateRuleMigrationRequestBody,
  CreateRuleMigrationRequestParams,
  type CreateRuleMigrationResponse,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { ResourceIdentifier } from '../../../../../common/siem_migrations/rules/resources';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { CreateRuleMigrationInput } from '../data/rule_migrations_data_rules_client';
import { SiemMigrationAuditLogger } from './util/audit';
import { authz } from './util/authz';
import { withLicense } from './util/with_license';

export const registerSiemRuleMigrationsCreateRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_RULE_MIGRATION_CREATE_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateRuleMigrationRequestBody),
            params: buildRouteValidationWithZod(CreateRuleMigrationRequestParams),
          },
        },
      },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<CreateRuleMigrationResponse>> => {
          const originalRules = req.body;
          const migrationId = req.params.migration_id ?? uuidV4();
          const siemMigrationAuditLogger = new SiemMigrationAuditLogger(context.securitySolution);
          try {
            const [firstOriginalRule] = originalRules;
            if (!firstOriginalRule) {
              return res.noContent();
            }
            const ctx = await context.resolve(['securitySolution']);
            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();

            await siemMigrationAuditLogger.logCreateMigration({ migrationId });

            const ruleMigrations = originalRules.map<CreateRuleMigrationInput>((originalRule) => ({
              migration_id: migrationId,
              original_rule: originalRule,
            }));

            await ruleMigrationsClient.data.rules.create(ruleMigrations);

            // Create identified resource documents without content to keep track of them
            const resourceIdentifier = new ResourceIdentifier(firstOriginalRule.vendor);
            const resources = resourceIdentifier
              .fromOriginalRules(originalRules)
              .map((resource) => ({ ...resource, migration_id: migrationId }));

            if (resources.length > 0) {
              await ruleMigrationsClient.data.resources.create(resources);
            }

            return res.ok({ body: { migration_id: migrationId } });
          } catch (error) {
            logger.error(error);
            await siemMigrationAuditLogger.logCreateMigration({ migrationId, error });
            return res.badRequest({ body: error.message });
          }
        }
      )
    );
};
