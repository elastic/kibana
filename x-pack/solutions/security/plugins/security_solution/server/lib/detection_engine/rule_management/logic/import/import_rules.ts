/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityRuleChangeTracking } from '../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { ExperimentalFeatures } from '../../../../../../common';
import type { RuleToImport } from '../../../../../../common/api/detection_engine';
import { type ImportRuleResponse, createBulkErrorObject } from '../../../routes/utils';
import type { BulkImportRuleSuccess } from '../detection_rules_client/methods/bulk_import_rules';
import type { IRuleSourceImporter } from './rule_source_importer';
import type { IDetectionRulesClient } from '../detection_rules_client/detection_rules_client_interface';
import { isRuleConflictError, isRuleImportError, type RuleImportErrorObject } from './errors';

/**
 * Takes a stream of rules to be imported and either creates or updates rules
 * based on user overwrite preferences
 * @param ruleChunks {@link RuleToImport} - rules being imported
 * @param overwriteRules {boolean} - whether to overwrite existing rules
 * with imported rules if their rule_id matches
 * @param detectionRulesClient {object}
 * @param experimentalFeatures - feature flags; in particular `bulkCreateRulesEnabled`
 * @returns {Promise} an array of error and success messages from import
 */
export const importRules = async ({
  ruleChunks,
  changeTracking,
  overwriteRules,
  detectionRulesClient,
  ruleSourceImporter,
  allowMissingConnectorSecrets,
  experimentalFeatures,
}: {
  ruleChunks: RuleToImport[][];
  changeTracking?: SecurityRuleChangeTracking<never>;
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
        changeTracking,
      });
      response.push(...importedRulesResponse.map(toImportRuleResponse));
    }
    return response;
  }

  const allRules = ruleChunks.flat();
  const { responses } = await detectionRulesClient.bulkImportRules({
    allowMissingConnectorSecrets,
    overwriteRules,
    ruleSourceImporter,
    rules: allRules,
    changeTracking,
  });
  response.push(...responses.map(toImportRuleResponse));

  return response;
};

const toImportRuleResponse = (
  rule: BulkImportRuleSuccess | RuleImportErrorObject
): ImportRuleResponse => {
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
