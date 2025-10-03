/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const START_RULES_MIGRATION_DIALOG_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.startMigrationDialog.title',
  {
    defaultMessage: 'Start rules migration',
  }
);

export const START_RULES_MIGRATION_DIALOG_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.startMigrationDialog.description',
  {
    defaultMessage:
      "You are about to start rules migration and this will incur additional tokens. You have option to choose a different LLM and to switch off mapping to Elastic's prebuilt rules. These options apply only to the current execution.",
  }
);

export const RETRY_RULES_MIGRATION_DIALOG_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.retryMigrationDialog.title',
  {
    defaultMessage: 'Retry rules migration',
  }
);

export const RETRY_RULES_MIGRATION_DIALOG_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.retryMigrationDialog.description',
  {
    defaultMessage:
      "You are about to retry rules migration and this will incur additional tokens. You have option to choose a different LLM and to switch off mapping to Elastic's prebuilt rules. These options apply only to the current execution.",
  }
);

export const REPROCESS_RULES_MIGRATION_DIALOG_TITLE = (count: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.rules.reprocessDialog.title', {
    defaultMessage: 'Reprocess {count} {count, plural, one {rule} other {rules}}',
    values: { count },
  });

export const REPROCESS_RULES_MIGRATION_DIALOG_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.reprocessDialog.description',
  {
    defaultMessage:
      "You are about to reprocess selected rules and this will incur additional tokens. You have option to choose a different LLM and to switch off mapping to Elastic's prebuilt rules. These options apply only to the current execution.",
  }
);

export const START_RULES_MIGRATION_DIALOG_PREBUILT_RULES_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.startMigrationDialog.prebuiltRulesLabel',
  {
    defaultMessage: 'Match to Elastic prebuilt rules',
  }
);
