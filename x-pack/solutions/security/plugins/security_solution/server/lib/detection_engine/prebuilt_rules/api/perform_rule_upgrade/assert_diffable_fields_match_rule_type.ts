/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiffableRuleTypes } from '../../../../../../common/api/detection_engine';
import { DIFFABLE_RULE_TYPE_FIELDS_MAP } from '../../../../../../common/api/detection_engine';

/**
 * Validates that the upgradeable (diffable) fields match the target rule type's diffable fields.
 *
 * This function is used in the rule upgrade process to ensure that the fields
 * specified for upgrade in the request body are valid for the target rule type.
 * It checks each upgradeable field provided in body.rule[].fields against the
 * set of diffable fields for the target rule type.
 *
 * @param {string[]} diffableFields - An array of field names to be upgraded.
 * @param {string} ruleType - A rule type (e.g., 'query', 'eql', 'machine_learning').
 * @throws {Error} If an upgradeable field is not valid for the target rule type.
 *
 * @examples
 * assertDiffableFieldsMatchRuleType(['kql_query', 'severity'], 'query');
 * assertDiffableFieldsMatchRuleType(['esql_query', 'description'], 'esql');
 * assertDiffableFieldsMatchRuleType(['machine_learning_job_id'], 'eql'); // throws error
 *
 * @see {@link DIFFABLE_RULE_TYPE_FIELDS_MAP} in diffable_rule.ts for the mapping of rule types to their diffable fields.
 */
export const assertDiffableFieldsMatchRuleType = (
  diffableFields: string[],
  ruleType: DiffableRuleTypes
) => {
  const diffableFieldsForType = new Set(DIFFABLE_RULE_TYPE_FIELDS_MAP.get(ruleType));
  for (const diffableField of diffableFields) {
    if (!diffableFieldsForType.has(diffableField)) {
      throw new Error(`${diffableField} is not a valid upgradeable field for type '${ruleType}'`);
    }
  }
};
