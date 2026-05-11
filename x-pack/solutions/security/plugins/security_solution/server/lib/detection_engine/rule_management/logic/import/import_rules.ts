/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BulkCreateOperationError } from '@kbn/alerting-plugin/server';
import type { ExperimentalFeatures } from '../../../../../../common';
import type { RuleToImport } from '../../../../../../common/api/detection_engine';
import { type ImportRuleResponse, createBulkErrorObject } from '../../../routes/utils';
import type { IRuleSourceImporter } from './rule_source_importer';
import type { IDetectionRulesClient } from '../detection_rules_client/detection_rules_client_interface';
import { isRuleConflictError, isRuleImportError } from './errors';

/**
 * Takes a stream of rules to be imported and either creates or updates rules
 * based on user overwrite preferences
 * @param ruleChunks {@link RuleToImport} - rules being imported
 * @param overwriteRules {boolean} - whether to overwrite existing rules
 * with imported rules if their rule_id matches
 * @param detectionRulesClient {object}
 * @param experimentalFeatures - feature flags; when `bulkCreateRulesEnabled` is on,
 *   per-chunk import is dispatched through `detectionRulesClient.bulkImportRules`
 *   (single bulk alerting call) instead of the per-rule loop. The bulk path
 *   defers post-create work (task scheduling, key invalidation, demotion
 *   bookkeeping); this orchestrator collects each chunk's deferred work and runs
 *   it serially in a detached task once all foreground batches have completed —
 *   the response itself is not held back.
 * @param logger - used to log failures from the detached background runner.
 * @returns {Promise} an array of error and success messages from import
 */
export const importRules = async ({
  ruleChunks,
  overwriteRules,
  detectionRulesClient,
  ruleSourceImporter,
  allowMissingConnectorSecrets,
  experimentalFeatures,
  logger,
}: {
  ruleChunks: RuleToImport[][];
  overwriteRules: boolean;
  detectionRulesClient: IDetectionRulesClient;
  ruleSourceImporter: IRuleSourceImporter;
  allowMissingConnectorSecrets?: boolean;
  experimentalFeatures?: ExperimentalFeatures;
  logger?: Logger;
}): Promise<ImportRuleResponse[]> => {
  const response: ImportRuleResponse[] = [];

  if (ruleChunks.length === 0) {
    return response;
  }

  const useBulk = experimentalFeatures?.bulkCreateRulesEnabled ?? false;
  const deferredBackgroundWork: Array<() => Promise<BulkCreateOperationError[]>> = [];

  for (const rules of ruleChunks) {
    let importedRulesResponse: Awaited<ReturnType<IDetectionRulesClient['importRules']>>;
    if (useBulk) {
      const bulkResult = await detectionRulesClient.bulkImportRules({
        allowMissingConnectorSecrets,
        overwriteRules,
        ruleSourceImporter,
        rules,
      });
      importedRulesResponse = bulkResult.responses;
      deferredBackgroundWork.push(bulkResult.backgroundWork);
    } else {
      importedRulesResponse = await detectionRulesClient.importRules({
        allowMissingConnectorSecrets,
        overwriteRules,
        ruleSourceImporter,
        rules,
      });
    }

    const importResponses = importedRulesResponse.map((rule) => {
      if (isRuleImportError(rule)) {
        return createBulkErrorObject({
          message: rule.error.message,
          statusCode: isRuleConflictError(rule) ? 409 : 400,
          ruleId: rule.error.ruleId,
        });
      }

      return {
        rule_id: rule.rule_id,
        status_code: 200,
      };
    });

    response.push(...importResponses);
  }

  // All foreground batches done — kick off background work serially, detached
  // from the request lifecycle so the caller's response isn't held back.
  // Inner thunks already swallow their own errors; the outer wrapper guards
  // against any unexpected throws so it always settles.
  if (deferredBackgroundWork.length > 0) {
    void (async () => {
      for (const work of deferredBackgroundWork) {
        try {
          await work();
        } catch (err) {
          logger?.error(
            `importRules: deferred background work threw unexpectedly: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }
    })();
  }

  return response;
};
