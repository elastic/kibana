/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DASHBOARD_MIGRATION_READY_DESCRIPTION = (totaldashboards: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.dashboards.panel.ready.description', {
    defaultMessage: 'Migration of {totaldashboards} dashboards is created and ready to start.',
    values: { totaldashboards },
  });

export const DASHBOARD_MIGRATION_ERROR_DESCRIPTION = (totaldashboards: number) => {
  return i18n.translate(
    'xpack.securitySolution.siemMigrations.dashboards.panel.error.description',
    {
      defaultMessage:
        'Migration of {totaldashboards} dashboards failed. Please correct the below error and try again.',
      values: { totaldashboards },
    }
  );
};

export const DASHBOARD_MIGRATION_STOPPED_DESCRIPTION = (totaldashboards: number) => {
  return i18n.translate(
    'xpack.securitySolution.siemMigrations.dashboards.panel.stopped.description',
    {
      defaultMessage:
        'Migration of {totaldashboards} dashboards was stopped, you can resume it any time.',
      values: { totaldashboards },
    }
  );
};

export const DASHBOARD_MIGRATION_READY_MISSING_RESOURCES = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.panel.ready.missingResources',
  { defaultMessage: 'You can also upload the missing macros & lookups for more accurate results.' }
);

export const DASHBOARD_MIGRATION_UPLOAD_MISSING_RESOURCES_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.panel.uploadMissingResources',
  { defaultMessage: 'Upload missing macros and lookup lists.' }
);

export const DASHBOARD_MIGRATION_UPLOAD_MISSING_RESOURCES_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.panel.uploadMissingResourcesDescription',
  {
    defaultMessage: 'Click Upload to continue translating dashboards',
  }
);

export const DASHBOARD_MIGRATION_UPLOAD_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.panel.uploadMacros.button',
  { defaultMessage: 'Upload' }
);

export const DASHBOARD_MIGRATION_COMPLETE_DESCRIPTION = (createdAt: string, finishedAt: string) =>
  i18n.translate('xpack.securitySolution.siemMigrations.dashboards.panel.result.description', {
    defaultMessage: 'Export uploaded on {createdAt} and translation finished {finishedAt}.',
    values: { createdAt, finishedAt },
  });

export const DASHBOARD_MIGRATION_COMPLETE_BADGE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.panel.result.badge',
  { defaultMessage: `Translation complete` }
);
export const DASHBOARD_MIGRATION_SUMMARY_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.panel.result.summary.title',
  { defaultMessage: 'Translation Summary' }
);

export const DASHBOARD_MIGRATION_SUMMARY_CHART_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.panel.result.summary.chartTitle',
  { defaultMessage: 'Dashboards by translation status' }
);

export const DASHBOARD_MIGRATION_VIEW_TRANSLATED_DASHBOARDS_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.panel.result.summary.button',
  { defaultMessage: 'View dashboards' }
);

export const DASHBOARD_MIGRATION_TRANSLATION_FAILED = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.panel.result.summary.failed',
  { defaultMessage: 'Failed' }
);

export const DASHBOARD_MIGRATION_TABLE_COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.panel.result.summary.tableColumn.status',
  { defaultMessage: 'Status' }
);
export const DASHBOARD_MIGRATION_TABLE_COLUMN_DASHBOARDS = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.panel.result.summary.tableColumn.dashboards',
  { defaultMessage: 'Dashboards' }
);

export const DASHBOARD_MIGRATION_EXPAND = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.panel.expand',
  { defaultMessage: 'Expand dashboard migration' }
);
export const DASHBOARD_MIGRATION_COLLAPSE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.panel.collapse',
  { defaultMessage: 'Collapse dashboard migration' }
);
