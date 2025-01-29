/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { chunk, partition } from 'lodash/fp';
import { extname } from 'path';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  ImportRulesRequestQuery,
  ImportRulesResponse,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { DETECTION_ENGINE_RULES_IMPORT_URL } from '../../../../../../../common/constants';
import type { ConfigType } from '../../../../../../config';
import type { HapiReadableStream, SecuritySolutionPluginRouter } from '../../../../../../types';
import type { ImportRuleResponse } from '../../../../routes/utils';
import {
  buildSiemResponse,
  createBulkErrorObject,
  isBulkError,
  isImportRegular,
} from '../../../../routes/utils';
import { createPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { importRuleActionConnectors } from '../../../logic/import/action_connectors/import_rule_action_connectors';
import { createRuleSourceImporter } from '../../../logic/import/rule_source_importer';
import { importRules } from '../../../logic/import/import_rules';
// eslint-disable-next-line no-restricted-imports
import { importRulesLegacy } from '../../../logic/import/import_rules_legacy';
import { createPromiseFromRuleImportStream } from '../../../logic/import/create_promise_from_rule_import_stream';
import { importRuleExceptions } from '../../../logic/import/import_rule_exceptions';
import { isRuleToImport } from '../../../logic/import/utils';
import {
  getTupleDuplicateErrorsAndUniqueRules,
  migrateLegacyActionsIds,
} from '../../../utils/utils';
import { RULE_MANAGEMENT_IMPORT_EXPORT_SOCKET_TIMEOUT_MS } from '../../timeouts';

const CHUNK_PARSED_OBJECT_SIZE = 50;

export const importRulesRoute = (router: SecuritySolutionPluginRouter, config: ConfigType) => {
  router.versioned
    .post({
      access: 'public',
      path: DETECTION_ENGINE_RULES_IMPORT_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: {
        body: {
          maxBytes: config.maxRuleImportPayloadBytes,
          output: 'stream',
        },
        timeout: {
          idleSocket: RULE_MANAGEMENT_IMPORT_EXPORT_SOCKET_TIMEOUT_MS,
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: buildRouteValidationWithZod(ImportRulesRequestQuery),
            body: schema.any(), // validation on file object is accomplished later in the handler.
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ImportRulesResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve([
            'core',
            'securitySolution',
            'alerting',
            'actions',
            'lists',
            'licensing',
          ]);

          const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();
          const { isRulesCustomizationEnabled } = detectionRulesClient.getRuleCustomizationStatus();
          const actionsClient = ctx.actions.getActionsClient();
          const actionSOClient = ctx.core.savedObjects.getClient({
            includedHiddenTypes: ['action'],
          });
          const actionsImporter = ctx.core.savedObjects.getImporter(actionSOClient);

          const savedObjectsClient = ctx.core.savedObjects.client;
          const exceptionsClient = ctx.lists?.getExceptionListClient();

          const { filename } = (request.body.file as HapiReadableStream).hapi;
          const fileExtension = extname(filename).toLowerCase();
          if (fileExtension !== '.ndjson') {
            return siemResponse.error({
              statusCode: 400,
              body: `Invalid file extension ${fileExtension}`,
            });
          }

          const objectLimit = config.maxRuleImportExportSize;

          // parse file to separate out exceptions from rules
          const [{ exceptions, rules, actionConnectors }] = await createPromiseFromRuleImportStream(
            { stream: request.body.file as HapiReadableStream, objectLimit }
          );

          // import exceptions, includes validation
          const {
            errors: exceptionsErrors,
            successCount: exceptionsSuccessCount,
            success: exceptionsSuccess,
          } = await importRuleExceptions({
            exceptions,
            exceptionsClient,
            overwrite: request.query.overwrite_exceptions,
            maxExceptionsImportSize: objectLimit,
          });
          // report on duplicate rules
          const [duplicateIdErrors, parsedObjectsWithoutDuplicateErrors] =
            getTupleDuplicateErrorsAndUniqueRules(rules, request.query.overwrite);

          const migratedParsedObjectsWithoutDuplicateErrors = await migrateLegacyActionsIds(
            parsedObjectsWithoutDuplicateErrors,
            actionSOClient,
            actionsClient
          );

          // import actions-connectors
          const {
            successCount: actionConnectorSuccessCount,
            success: actionConnectorSuccess,
            warnings: actionConnectorWarnings,
            errors: actionConnectorErrors,
            rulesWithMigratedActions,
          } = await importRuleActionConnectors({
            actionConnectors,
            actionsClient,
            actionsImporter,
            rules: migratedParsedObjectsWithoutDuplicateErrors,
            overwrite: request.query.overwrite_action_connectors,
          });

          // rulesWithMigratedActions: Is returned only in case connectors were exported from different namespace and the
          // original rules actions' ids were replaced with new destinationIds
          const parsedRuleStream = actionConnectorErrors.length
            ? []
            : rulesWithMigratedActions || migratedParsedObjectsWithoutDuplicateErrors;

          const ruleSourceImporter = createRuleSourceImporter({
            config,
            context: ctx.securitySolution,
            prebuiltRuleAssetsClient: createPrebuiltRuleAssetsClient(savedObjectsClient),
            ruleCustomizationStatus: detectionRulesClient.getRuleCustomizationStatus(),
          });

          const [parsedRules, parsedRuleErrors] = partition(isRuleToImport, parsedRuleStream);
          const ruleChunks = chunk(CHUNK_PARSED_OBJECT_SIZE, parsedRules);

          let importRuleResponse: ImportRuleResponse[] = [];

          if (isRulesCustomizationEnabled) {
            importRuleResponse = await importRules({
              ruleChunks,
              overwriteRules: request.query.overwrite,
              allowMissingConnectorSecrets: !!actionConnectors.length,
              ruleSourceImporter,
              detectionRulesClient,
            });
          } else {
            importRuleResponse = await importRulesLegacy({
              ruleChunks,
              overwriteRules: request.query.overwrite,
              allowMissingConnectorSecrets: !!actionConnectors.length,
              detectionRulesClient,
              savedObjectsClient,
            });
          }

          const parseErrors = parsedRuleErrors.map((error) =>
            createBulkErrorObject({
              statusCode: 400,
              message: error.message,
            })
          );
          const importErrors = importRuleResponse.filter(isBulkError);
          const errors = [
            ...parseErrors,
            ...actionConnectorErrors,
            ...duplicateIdErrors,
            ...importErrors,
          ];

          const successes = importRuleResponse.filter((resp) => {
            if (isImportRegular(resp)) {
              return resp.status_code === 200;
            } else {
              return false;
            }
          });

          const importRulesResponse: ImportRulesResponse = {
            success: errors.length === 0,
            success_count: successes.length,
            rules_count: rules.length,
            errors,
            exceptions_errors: exceptionsErrors,
            exceptions_success: exceptionsSuccess,
            exceptions_success_count: exceptionsSuccessCount,
            action_connectors_success: actionConnectorSuccess,
            action_connectors_success_count: actionConnectorSuccessCount,
            action_connectors_errors: actionConnectorErrors,
            action_connectors_warnings: actionConnectorWarnings,
          };

          return response.ok({ body: ImportRulesResponse.parse(importRulesResponse) });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
