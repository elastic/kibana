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
  return i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.table.reprocessAllFailedRules',
    {
      defaultMessage: 'Reprocess all failed rules ({numberOfFailedRules})',
      values: { numberOfFailedRules },
    }
  );
};

export const REPROCESS_FAILED_SELECTED_RULES = (numberOfSelectedFailedRules: number) => {
  return i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.table.reprocessFailedSelectedRules',
    {
      defaultMessage: 'Reprocess selected rules ({numberOfSelectedFailedRules})',
      values: { numberOfSelectedFailedRules },
    }
  );
};

export const REPROCESS_FAILED_RULES_ACTION_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.reprocessFailedRulesActionLabel',
  {
    defaultMessage: 'Reprocess rules',
  }
);

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
      defaultMessage:
        'Install translated {numberOfAllRules, plural, one {rule} other {rules}} ({numberOfAllRules})',
      values: { numberOfAllRules },
    }
  );
};

export const INSTALL_TRANSLATED_RULES_EMPTY_STATE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.installTranslatedRulesEmptyState',
  {
    defaultMessage: 'Install translated rules',
  }
);

export const REPROCESS_FAILED_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.reprocessFailedRulesButtonAriaLabel',
  {
    defaultMessage: 'Reprocess failed rules',
  }
);

export const CLEAR_SELECT_ALL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.clearSelectAllButton',
  {
    defaultMessage: 'Clear select all',
  }
);

export const CLEAR_SELECT_ALL_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.clearSelectAllButtonAriaLabel',
  {
    defaultMessage: 'Clear select all',
  }
);

export const UPDATE_INDEX_PATTERN_OF_SELECTED_RULES = (numberOfSelectedRules: number) =>
  i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.table.updateIndexPatternOfSelectedRules',
    {
      defaultMessage:
        'Update index pattern of {numberOfSelectedRules, plural, one {rule} other {rules}} ({numberOfSelectedRules})',
      values: { numberOfSelectedRules },
    }
  );

export const UPDATE_INDEX_PATTERN = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.updateIndexPattern',
  {
    defaultMessage: 'Update index pattern',
  }
);

export const UPDATE_INDEX_PATTERN_OF_SELECTED_RULES_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.updateIndexPatternOfSelectedRulesButtonAriaLabel',
  {
    defaultMessage: 'Update index pattern of selected rules',
  }
);

export const UPDATE_INDEX_PATTERN_ALL_RULES_WITH_MISSING_INDEX_PATTERN = (
  numberOfRulesWithMissingIndex: number
) =>
  i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.table.updateIndexPatternOfAllRulesWithMissingIndexPattern',
    {
      defaultMessage:
        'Update index pattern of all rules with missing index pattern ({numberOfRulesWithMissingIndex})',
      values: { numberOfRulesWithMissingIndex },
    }
  );

export const UPDATE_INDEX_PATTERN_ALL_RULES_WITH_MISSING_INDEX_PATTERN_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.updateIndexPatternOfAllRulesWithMissingIndexPatternButtonAriaLabel',
  {
    defaultMessage: 'Update index pattern of all rules with missing index pattern',
  }
);

export const BULK_ACTIONS = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.bulkActions',
  {
    defaultMessage: 'Bulk actions',
  }
);
