/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SEARCH_MIGRATION_RULES = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.searchAriaLabel',
  {
    defaultMessage: 'Search migration rules',
  }
);

export const SEARCH_MIGRATION_RULES_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.searchBarPlaceholder',
  {
    defaultMessage: 'Search by migration rule name',
  }
);

export const NO_TRANSLATIONS_AVAILABLE_FOR_INSTALL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.noRulesTitle',
  {
    defaultMessage: 'Empty migration',
  }
);

export const NO_TRANSLATIONS_AVAILABLE_FOR_INSTALL_BODY = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.noRulesBodyTitle',
  {
    defaultMessage: 'There are no translations available for installation',
  }
);

export const GO_BACK_TO_RULES_TABLE_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.goToAutomaticMigrationsPageButton',
  {
    defaultMessage: 'Go back to Automatic Migrations',
  }
);

export const ALREADY_TRANSLATED_RULE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.alreadyTranslatedTooltip',
  {
    defaultMessage: 'Already translated migration rule',
  }
);

export const NOT_FULLY_TRANSLATED_RULE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.notFullyTranslatedTooltip',
  {
    defaultMessage: 'Not fully translated migration rule',
  }
);

export const INSTALL_WITHOUT_ENABLING_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.installWithoutEnablingButtonLabel',
  {
    defaultMessage: 'Install without enabling',
  }
);

export const INSTALL_AND_ENABLE_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.installAndEnableButtonLabel',
  {
    defaultMessage: 'Install and enable',
  }
);

export const REPROCESS_RULES_DIALOG_TITLE = (count: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.rules.table.reprocessRulesDialog.title', {
    defaultMessage: 'Reprocess {count} {count, plural, one {rule} other {rules}}',
    values: { count },
  });

export const REPROCESS_RULES_DIALOG_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.reprocessRulesDialog.description',
  {
    defaultMessage:
      "You are about to reprocess selected rules and this will incur additional tokens. You have option to choose a different LLM and to switch off mapping to Elastic's prebuilt rules. These options apply only to the current execution.",
  }
);

export const START_RULE_MIGRATION_MODAL_AI_CONNECTOR_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.startRuleMigrationModal.aiConnectorLabel',
  {
    defaultMessage: 'AI connector',
  }
);

export const START_RULE_MIGRATION_MODAL_SETUP_NEW_AI_CONNECTOR_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.startRuleMigrationModal.setupNewAiConnectorHelpText',
  {
    defaultMessage: 'Configure AI Provider',
  }
);

export const START_RULE_MIGRATION_MODAL_PREBUILT_RULES_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.startRuleMigrationModal.prebuiltRulesLabel',
  {
    defaultMessage: 'Match to Elastic prebuilt rules',
  }
);

export const START_RULE_MIGRATION_MODAL_TRANSLATE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.startRuleMigrationModal.translate',
  {
    defaultMessage: 'Translate',
  }
);

export const START_RULE_MIGRATION_MODAL_CANCEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.startRuleMigrationModal.cancel',
  {
    defaultMessage: 'Cancel',
  }
);
