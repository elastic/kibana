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

export const RULE_MIGRATION_READY_MISSING_RESOURCES_SPLUNK = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.ready.missingResources.splunk',
  { defaultMessage: 'You can also upload the missing macros & lookups for more accurate results.' }
);

export const RULE_MIGRATION_READY_MISSING_RESOURCES_QRADAR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.ready.missingResources.qradar',
  {
    defaultMessage:
      'You can also upload the missing reference sets and enhancements for more accurate results.',
  }
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

export const RULE_MIGRATION_UPLOAD_MISSING_RESOURCES_SPLUNK_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.uploadMissingResources',
  { defaultMessage: 'Upload missing macros and lookup lists.' }
);

export const RULE_MIGRATION_UPLOAD_MISSING_RESOURCES_QRADAR_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.qradar.uploadMissingResources',
  { defaultMessage: 'Upload missing reference sets and rule enhancements' }
);

export const RULE_MIGRATION_UPLOAD_MISSING_RESOURCES_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.uploadMissingResourcesDescription',
  {
    defaultMessage: 'Click Upload to continue translating rules',
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
