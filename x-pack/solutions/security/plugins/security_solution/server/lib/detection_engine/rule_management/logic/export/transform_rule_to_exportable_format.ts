/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';

/**
 * Transforms a rule object to exportable format. Exportable format shouldn't contain runtime fields like
 * `execution_summary`
 */
export const transformRuleToExportableFormat = (
  rule: RuleResponse
): Omit<RuleResponse, 'execution_summary'> => {
  const exportedRule = {
    ...rule,
  };

  // Fields containing runtime information shouldn't be exported. It causes import failures.
  delete exportedRule.execution_summary;

  return exportedRule;
};
