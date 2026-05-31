/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityRuleChangeTracking } from '../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { RuleToImport } from '../../../../../../common/api/detection_engine';
import { type ImportRuleResponse, createBulkErrorObject } from '../../../routes/utils';
import type { IRuleSourceImporter } from './rule_source_importer';
import type { IDetectionRulesClient } from '../detection_rules_client/detection_rules_client_interface';
import { isRuleConflictError, isRuleImportError } from './errors';

/**
 * Takes a list of rules to be imported and either creates or updates rules
 * based on user overwrite preferences
 * @param rules {@link RuleToImport} - rules being imported
 * @param overwriteRules {boolean} - whether to overwrite existing rules
 * with imported rules if their rule_id matches
 * @param detectionRulesClient {object}
 * @returns {Promise} an array of error and success messages from import
 */
export const importRules = async ({
  rules,
  changeTracking,
  overwriteRules,
  detectionRulesClient,
  ruleSourceImporter,
  allowMissingConnectorSecrets,
}: {
  rules: RuleToImport[];
  changeTracking?: SecurityRuleChangeTracking<never>;
  overwriteRules: boolean;
  detectionRulesClient: IDetectionRulesClient;
  ruleSourceImporter: IRuleSourceImporter;
  allowMissingConnectorSecrets?: boolean;
}): Promise<ImportRuleResponse[]> => {
  if (rules.length === 0) {
    return [];
  }

  const importedRulesResponse = await detectionRulesClient.importRules({
    allowMissingConnectorSecrets,
    overwriteRules,
    ruleSourceImporter,
    rules,
    changeTracking,
  });

  return importedRulesResponse.map((rule) => {
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
};
