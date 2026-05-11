/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '../../../../../../common';
import type { RuleResponse, RuleToImport } from '../../../../../../common/api/detection_engine';
import { type ImportRuleResponse, createBulkErrorObject } from '../../../routes/utils';
import type { IRuleSourceImporter } from './rule_source_importer';
import type { IDetectionRulesClient } from '../detection_rules_client/detection_rules_client_interface';
import {
  createRuleImportErrorObject,
  isRuleConflictError,
  isRuleImportError,
  type RuleImportErrorObject,
} from './errors';

/**
 * Takes a stream of rules to be imported and either creates or updates rules
 * based on user overwrite preferences
 * @param ruleChunks {@link RuleToImport} - rules being imported
 * @param overwriteRules {boolean} - whether to overwrite existing rules
 * with imported rules if their rule_id matches
 * @param detectionRulesClient {object}
 * @param experimentalFeatures - feature flags; when `bulkCreateRulesEnabled` is on,
 *   per-chunk import is dispatched through `detectionRulesClient.bulkImportRules`
 *   (single bulk alerting call) instead of the per-rule loop.
 * @returns {Promise} an array of error and success messages from import
 */
export const importRules = async ({
  ruleChunks,
  overwriteRules,
  detectionRulesClient,
  ruleSourceImporter,
  allowMissingConnectorSecrets,
  experimentalFeatures,
}: {
  ruleChunks: RuleToImport[][];
  overwriteRules: boolean;
  detectionRulesClient: IDetectionRulesClient;
  ruleSourceImporter: IRuleSourceImporter;
  allowMissingConnectorSecrets?: boolean;
  experimentalFeatures?: ExperimentalFeatures;
}): Promise<ImportRuleResponse[]> => {
  const response: ImportRuleResponse[] = [];

  if (ruleChunks.length === 0) {
    return response;
  }

  const useBulk = experimentalFeatures?.bulkCreateRulesEnabled ?? false;

  if (!useBulk) {
    for (const rules of ruleChunks) {
      const importedRulesResponse = await detectionRulesClient.importRules({
        allowMissingConnectorSecrets,
        overwriteRules,
        ruleSourceImporter,
        rules,
      });
      response.push(...importedRulesResponse.map(toImportRuleResponse));
    }
    return response;
  }

  const pendingTaskIds: string[] = [];

  for (const rules of ruleChunks) {
    try {
      const result = await detectionRulesClient.bulkImportRules({
        allowMissingConnectorSecrets,
        overwriteRules,
        ruleSourceImporter,
        rules,
        skipTaskEnabling: true,
      });
      response.push(...result.responses.map(toImportRuleResponse));
      pendingTaskIds.push(...result.taskIdsFailedToBeEnabled);
    } catch (err) {
      // Hard chunk failure: continue so prior chunks' rules still get enabled.
      const message = err instanceof Error ? err.message : String(err);
      for (const rule of rules) {
        response.push(
          toImportRuleResponse(createRuleImportErrorObject({ ruleId: rule.rule_id, message }))
        );
      }
    }
  }

  if (pendingTaskIds.length === 0) {
    return response;
  }

  const pushTaskEnableFailures = (taskIds: string[], message: string) => {
    for (const taskId of taskIds) {
      response.push(toImportRuleResponse(createRuleImportErrorObject({ ruleId: taskId, message })));
    }
  };

  try {
    const { taskIdsFailedToBeEnabled } = await detectionRulesClient.bulkEnableTasks(pendingTaskIds);
    pushTaskEnableFailures(
      taskIdsFailedToBeEnabled,
      'Rule was created but its task could not be enabled; please retry enable.'
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    pushTaskEnableFailures(
      pendingTaskIds,
      `Rule was created but its task could not be enabled: ${message}. Please retry enable.`
    );
  }

  return response;
};

const toImportRuleResponse = (rule: RuleResponse | RuleImportErrorObject): ImportRuleResponse => {
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
};
