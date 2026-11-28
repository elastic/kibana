/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WORKFLOW_MIGRATION_READY_DESCRIPTION = (totalWorkflows: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.workflows.panel.ready.description', {
    defaultMessage: 'Migration of {totalWorkflows} workflows is created and ready to start.',
    values: { totalWorkflows },
  });

export const WORKFLOW_MIGRATION_ERROR_DESCRIPTION = (totalWorkflows: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.workflows.panel.error.description', {
    defaultMessage:
      'Migration of {totalWorkflows} workflows failed. Please correct the below error and try again.',
    values: { totalWorkflows },
  });

export const WORKFLOW_MIGRATION_STOPPED_DESCRIPTION = (totalWorkflows: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.workflows.panel.stopped.description', {
    defaultMessage:
      'Migration of {totalWorkflows} workflows was stopped, you can resume it any time.',
    values: { totalWorkflows },
  });

export const WORKFLOW_MIGRATION_COMPLETE_DESCRIPTION = (createdAt: string, finishedAt: string) =>
  i18n.translate('xpack.securitySolution.siemMigrations.workflows.panel.result.description', {
    defaultMessage: 'Stories uploaded on {createdAt} and translation finished {finishedAt}.',
    values: { createdAt, finishedAt },
  });

export const WORKFLOW_MIGRATION_COMPLETE_BADGE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.panel.result.badge',
  { defaultMessage: 'Translation complete' }
);

export const WORKFLOW_MIGRATION_VIEW_TRANSLATED_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.panel.result.viewButton',
  { defaultMessage: 'Go to translated workflows' }
);

export const WORKFLOW_MIGRATION_SUMMARY_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.migrationPanel.summaryTitle',
  { defaultMessage: 'Translation Summary' }
);

export const WORKFLOW_MIGRATION_SUMMARY_CHART_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.migrationPanel.summaryChartTitle',
  { defaultMessage: 'Workflows by translation status' }
);

export const WORKFLOW_MIGRATION_TRANSLATION_FAILED = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.migrationPanel.translationFailed',
  { defaultMessage: 'Failed' }
);

export const WORKFLOW_MIGRATION_TABLE_COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.migrationPanel.tableColumnStatus',
  { defaultMessage: 'Status' }
);

export const WORKFLOW_MIGRATION_TABLE_COLUMN_WORKFLOWS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.migrationPanel.tableColumnWorkflows',
  { defaultMessage: 'Workflows' }
);

export const WORKFLOW_MIGRATION_EXPAND = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.migrationPanel.expand',
  { defaultMessage: 'Expand workflow migration' }
);

export const WORKFLOW_MIGRATION_COLLAPSE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.migrationPanel.collapse',
  { defaultMessage: 'Collapse workflow migration' }
);
