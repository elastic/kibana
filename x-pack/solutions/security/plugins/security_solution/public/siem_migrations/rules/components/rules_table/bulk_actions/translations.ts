/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INSTALL_SELECTED_RULES = (numberOfSelectedRules: number) => {
  return i18n.translate('xpack.securitySolution.siemMigrations.rules.table.installSelectedRules', {
    defaultMessage: 'Install selected ({numberOfSelectedRules})',
    values: { numberOfSelectedRules },
  });
};

export const REPROCESS_FAILED_RULES = (numberOfFailedRules: number) => {
  return i18n.translate('xpack.securitySolution.siemMigrations.rules.table.reprocessFailedRules', {
    defaultMessage: 'Reprocess failed ({numberOfFailedRules})',
    values: { numberOfFailedRules },
  });
};

export const REPROCESS_FAILED_SELECTED_RULES = (numberOfSelectedRules: number) => {
  return i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.table.reprocessFailedSelectedRules',
    {
      defaultMessage: 'Reprocess selected failed ({numberOfSelectedRules})',
      values: { numberOfSelectedRules },
    }
  );
};

export const INSTALL_SELECTED_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.installSelectedButtonAriaLabel',
  {
    defaultMessage: 'Install selected translated rules',
  }
);

export const INSTALL_TRANSLATED_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.installTranslatedButtonAriaLabel',
  {
    defaultMessage: 'Install all translated rules',
  }
);

export const INSTALL_TRANSLATED_RULES = (numberOfAllRules: number) => {
  return i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.table.installTranslatedRules',
    {
      defaultMessage: 'Install translated ({numberOfAllRules})',
      values: { numberOfAllRules },
    }
  );
};

export const INSTALL_TRANSLATED_RULES_EMPTY_STATE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.installTranslatedRulesEmptyState',
  {
    defaultMessage: 'Install translated',
  }
);

export const REPROCESS_FAILED_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.reprocessFailedRulesButtonAriaLabel',
  {
    defaultMessage: 'Reprocess failed',
  }
);

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

export const UPDATE_MISSING_INDEX_PATTERN_SELECTED_RULES_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.updateMissingIndexPatternSelectedRulesButtonAriaLabel',
  {
    defaultMessage: 'Update selected missing index pattern',
  }
);
