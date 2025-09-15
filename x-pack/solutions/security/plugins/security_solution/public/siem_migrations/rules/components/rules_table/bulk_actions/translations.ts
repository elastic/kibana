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
    defaultMessage: 'Reprocess rules ({numberOfFailedRules})',
    values: { numberOfFailedRules },
  });
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
