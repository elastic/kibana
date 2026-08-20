/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleSource,
  RuleToImport,
  ValidatedRuleToImport,
} from '../../../../../../../../common/api/detection_engine';

export interface ImportRuleSuccess {
  rule_id: string;
}

export interface ImportRulesResult {
  responses: Array<ImportRuleSuccess | RuleImportErrorObject>;
}

export type RuleImportErrorType = 'conflict' | 'unknown';

/**
 * Generic interface representing a server-side failure during rule import.
 * Used by utilities that import rules or related entities.
 *
 * NOTE that this does not inherit from Error
 */
export interface RuleImportErrorObject {
  error: {
    ruleId: string;
    message: string;
    type: RuleImportErrorType;
  };
}

// Survivors of per-rule validation that proceed to conflict classification.
export interface ImportableRuleData {
  rule: ValidatedRuleToImport;
  immutable: boolean;
  ruleSource: RuleSource;
  exceptionsList: RuleToImport['exceptions_list'];
}
