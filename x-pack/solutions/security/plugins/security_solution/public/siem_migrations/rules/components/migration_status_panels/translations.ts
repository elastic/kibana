/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_MIGRATION_READY_DESCRIPTION = (totalRules: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.rules.panel.ready.description', {
    defaultMessage: 'Migration of {totalRules} rules is created and ready to start.',
    values: { totalRules },
  });

export const RULE_MIGRATION_ERROR_DESCRIPTION = (totalRules: number) => {
  return i18n.translate('xpack.securitySolution.siemMigrations.rules.panel.error.description', {
    defaultMessage:
      'Migration of {totalRules} rules failed. Please correct the below error and try again.',
    values: { totalRules },
  });
};

export const RULE_MIGRATION_STOPPED_DESCRIPTION = (totalRules: number) => {
  return i18n.translate('xpack.securitySolution.siemMigrations.rules.panel.stopped.description', {
    defaultMessage: 'Migration of {totalRules} rules was stopped, you can resume it any time.',
    values: { totalRules },
  });
};

export const RULE_MIGRATION_READY_MISSING_RESOURCES = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.ready.missingResources',
  { defaultMessage: 'You can also upload the missing macros & lookups for more accurate results.' }
);

export const RULE_MIGRATION_START_TRANSLATION_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.translate.startButton',
  { defaultMessage: 'Start' }
);
export const RULE_MIGRATION_STARTING_TRANSLATION_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.translate.startingButton',
  { defaultMessage: 'Starting' }
);
export const RULE_MIGRATION_STOP_TRANSLATION_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.translate.stopButton',
  { defaultMessage: 'Stop' }
);
export const RULE_MIGRATION_STOPPING_TRANSLATION_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.translate.stoppingButton',
  { defaultMessage: 'Stopping' }
);
export const RULE_MIGRATION_RESUME_TRANSLATION_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.translate.resumeButton',
  { defaultMessage: 'Resume' }
);
export const RULE_MIGRATION_RESUMING_TRANSLATION_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.translate.resumingButton',
  { defaultMessage: 'Resuming' }
);

export const RULE_MIGRATION_PROGRESS_DESCRIPTION = (totalRules: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.rules.panel.progress.description', {
    defaultMessage: `Processing migration of {totalRules} rules.`,
    values: { totalRules },
  });
export const RULE_MIGRATION_IN_PROGRESS_BADGE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.progress.badge',
  { defaultMessage: `Translation in progress` }
);
export const RULE_MIGRATION_PREPARING = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.progress.preparing',
  { defaultMessage: `Preparing environment for the AI powered translation.` }
);
export const RULE_MIGRATION_TRANSLATING = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.progress.translating',
  { defaultMessage: `Translating rules` }
);

export const RULE_MIGRATION_COMPLETE_DESCRIPTION = (createdAt: string, finishedAt: string) =>
  i18n.translate('xpack.securitySolution.siemMigrations.rules.panel.result.description', {
    defaultMessage: 'Export uploaded on {createdAt} and translation finished {finishedAt}.',
    values: { createdAt, finishedAt },
  });

export const RULE_MIGRATION_COMPLETE_BADGE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.result.badge',
  { defaultMessage: `Translation complete` }
);
export const RULE_MIGRATION_SUMMARY_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.result.summary.title',
  { defaultMessage: 'Translation Summary' }
);

export const RULE_MIGRATION_SUMMARY_CHART_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.result.summary.chartTitle',
  { defaultMessage: 'Rules by translation status' }
);

export const RULE_MIGRATION_VIEW_TRANSLATED_RULES_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.result.summary.button',
  { defaultMessage: 'View rules' }
);

export const RULE_MIGRATION_TRANSLATION_FAILED = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.result.summary.failed',
  { defaultMessage: 'Failed' }
);

export const RULE_MIGRATION_TABLE_COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.result.summary.tableColumn.status',
  { defaultMessage: 'Status' }
);
export const RULE_MIGRATION_TABLE_COLUMN_RULES = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.result.summary.tableColumn.rules',
  { defaultMessage: 'Rules' }
);

export const RULE_MIGRATION_UPLOAD_MISSING_RESOURCES_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.uploadMissingResources',
  { defaultMessage: 'Upload missing macros and lookup lists.' }
);
export const RULE_MIGRATION_UPLOAD_MISSING_RESOURCES_DESCRIPTION = (partialRulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.panel.uploadMissingResourcesDescription',
    {
      defaultMessage: 'Click Upload to continue translating {partialRulesCount} rules',
      values: { partialRulesCount },
    }
  );

export const RULE_MIGRATION_UPLOAD_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.uploadMacros.button',
  { defaultMessage: 'Upload' }
);

export const RULE_MIGRATION_EXPAND = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.expand',
  { defaultMessage: 'Expand rule migration' }
);
export const RULE_MIGRATION_COLLAPSE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.collapse',
  { defaultMessage: 'Collapse rule migration' }
);
export const RULE_MIGRATION_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.error',
  { defaultMessage: 'The last execution of this migration failed with the following message:' }
);

export const OPEN_MIGRATION_OPTIONS_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.openMigrationOptionsButton',
  { defaultMessage: 'Open migration options' }
);
export const RENAME_MIGRATION_TEXT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.renameMigrationText',
  { defaultMessage: 'Rename' }
);

export const DELETE_BUTTON_TEXT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.deleteButtonText',
  { defaultMessage: 'Delete' }
);

export const DELETE_MIGRATION_TEXT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.deleteMigrationText',
  { defaultMessage: 'Delete Migration' }
);
export const NOT_DELETABLE_MIGRATION_TEXT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.notDeletableMigrationText',
  { defaultMessage: 'Can not delete running migrations' }
);

export const CANCEL_DELETE_MIGRATION_TEXT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.cancelDeleteMigrationText',
  { defaultMessage: 'Cancel' }
);

export const DELETE_MIGRATION_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.delete.title',
  { defaultMessage: 'Are you sure you want to delete this migration?' }
);

export const DELETE_MIGRATION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.delete.description',
  {
    defaultMessage:
      'This action cannot be undone. All translations related to this migration will be removed permanently.',
  }
);
export const RENAME_MIGRATION_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.renameMigrationButton',
  { defaultMessage: 'Rename' }
);
