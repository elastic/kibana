/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';
import type { SecurityRuleChangeTracking } from '../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { RuleToImport } from '../../../../../../common/api/detection_engine';
import { type ImportRuleResponse, createBulkErrorObject } from '../../../routes/utils';
import type { ImportRuleSuccess } from '../detection_rules_client/methods/import_rules';
import type { IDetectionRulesClient } from '../detection_rules_client/detection_rules_client_interface';
import { isRuleConflictError, isRuleImportError, type RuleImportErrorObject } from './errors';
import { RULE_IMPORT_BULK_CREATE_BATCH_SIZE } from '../../api/constants';

/**
 * Takes the parsed rules to be imported and either creates or updates rules
 * based on user overwrite preferences. Chunks at `RULE_IMPORT_BULK_CREATE_BATCH_SIZE`
 * so each call to `detectionRulesClient.importRules` — and the inner
 * `rulesClient.bulkCreateRules` — stays inside ES/alerting caps.
 */
export const importRules = async ({
  rules,
  changeTracking,
  overwriteRules,
  detectionRulesClient,
  allowMissingConnectorSecrets,
}: {
  rules: RuleToImport[];
  changeTracking?: SecurityRuleChangeTracking;
  overwriteRules: boolean;
  detectionRulesClient: IDetectionRulesClient;
  allowMissingConnectorSecrets?: boolean;
}): Promise<ImportRuleResponse[]> => {
  const response: ImportRuleResponse[] = [];

  if (rules.length === 0) {
    return response;
  }

  for (const batch of chunk(RULE_IMPORT_BULK_CREATE_BATCH_SIZE, rules)) {
    const { responses } = await detectionRulesClient.importRules({
      allowMissingConnectorSecrets,
      overwriteRules,
      rules: batch,
      changeTracking,
    });
    response.push(...responses.map(toImportRuleResponse));
  }

  return response;
};

const toImportRuleResponse = (
  rule: ImportRuleSuccess | RuleImportErrorObject
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
