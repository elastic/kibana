/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UPDATE_MISSING_INDEX_PATTERN = (numberOfRulesWithMissingIndex: number) => {
  return i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.table.updateMissingIndexPattern',
    {
      defaultMessage: 'Update missing index pattern ({numberOfRulesWithMissingIndex})',
      values: { numberOfRulesWithMissingIndex },
    }
  );
};

export const UPDATE_MISSING_INDEX_PATTERN_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.updateMissingIndexPatternButtonAriaLabel',
  {
    defaultMessage: 'Update missing index pattern',
  }
);

export const UPDATE_MISSING_INDEX_PATTERN_SELECTED_RULES = (numberOfSelectedRules: number) => {
  return i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.table.updateMissingIndexPatternSelectedRules',
    {
      defaultMessage: 'Update selected missing index pattern ({numberOfSelectedRules})',
      values: { numberOfSelectedRules },
    }
  );
};
