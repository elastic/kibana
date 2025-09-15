/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DASHBOARD_MIGRATION_UPLOAD_MISSING_RESOURCES_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.panel.uploadMissingResources',
  { defaultMessage: 'Upload missing macros and lookup lists.' }
);

export const DASHBOARD_MIGRATION_UPLOAD_MISSING_RESOURCES_DESCRIPTION = (
  partialDashboardsCount: number
) =>
  i18n.translate(
    'xpack.securitySolution.siemMigrations.dashboards.panel.uploadMissingResourcesDescription',
    {
      defaultMessage: 'Click Upload to continue translating {partialDashboardsCount} dashboards',
      values: { partialDashboardsCount },
    }
  );

export const DASHBOARD_MIGRATION_UPLOAD_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.panel.uploadMacros.button',
  { defaultMessage: 'Upload' }
);
